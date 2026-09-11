import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  Building,
  ShieldAlert,
  PlusCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  Navigation,
  Compass,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { ATMNode, ATM_REGISTRY, TELANGANA_REGIONS } from '../data/atmRegistry';
import { AuditTransaction, BlockchainBlock } from '../types';

interface TelanganaGISMapProps {
  latestBlocks: BlockchainBlock[];
  selectedAtmId?: string;
  onSelectAtm: (atm: ATMNode) => void;
  onEnterNewCase: (atm?: ATMNode, coords?: { lat: number; lng: number }) => void;
  onExportReport?: (atm: ATMNode) => void;
}

export const TelanganaGISMap: React.FC<TelanganaGISMapProps> = ({
  latestBlocks,
  selectedAtmId,
  onSelectAtm,
  onEnterNewCase,
  onExportReport,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const txMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Filter and view states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All Telangana');
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [threatFilter, setThreatFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [mapTheme, setMapTheme] = useState<'DARK' | 'STREET'>('DARK');
  const [showInterceptRadii, setShowInterceptRadii] = useState<boolean>(true);
  const [showActiveTransactions, setShowActiveTransactions] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeHoverAtm, setActiveHoverAtm] = useState<ATMNode | null>(null);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Flatten transactions from latest blocks
  const allTransactions = useMemo<AuditTransaction[]>(() => {
    return latestBlocks.flatMap((b) => b.transactions);
  }, [latestBlocks]);

  // Filtered ATMs
  const filteredAtms = useMemo(() => {
    return ATM_REGISTRY.filter((atm) => {
      // Region filter
      if (selectedRegion !== 'All Telangana' && atm.region !== selectedRegion) {
        return false;
      }
      // Bank filter
      if (selectedBank !== 'ALL' && atm.bank !== selectedBank) {
        return false;
      }
      // Threat filter
      if (threatFilter === 'CRITICAL' && atm.threatProb < 75) {
        return false;
      }
      if (threatFilter === 'HIGH' && atm.threatProb < 50) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          atm.name.toLowerCase().includes(q) ||
          atm.id.toLowerCase().includes(q) ||
          atm.city.toLowerCase().includes(q) ||
          atm.district.toLowerCase().includes(q) ||
          atm.address.toLowerCase().includes(q) ||
          atm.bank.toLowerCase().includes(q) ||
          atm.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedRegion, selectedBank, threatFilter, searchQuery]);

  // Unique banks for filter pills
  const availableBanks = useMemo(() => {
    const banks = Array.from(new Set(ATM_REGISTRY.map((a) => a.bank)));
    return ['ALL', ...banks.sort()];
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Leaflet Map centered on Telangana (17.84, 79.10)
    const map = L.map(mapContainerRef.current, {
      center: [17.55, 78.65],
      zoom: 8,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false,
    });

    // Add Zoom control at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Dark Matter tile layer (Default)
    const darkTileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    );

    // Street tile layer
    const streetTileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    );

    if (mapTheme === 'DARK') {
      darkTileLayer.addTo(map);
    } else {
      streetTileLayer.addTo(map);
    }

    // Layer groups for markers, zones, and txs
    const zonesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    const txGroup = L.layerGroup().addTo(map);

    zonesLayerRef.current = zonesGroup;
    markersLayerRef.current = markersGroup;
    txMarkersLayerRef.current = txGroup;

    // Map click handler to record custom location
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Math.round(e.latlng.lat * 10000) / 10000;
      const lng = Math.round(e.latlng.lng * 10000) / 10000;
      setClickedCoords({ lat, lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer on Theme Toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl =
      mapTheme === 'DARK'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      attribution:
        mapTheme === 'DARK'
          ? '&copy; CARTO &copy; OpenStreetMap'
          : '&copy; OpenStreetMap contributors',
      subdomains: mapTheme === 'DARK' ? 'abcd' : 'abc',
      maxZoom: 19,
    }).addTo(map);
  }, [mapTheme]);

  // Render ATM Markers & 5km Radii
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const zonesGroup = zonesLayerRef.current;
    if (!map || !markersGroup || !zonesGroup) return;

    markersGroup.clearLayers();
    zonesGroup.clearLayers();

    filteredAtms.forEach((atm) => {
      const isSelected = selectedAtmId === atm.id;
      const isCritical = atm.threatProb >= 75;
      const isHigh = atm.threatProb >= 50 && atm.threatProb < 75;

      // Outer color border
      const ringColor = isCritical
        ? '#ef4444'
        : isHigh
        ? '#f59e0b'
        : atm.threatProb >= 30
        ? '#3b82f6'
        : '#10b981';

      const pulseHtml = isCritical
        ? `<div class="absolute -inset-2 rounded-full bg-red-500/30 animate-ping pointer-events-none"></div>`
        : '';

      const markerHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer">
          ${pulseHtml}
          <div style="background: ${
            isSelected ? '#2563eb' : '#0f172a'
          }; border: 2px solid ${ringColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.6);"
               class="flex items-center justify-center h-8 w-8 rounded-full text-white transition-transform transform hover:scale-125">
            <span style="font-size: 10px; font-weight: 800; letter-spacing: -0.5px; font-family: monospace;">
              ${atm.bank}
            </span>
          </div>
          <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(51, 65, 85, 0.8);"
               class="mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-200 whitespace-nowrap shadow">
            ${atm.threatProb}%
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-atm-marker',
        html: markerHtml,
        iconSize: [32, 44],
        iconAnchor: [16, 22],
      });

      const marker = L.marker([atm.lat, atm.lng], { icon: customIcon });

      // Build rich Popup HTML
      const popupContent = document.createElement('div');
      popupContent.className = 'atm-leaflet-popup p-1 text-slate-900 dark:text-slate-100 font-sans';
      popupContent.innerHTML = `
        <div style="min-width: 240px; font-family: system-ui, -apple-system, sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px;">
            <div>
              <span style="font-size: 13px; font-weight: 700; color: #f8fafc;">${atm.name}</span>
              <div style="font-size: 10px; font-family: monospace; color: #38bdf8;">${atm.id} (${atm.bank})</div>
            </div>
            <span style="background: ${
              isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'
            }; color: ${
              isCritical ? '#f87171' : '#fbbf24'
            }; border: 1px solid ${
              isCritical ? '#ef4444' : '#f59e0b'
            }; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
              ${atm.status} (${atm.threatProb}%)
            </span>
          </div>
          
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px; line-height: 1.4;">
            <div><strong>Location:</strong> ${atm.address}</div>
            <div><strong>District / Sector:</strong> ${atm.district} (${atm.sector})</div>
            <div><strong>GPS:</strong> ${atm.lat.toFixed(4)}°N, ${atm.lng.toFixed(4)}°E</div>
            <div><strong>CCTV Status:</strong> ${atm.cctvOperational ? '🟢 24/7 Active' : '🔴 Offline / Warning'}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 8px;">
            <button id="btn-select-atm-${atm.id}" style="background: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; padding: 5px 6px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; text-align: center;">
              🎯 Target Node
            </button>
            <button id="btn-case-atm-${atm.id}" style="background: #2563eb; color: #ffffff; border: 1px solid #3b82f6; padding: 5px 6px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; text-align: center;">
              🚨 New Case
            </button>
          </div>
          <button id="btn-report-atm-${atm.id}" style="width: 100%; margin-top: 4px; background: #0f766e; color: #ccfbf1; border: 1px solid #14b8a6; padding: 4px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center; gap: 4px;">
            📄 Export Cluster PDF Dossier
          </button>
        </div>
      `;

      // Attach click listeners after popup open
      marker.on('popupopen', () => {
        const selectBtn = document.getElementById(`btn-select-atm-${atm.id}`);
        const caseBtn = document.getElementById(`btn-case-atm-${atm.id}`);
        const reportBtn = document.getElementById(`btn-report-atm-${atm.id}`);

        if (selectBtn) {
          selectBtn.onclick = () => {
            onSelectAtm(atm);
            marker.closePopup();
          };
        }
        if (caseBtn) {
          caseBtn.onclick = () => {
            onEnterNewCase(atm);
            marker.closePopup();
          };
        }
        if (reportBtn && onExportReport) {
          reportBtn.onclick = () => {
            onExportReport(atm);
            marker.closePopup();
          };
        }
      });

      marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'custom-tactical-popup',
      });

      marker.on('mouseover', () => setActiveHoverAtm(atm));
      marker.on('mouseout', () => setActiveHoverAtm(null));

      markersGroup.addLayer(marker);

      // Render 5km tactical intercept radius circle for high/critical nodes
      if (showInterceptRadii && (isCritical || isHigh)) {
        const circle = L.circle([atm.lat, atm.lng], {
          radius: 5000, // 5km
          color: isCritical ? '#ef4444' : '#f59e0b',
          weight: 1,
          dashArray: '4, 8',
          fillColor: isCritical ? '#ef4444' : '#f59e0b',
          fillOpacity: isCritical ? 0.08 : 0.04,
        });
        zonesGroup.addLayer(circle);
      }
    });
  }, [filteredAtms, selectedAtmId, showInterceptRadii, onSelectAtm, onEnterNewCase]);

  // Render Blockchain Transaction Incident Markers
  useEffect(() => {
    const txGroup = txMarkersLayerRef.current;
    if (!txGroup) return;

    txGroup.clearLayers();

    if (!showActiveTransactions) return;

    allTransactions.forEach((tx) => {
      const lat = tx.atmCoordinates?.lat || 17.4401;
      const lng = tx.atmCoordinates?.lng || 78.3489;

      const txIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute -inset-1.5 rounded-full bg-cyan-400/40 animate-ping pointer-events-none"></div>
          <div class="h-5 w-5 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center text-[9px] font-black text-slate-950 shadow-lg">
            ₹
          </div>
        </div>
      `;

      const txIcon = L.divIcon({
        className: 'custom-tx-marker',
        html: txIconHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const txMarker = L.marker([lat, lng], { icon: txIcon });

      const popupHtml = `
        <div style="min-width: 220px; font-family: system-ui, sans-serif; color: #f8fafc;">
          <div style="font-size: 11px; font-weight: 700; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 4px;">
            BLOCKCHAIN AUDITED INCIDENT
          </div>
          <div style="font-size: 11px; line-height: 1.4;">
            <div><strong>Tx ID:</strong> ${tx.txId}</div>
            <div><strong>Complaint:</strong> ${tx.complaintId}</div>
            <div><strong>Disputed Amount:</strong> ₹${tx.amount.toLocaleString()}</div>
            <div><strong>Gateway:</strong> ${tx.paymentMode}</div>
            <div><strong>Threat Score:</strong> <span style="color: #f87171; font-weight: bold;">${tx.threatScore}%</span></div>
            <div><strong>Node:</strong> ${tx.atmCoordinates?.branch || tx.atmId}</div>
          </div>
        </div>
      `;

      txMarker.bindPopup(popupHtml);
      txGroup.addLayer(txMarker);
    });
  }, [allTransactions, showActiveTransactions]);

  // Preset Region Zoom Navigation
  const handleZoomPreset = (type: 'HYDERABAD' | 'WARANGAL' | 'NORTH_TS' | 'SOUTH_TS' | 'STATE') => {
    const map = mapInstanceRef.current;
    if (!map) return;

    switch (type) {
      case 'HYDERABAD':
        map.flyTo([17.44, 78.43], 12, { duration: 1.2 });
        setSelectedRegion('All Telangana');
        break;
      case 'WARANGAL':
        map.flyTo([17.99, 79.56], 12, { duration: 1.2 });
        setSelectedRegion('East Telangana');
        break;
      case 'NORTH_TS':
        map.flyTo([18.65, 78.85], 9, { duration: 1.2 });
        setSelectedRegion('North Telangana');
        break;
      case 'SOUTH_TS':
        map.flyTo([17.0, 78.6], 9, { duration: 1.2 });
        setSelectedRegion('South Telangana');
        break;
      case 'STATE':
      default:
        map.flyTo([17.8, 79.1], 7.5, { duration: 1.2 });
        setSelectedRegion('All Telangana');
        break;
    }
  };

  return (
    <div
      className={`relative rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col bg-slate-950' : 'w-full'
      }`}
    >
      {/* Header Controls Bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Compass className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  Telangana & Hyderabad Real-World GIS Map
                </h3>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20">
                  {filteredAtms.length} / {ATM_REGISTRY.length} Nodes Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Complete ATM cash-out network across Hyderabad & 16 Telangana districts
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Enter New Case Button (Requested by User) */}
            <button
              type="button"
              onClick={() => onEnterNewCase()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Enter New Case</span>
            </button>

            {/* Dark / Street Map Toggle */}
            <button
              type="button"
              onClick={() => setMapTheme(mapTheme === 'DARK' ? 'STREET' : 'DARK')}
              className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition"
              title="Toggle Tile Style"
            >
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>{mapTheme === 'DARK' ? 'Dark Tactical' : 'Street Tiles'}</span>
            </button>

            {/* Intercept Radii Toggle */}
            <button
              type="button"
              onClick={() => setShowInterceptRadii(!showInterceptRadii)}
              className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition ${
                showInterceptRadii
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400'
              }`}
              title="Toggle 5km Patrol Intercept Radii"
            >
              <Radio className="h-3 w-3" />
              <span className="hidden sm:inline">5km Zones</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsFullscreen(!isFullscreen);
                setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
              }}
              className="rounded border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Secondary Filter & Search Toolbar */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          {/* Search box */}
          <div className="sm:col-span-4 relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ATM ID, branch, district, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Region selector */}
          <div className="sm:col-span-3">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              {TELANGANA_REGIONS.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Bank selector */}
          <div className="sm:col-span-2">
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
            >
              {availableBanks.map((b) => (
                <option key={b} value={b}>
                  {b === 'ALL' ? 'All Banks' : b}
                </option>
              ))}
            </select>
          </div>

          {/* Threat Filter */}
          <div className="sm:col-span-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setThreatFilter('ALL')}
              className={`flex-1 rounded px-2 py-1.5 text-[11px] font-semibold transition ${
                threatFilter === 'ALL'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setThreatFilter('HIGH')}
              className={`flex-1 rounded px-2 py-1.5 text-[11px] font-semibold transition ${
                threatFilter === 'HIGH'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-900 text-amber-400 hover:text-amber-200'
              }`}
            >
              High (50%+)
            </button>
            <button
              type="button"
              onClick={() => setThreatFilter('CRITICAL')}
              className={`flex-1 rounded px-2 py-1.5 text-[11px] font-semibold transition ${
                threatFilter === 'CRITICAL'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-900 text-rose-400 hover:text-rose-200'
              }`}
            >
              Critical
            </button>
          </div>
        </div>

        {/* Quick Zoom Presets Bar */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap">
            Tactical Sectors:
          </span>
          <button
            type="button"
            onClick={() => handleZoomPreset('HYDERABAD')}
            className="rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 whitespace-nowrap border border-slate-700"
          >
            🏙️ Hyderabad Metro / Cyberabad
          </button>
          <button
            type="button"
            onClick={() => handleZoomPreset('WARANGAL')}
            className="rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 whitespace-nowrap border border-slate-700"
          >
            🏛️ Warangal Urban Cluster
          </button>
          <button
            type="button"
            onClick={() => handleZoomPreset('NORTH_TS')}
            className="rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 whitespace-nowrap border border-slate-700"
          >
            🌾 North Telangana (Karimnagar/Nizamabad)
          </button>
          <button
            type="button"
            onClick={() => handleZoomPreset('SOUTH_TS')}
            className="rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 whitespace-nowrap border border-slate-700"
          >
            🛣️ South Telangana (Mahbubnagar/Nalgonda)
          </button>
          <button
            type="button"
            onClick={() => handleZoomPreset('STATE')}
            className="rounded bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 whitespace-nowrap border border-slate-700"
          >
            🗺️ Entire Telangana State
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className={`relative w-full ${isFullscreen ? 'flex-1 h-full' : 'h-[420px] sm:h-[480px]'}`}>
        <div ref={mapContainerRef} className="h-full w-full bg-[#0b0f19]" />

        {/* Legend in corner */}
        <div className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-slate-900/90 p-2.5 border border-slate-800 backdrop-blur text-[11px] font-mono shadow-xl hidden sm:block">
          <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-blue-400" />
            <span>ATM Threat Legend</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-rose-300">Critical (&gt;75%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-amber-300">High Risk (50-74%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-blue-300">Medium (30-49%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-300">Low (&lt;30%)</span>
            </div>
          </div>
        </div>

        {/* Click on Map notification bubble */}
        {clickedCoords && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto z-[1000] rounded-lg bg-slate-900/95 p-3 border border-blue-500/40 backdrop-blur text-xs shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <span>GPS Coordinate Selected:</span>
                </div>
                <div className="text-[11px] font-mono text-cyan-300 mt-0.5">
                  Lat: {clickedCoords.lat}°N, Lng: {clickedCoords.lng}°E
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Click below to log an emergency cyber fraud incident at this location.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClickedCoords(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onEnterNewCase(undefined, clickedCoords);
                  setClickedCoords(null);
                }}
                className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition"
              >
                🚨 Log New Case at this Pin
              </button>
              <button
                type="button"
                onClick={() => setClickedCoords(null)}
                className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Live Hover Inspector Bar */}
        {activeHoverAtm && (
          <div className="absolute top-3 right-3 z-[1000] rounded-lg bg-slate-900/95 p-2.5 border border-slate-700 backdrop-blur text-xs shadow-2xl hidden md:block max-w-xs">
            <div className="font-bold text-white">{activeHoverAtm.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">
              {activeHoverAtm.id} | {activeHoverAtm.bank} | {activeHoverAtm.district}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Threat Score:</span>
              <span
                className={`font-bold font-mono ${
                  activeHoverAtm.threatProb >= 75
                    ? 'text-rose-400'
                    : activeHoverAtm.threatProb >= 50
                    ? 'text-amber-400'
                    : 'text-blue-400'
                }`}
              >
                {activeHoverAtm.threatProb}% ({activeHoverAtm.status})
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
