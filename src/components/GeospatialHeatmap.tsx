import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Flame,
  Layers,
  MapPin,
  Compass,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Building,
  ShieldAlert,
  Radio,
  ExternalLink,
  ChevronRight,
  Crosshair,
  Filter,
  DollarSign,
  Activity,
  CheckCircle2,
  Copy,
  FileText,
  Download,
} from 'lucide-react';
import { AuditTransaction, BlockchainBlock, UserProfile } from '../types';
import { ATM_REGISTRY, ATMNode } from '../data/atmRegistry';
import { downloadClusterIncidentPdf } from '../lib/pdfReportGenerator';

export interface HotspotCluster {
  id: string;
  name: string;
  sector: string;
  centroidLat: number;
  centroidLng: number;
  txCount: number;
  totalAmount: number;
  peakThreatScore: number;
  avgThreatScore: number;
  dominantMode: string;
  riskTier: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MODERATE';
  transactions: AuditTransaction[];
  linkedAtmIds: string[];
  blockIndices: number[];
  lastActivityTime: string;
}

/**
 * Cluster Aggregation Engine: Group transactions by proximity and ATM correlation
 */
export function computeHotspotClusters(
  latestBlocks: BlockchainBlock[],
  atmRegistry: ATMNode[] = ATM_REGISTRY
): HotspotCluster[] {
  const clusterMap: Record<string, HotspotCluster> = {};

  // First assign based on ATM / sector nodes
  atmRegistry.forEach((atm) => {
    const initialTier: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MODERATE' =
      atm.status === 'CRITICAL'
        ? 'CRITICAL'
        : atm.status === 'HIGH'
        ? 'HIGH'
        : atm.status === 'MEDIUM'
        ? 'ELEVATED'
        : 'MODERATE';

    clusterMap[atm.id] = {
      id: `CLUSTER-${atm.id}`,
      name: `${atm.name} Cluster`,
      sector: atm.sector,
      centroidLat: atm.lat,
      centroidLng: atm.lng,
      txCount: 0,
      totalAmount: 0,
      peakThreatScore: atm.threatProb,
      avgThreatScore: atm.threatProb,
      dominantMode: 'UPI',
      riskTier: initialTier,
      transactions: [],
      linkedAtmIds: [atm.id],
      blockIndices: [],
      lastActivityTime: 'Baseline Monitoring',
    };
  });

  // Gather all audited transactions
  const auditedTransactions: (AuditTransaction & { blockIndex: number })[] = [];
  latestBlocks.forEach((block) => {
    block.transactions.forEach((tx) => {
      auditedTransactions.push({ ...tx, blockIndex: block.index });
    });
  });

  // Populate with active blockchain transactions
  auditedTransactions.forEach((tx) => {
    const lat = tx.atmCoordinates?.lat || 17.6012;
    const lng = tx.atmCoordinates?.lng || 78.4862;

    // Find nearest cluster within threshold
    let nearestClusterId = tx.atmId;
    if (!clusterMap[nearestClusterId]) {
      let minDist = Infinity;
      Object.values(clusterMap).forEach((c) => {
        const d = Math.hypot(c.centroidLat - lat, c.centroidLng - lng);
        if (d < minDist) {
          minDist = d;
          nearestClusterId = c.linkedAtmIds[0];
        }
      });
    }

    const cluster = clusterMap[nearestClusterId];
    if (cluster) {
      cluster.transactions.push(tx);
      cluster.txCount += 1;
      cluster.totalAmount += tx.amount;
      cluster.peakThreatScore = Math.max(cluster.peakThreatScore, tx.threatScore);
      cluster.blockIndices = Array.from(new Set([...cluster.blockIndices, tx.blockIndex]));
      cluster.lastActivityTime = tx.timestamp;

      // Recalculate average threat score
      const totalScore = cluster.transactions.reduce((acc, t) => acc + t.threatScore, 0);
      cluster.avgThreatScore = Math.round((totalScore / cluster.transactions.length) * 10) / 10;

      // Determine dominant payment mode
      const modeCounts: Record<string, number> = {};
      cluster.transactions.forEach((t) => {
        modeCounts[t.paymentMode] = (modeCounts[t.paymentMode] || 0) + 1;
      });
      cluster.dominantMode =
        Object.keys(modeCounts).sort((a, b) => modeCounts[b] - modeCounts[a])[0] || 'UPI';

      // Update risk tier
      if (cluster.peakThreatScore >= 75) cluster.riskTier = 'CRITICAL';
      else if (cluster.peakThreatScore >= 50) cluster.riskTier = 'HIGH';
      else if (cluster.peakThreatScore >= 30) cluster.riskTier = 'ELEVATED';
      else cluster.riskTier = 'MODERATE';
    }
  });

  return Object.values(clusterMap).sort((a, b) => b.peakThreatScore - a.peakThreatScore);
}

interface GeospatialHeatmapProps {
  latestBlocks: BlockchainBlock[];
  selectedAtmId?: string;
  onSelectAtm?: (atm: ATMNode) => void;
  onDirectDispatch?: (cluster: HotspotCluster) => void;
  onGenerateReport?: (cluster: HotspotCluster) => void;
  currentUser?: UserProfile;
}

type HeatMetricMode = 'THREAT_WEIGHT' | 'AMOUNT_WEIGHT' | 'DENSITY_COUNT';
type DisplayMode = 'COMPOSITE' | 'PURE_HEATMAP' | 'TACTICAL_CLUSTERS';

export const GeospatialHeatmap: React.FC<GeospatialHeatmapProps> = ({
  latestBlocks,
  selectedAtmId,
  onSelectAtm,
  onDirectDispatch,
  onGenerateReport,
  currentUser,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Heatmap customization states
  const [metricMode, setMetricMode] = useState<HeatMetricMode>('THREAT_WEIGHT');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('COMPOSITE');
  const [heatRadius, setHeatRadius] = useState<number>(45);
  const [heatIntensity, setHeatIntensity] = useState<number>(0.85);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<HotspotCluster | null>(null);
  const [hoveredAtm, setHoveredAtm] = useState<ATMNode | null>(null);
  const [mouseCoord, setMouseCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [dispatchAlertMsg, setDispatchAlertMsg] = useState<string>('');
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Pan and zoom states
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Gather all audited transactions across all active blockchain blocks
  const auditedTransactions: (AuditTransaction & { blockIndex: number })[] = useMemo(() => {
    const list: (AuditTransaction & { blockIndex: number })[] = [];
    latestBlocks.forEach((block) => {
      block.transactions.forEach((tx) => {
        list.push({ ...tx, blockIndex: block.index });
      });
    });
    return list;
  }, [latestBlocks]);

  // 2. Compute Hotspot Clusters across active blockchain blocks
  const clusters = useMemo(() => computeHotspotClusters(latestBlocks), [latestBlocks]);

  // 2. Geospatial bounds for Hyderabad / Telangana Sector (with padding)
  // Center roughly at 17.6050, 78.4860
  const BASE_BOUNDS = useMemo(
    () => ({
      minLat: 17.5850,
      maxLat: 17.6250,
      minLng: 78.4650,
      maxLng: 78.5050,
    }),
    []
  );

  // Selected cluster reference
  const selectedCluster = useMemo(() => {
    if (!selectedClusterId) return null;
    return clusters.find((c) => c.id === selectedClusterId) || null;
  }, [selectedClusterId, clusters]);

  // Transform Geo Coordinates (lat, lng) to Canvas Pixels (x, y)
  const projectGeoToPixel = useCallback(
    (lat: number, lng: number, width: number, height: number) => {
      const latRange = BASE_BOUNDS.maxLat - BASE_BOUNDS.minLat;
      const lngRange = BASE_BOUNDS.maxLng - BASE_BOUNDS.minLng;

      // Normalization: (0 to 1)
      // Longitude: Left to Right
      // Latitude: Top is maxLat, Bottom is minLat
      const normX = (lng - BASE_BOUNDS.minLng) / lngRange;
      const normY = (BASE_BOUNDS.maxLat - lat) / latRange;

      // Apply base padding (10%) and pan/zoom transformations
      const padX = width * 0.08;
      const padY = height * 0.08;
      const drawWidth = width - padX * 2;
      const drawHeight = height - padY * 2;

      const baseX = padX + normX * drawWidth;
      const baseY = padY + normY * drawHeight;

      // Centered zoom & pan
      const centerX = width / 2;
      const centerY = height / 2;

      const finalX = centerX + (baseX - centerX) * zoom + panOffset.x;
      const finalY = centerY + (baseY - centerY) * zoom + panOffset.y;

      return { x: finalX, y: finalY };
    },
    [BASE_BOUNDS, zoom, panOffset]
  );

  // Reverse project Canvas Pixels (x, y) to Geo Coordinates (lat, lng)
  const projectPixelToGeo = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const padX = width * 0.08;
      const padY = height * 0.08;
      const drawWidth = width - padX * 2;
      const drawHeight = height - padY * 2;

      const centerX = width / 2;
      const centerY = height / 2;

      const unzoomedX = (x - panOffset.x - centerX) / zoom + centerX;
      const unzoomedY = (y - panOffset.y - centerY) / zoom + centerY;

      const normX = (unzoomedX - padX) / drawWidth;
      const normY = (unzoomedY - padY) / drawHeight;

      const latRange = BASE_BOUNDS.maxLat - BASE_BOUNDS.minLat;
      const lngRange = BASE_BOUNDS.maxLng - BASE_BOUNDS.minLng;

      const lng = BASE_BOUNDS.minLng + normX * lngRange;
      const lat = BASE_BOUNDS.maxLat - normY * latRange;

      return { lat, lng };
    },
    [BASE_BOUNDS, zoom, panOffset]
  );

  // Handle Canvas Drawing with RequestAnimationFrame for Smooth Rendering & Pulse
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.save();
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      // 1. Clear background
      ctx.fillStyle = '#070a13';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Military Tactical Grid & Lat/Lon Guides
      ctx.strokeStyle = '#1e293b25';
      ctx.lineWidth = 1;
      const gridStep = 40 * zoom;
      const offsetX = (panOffset.x % gridStep + gridStep) % gridStep;
      const offsetY = (panOffset.y % gridStep + gridStep) % gridStep;

      for (let x = offsetX; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = offsetY; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Tactical Sector Boundary Lines
      ctx.strokeStyle = '#0284c720';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(width * 0.05 + panOffset.x, height * 0.05 + panOffset.y, width * 0.9 * zoom, height * 0.9 * zoom);
      ctx.setLineDash([]);

      // 3. Render Geospatial Heatmap Layer (Additive Blending)
      if (displayMode === 'COMPOSITE' || displayMode === 'PURE_HEATMAP') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Animated pulse wave for critical hotspots
        const pulse = Math.sin(Date.now() / 350) * 0.15 + 0.85;

        // Gather all heat sources: active blockchain transactions + baseline ATM points
        const heatPoints: { x: number; y: number; weight: number; threatScore: number; isTx: boolean }[] = [];

        // Add individual transactions
        auditedTransactions.forEach((tx) => {
          const lat = tx.atmCoordinates?.lat || 17.6012;
          const lng = tx.atmCoordinates?.lng || 78.4862;
          const p = projectGeoToPixel(lat, lng, width, height);

          let weight = 0.5;
          if (metricMode === 'THREAT_WEIGHT') {
            weight = Math.max(0.2, tx.threatScore / 100);
          } else if (metricMode === 'AMOUNT_WEIGHT') {
            weight = Math.min(1.0, Math.log10(Math.max(1000, tx.amount)) / 6);
          } else {
            weight = 0.7; // Density count
          }

          heatPoints.push({
            x: p.x,
            y: p.y,
            weight,
            threatScore: tx.threatScore,
            isTx: true,
          });
        });

        // Add ATM cluster baseline centers if no transactions yet
        ATM_REGISTRY.forEach((atm) => {
          const p = projectGeoToPixel(atm.lat, atm.lng, width, height);
          const hasTx = auditedTransactions.some((t) => t.atmId === atm.id);
          const weight = hasTx ? 0.8 : (atm.threatProb / 100) * 0.4;

          heatPoints.push({
            x: p.x,
            y: p.y,
            weight,
            threatScore: atm.threatProb,
            isTx: hasTx,
          });
        });

        // Draw radial heat splats
        heatPoints.forEach((pt) => {
          const r = heatRadius * zoom * (pt.isTx ? 1.2 : 0.9);
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);

          const intensity = pt.weight * heatIntensity * (pt.threatScore >= 75 ? pulse : 1.0);

          if (pt.threatScore >= 75) {
            // Critical: Intense Violet / Neon Rose / White core
            grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`);
            grad.addColorStop(0.25, `rgba(244, 63, 94, ${0.75 * intensity})`);
            grad.addColorStop(0.55, `rgba(239, 68, 68, ${0.45 * intensity})`);
            grad.addColorStop(0.8, `rgba(249, 115, 22, ${0.2 * intensity})`);
            grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          } else if (pt.threatScore >= 45) {
            // High / Elevated: Amber / Orange
            grad.addColorStop(0, `rgba(254, 240, 138, ${0.85 * intensity})`);
            grad.addColorStop(0.3, `rgba(245, 158, 11, ${0.65 * intensity})`);
            grad.addColorStop(0.65, `rgba(217, 119, 6, ${0.35 * intensity})`);
            grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
          } else {
            // Moderate / Monitored: Emerald / Cyan
            grad.addColorStop(0, `rgba(167, 243, 208, ${0.8 * intensity})`);
            grad.addColorStop(0.35, `rgba(16, 185, 129, ${0.5 * intensity})`);
            grad.addColorStop(0.7, `rgba(6, 182, 212, ${0.25 * intensity})`);
            grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }

      // 4. Render 5km Tactical Intercept Perimeters & Contour Iso-Lines
      if (showContours && (displayMode === 'COMPOSITE' || displayMode === 'TACTICAL_CLUSTERS')) {
        clusters.forEach((c) => {
          const pt = projectGeoToPixel(c.centroidLat, c.centroidLng, width, height);
          const isCritical = c.peakThreatScore >= 75;

          // 5km intercept radius ring (scaled roughly 60px base * zoom)
          const interceptRadius = 55 * zoom;

          ctx.save();
          ctx.strokeStyle = isCritical ? 'rgba(244, 63, 94, 0.45)' : 'rgba(6, 182, 212, 0.25)';
          ctx.lineWidth = isCritical ? 1.5 : 1;
          ctx.setLineDash([6, 6]);

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, interceptRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Inner high-density core contour ring
          ctx.strokeStyle = isCritical ? 'rgba(244, 63, 94, 0.7)' : 'rgba(245, 158, 11, 0.4)';
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, interceptRadius * 0.4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        });
      }

      // 5. Render ATM Node Markers & Tactical HUD Rings
      if (displayMode === 'COMPOSITE' || displayMode === 'TACTICAL_CLUSTERS') {
        ATM_REGISTRY.forEach((atm) => {
          const pt = projectGeoToPixel(atm.lat, atm.lng, width, height);
          const isSelected = selectedAtmId === atm.id;
          const isCritical = atm.threatProb >= 75;
          const isHovered = hoveredAtm?.id === atm.id;

          // Outer selection ring
          if (isSelected || isHovered) {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 16 * zoom, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // Node Marker Body
          ctx.save();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = isCritical ? '#e11d48' : atm.threatProb >= 50 ? '#d97706' : '#0284c7';
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Center dot
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();

          // Label above node
          if (showLabels) {
            ctx.save();
            ctx.font = `600 ${Math.max(9, Math.min(12, 10 * zoom))}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            // Background pill for readability
            const labelText = `${atm.id}`;
            const textMetrics = ctx.measureText(labelText);
            const pillW = textMetrics.width + 8;
            const pillH = 14;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.8;
            ctx.fillRect(pt.x - pillW / 2, pt.y - 12 * zoom - pillH, pillW, pillH);
            ctx.strokeRect(pt.x - pillW / 2, pt.y - 12 * zoom - pillH, pillW, pillH);

            ctx.fillStyle = isCritical ? '#fda4af' : '#94a3b8';
            ctx.fillText(labelText, pt.x, pt.y - 12 * zoom - 2);
            ctx.restore();
          }
        });
      }

      ctx.restore();

      // Continue animation loop for pulse
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    auditedTransactions,
    clusters,
    displayMode,
    metricMode,
    heatRadius,
    heatIntensity,
    showContours,
    showLabels,
    selectedAtmId,
    hoveredAtm,
    zoom,
    panOffset,
    projectGeoToPixel,
  ]);

  // Synchronize Canvas with DOM Size via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Mouse Interactivity: Hover Detection, Pan, Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Update real-time geo-coordinates under crosshair
    const geo = projectPixelToGeo(clientX, clientY, rect.width, rect.height);
    setMouseCoord(geo);

    // If dragging, update pan offset
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Detect hovered ATM node
    let foundAtm: ATMNode | null = null;
    let foundCluster: HotspotCluster | null = null;

    ATM_REGISTRY.forEach((atm) => {
      const p = projectGeoToPixel(atm.lat, atm.lng, rect.width, rect.height);
      const dist = Math.hypot(p.x - clientX, p.y - clientY);
      if (dist < 18 * zoom) {
        foundAtm = atm;
      }
    });

    clusters.forEach((c) => {
      const p = projectGeoToPixel(c.centroidLat, c.centroidLng, rect.width, rect.height);
      const dist = Math.hypot(p.x - clientX, p.y - clientY);
      if (dist < 35 * zoom) {
        foundCluster = c;
      }
    });

    setHoveredAtm(foundAtm);
    setHoveredCluster(foundCluster);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredAtm) {
      onSelectAtm?.(hoveredAtm);
      const matchedCluster = clusters.find((c) => c.linkedAtmIds.includes(hoveredAtm.id));
      if (matchedCluster) {
        setSelectedClusterId(matchedCluster.id);
      }
    } else if (hoveredCluster) {
      setSelectedClusterId(hoveredCluster.id);
      const atm = ATM_REGISTRY.find((a) => a.id === hoveredCluster.linkedAtmIds[0]);
      if (atm) onSelectAtm?.(atm);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(3.5, Math.max(0.65, prev * zoomDelta)));
  };

  const resetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedClusterId(null);
  };

  const focusCluster = (cluster: HotspotCluster) => {
    setSelectedClusterId(cluster.id);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Center on this cluster
    const padX = rect.width * 0.08;
    const padY = rect.height * 0.08;
    const drawWidth = rect.width - padX * 2;
    const drawHeight = rect.height - padY * 2;

    const normX = (cluster.centroidLng - BASE_BOUNDS.minLng) / (BASE_BOUNDS.maxLng - BASE_BOUNDS.minLng);
    const normY = (BASE_BOUNDS.maxLat - cluster.centroidLat) / (BASE_BOUNDS.maxLat - BASE_BOUNDS.minLat);

    const targetX = padX + normX * drawWidth;
    const targetY = padY + normY * drawHeight;

    const targetZoom = 1.8;
    setZoom(targetZoom);
    setPanOffset({
      x: rect.width / 2 - targetX * targetZoom,
      y: rect.height / 2 - targetY * targetZoom,
    });
  };

  const handleDispatchIntercept = (cluster: HotspotCluster) => {
    onDirectDispatch?.(cluster);
    setDispatchAlertMsg(
      `🚨 Tactical Intercept Dispatched to ${cluster.name}! Alert relayed to Cyber Patrol Unit & Bank Switch.`
    );
    setTimeout(() => setDispatchAlertMsg(''), 5000);
  };

  const handleCopyCoords = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Metrics summary
  const totalFinancialExposure = useMemo(() => {
    return auditedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [auditedTransactions]);

  const criticalClustersCount = useMemo(() => {
    return clusters.filter((c) => c.riskTier === 'CRITICAL').length;
  }, [clusters]);

  return (
    <div className="space-y-4">
      {/* Top Banner: GIS Intelligence Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 backdrop-blur shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-500 animate-pulse" />
            <h3 className="text-base font-bold text-white">
              Real-Time Cybercrime Cluster Heatmap
            </h3>
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 border border-rose-500/40">
              LIVE BLOCKCHAIN SYNC
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Cryptographic density mapping powered by SHA-256 Merkle leaves, ATM cash-out nodes, and real-time fraud weights.
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">Active Blocks</span>
            <span className="font-bold text-blue-400">{latestBlocks.length} Blocks</span>
          </div>
          <div className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">Audited Txns</span>
            <span className="font-bold text-emerald-400">{auditedTransactions.length} Anchored</span>
          </div>
          <div className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">Critical Hubs</span>
            <span className="font-bold text-rose-400">{criticalClustersCount} Hotspots</span>
          </div>
        </div>
      </div>

      {/* Dispatch Confirmation Toast */}
      {dispatchAlertMsg && (
        <div className="rounded-lg bg-rose-500/20 border border-rose-500/50 p-3 text-xs text-rose-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{dispatchAlertMsg}</span>
          </div>
          <CheckCircle2 className="h-4 w-4 text-rose-400 shrink-0" />
        </div>
      )}

      {/* Main Heatmap Container */}
      <div className="relative rounded-xl border border-slate-800 bg-[#070a13] shadow-2xl overflow-hidden">
        {/* Layer Controls & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/70 p-3 text-xs">
          {/* View Modes */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Layer:</span>
            <button
              onClick={() => setDisplayMode('COMPOSITE')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                displayMode === 'COMPOSITE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Composite HUD
            </button>
            <button
              onClick={() => setDisplayMode('PURE_HEATMAP')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                displayMode === 'PURE_HEATMAP'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Pure Heatmap
            </button>
            <button
              onClick={() => setDisplayMode('TACTICAL_CLUSTERS')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                displayMode === 'TACTICAL_CLUSTERS'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Tactical Clusters
            </button>
          </div>

          {/* Metric Weighting */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 mr-1 hidden md:inline">Weight:</span>
            <button
              onClick={() => setMetricMode('THREAT_WEIGHT')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                metricMode === 'THREAT_WEIGHT'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Scale heat intensity by AI calculated Threat Probability"
            >
              Fraud Weight (%)
            </button>
            <button
              onClick={() => setMetricMode('AMOUNT_WEIGHT')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                metricMode === 'AMOUNT_WEIGHT'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Scale heat intensity by Total INR Financial Loss"
            >
              Amount (₹)
            </button>
            <button
              onClick={() => setMetricMode('DENSITY_COUNT')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                metricMode === 'DENSITY_COUNT'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Scale heat intensity by Raw Incident Frequency"
            >
              Frequency
            </button>
          </div>

          {/* Sliders & Toggles */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase text-slate-400 font-mono">Radius</span>
              <input
                type="range"
                min="20"
                max="80"
                value={heatRadius}
                onChange={(e) => setHeatRadius(Number(e.target.value))}
                className="w-16 sm:w-20 accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-400 w-5">{heatRadius}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase text-slate-400 font-mono">Intensity</span>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={heatIntensity}
                onChange={(e) => setHeatIntensity(Number(e.target.value))}
                className="w-16 sm:w-20 accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-400 w-7">
                {Math.round(heatIntensity * 100)}%
              </span>
            </div>

            <button
              onClick={resetView}
              className="rounded bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Reset View"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Heatmap Canvas Stage */}
        <div ref={containerRef} className="relative h-[380px] sm:h-[460px] w-full cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
            className="absolute inset-0 block h-full w-full select-none"
          />

          {/* Compass Rose & HUD Info Badge */}
          <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-1.5 border border-slate-800 backdrop-blur font-mono text-xs">
              <Compass className="h-4 w-4 text-cyan-400 animate-spin-slow" />
              <div>
                <span className="font-bold text-white">TELANGANA CYBER DEFENSE GIS</span>
                <div className="text-[10px] text-slate-400">
                  Sector: Cyberabad / Gachibowli High-Threat Zone
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-900/80 px-2.5 py-1 border border-slate-800 backdrop-blur font-mono text-[10px] text-slate-400">
              <span>Zoom: {zoom.toFixed(2)}x | 5km Perimeter: Armed</span>
            </div>
          </div>

          {/* Mouse Crosshair Coordinates Telemetry */}
          {mouseCoord && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded bg-slate-950/90 px-2.5 py-1 border border-slate-800 font-mono text-[10px] text-cyan-300 backdrop-blur">
              LAT: {mouseCoord.lat.toFixed(4)}°N | LNG: {mouseCoord.lng.toFixed(4)}°E
            </div>
          )}

          {/* Thermal Color Gradient Ramp Legend */}
          <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col items-end gap-1 font-mono text-[10px]">
            <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-1.5 border border-slate-800 backdrop-blur">
              <span className="text-slate-400">Heat Gradient:</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-cyan-400">Trace</span>
                <div className="h-2 w-28 rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 via-amber-400 to-rose-600 shadow-sm" />
                <span className="text-[9px] text-rose-400 font-bold">Critical</span>
              </div>
            </div>
          </div>

          {/* Hover Inspection Tooltip */}
          {(hoveredAtm || hoveredCluster) && (
            <div
              className="pointer-events-none absolute z-30 rounded-lg bg-slate-950/95 p-3 border border-slate-700 shadow-2xl text-xs backdrop-blur font-mono max-w-xs"
              style={{
                top: 14,
                right: 14,
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-white truncate">
                  {hoveredAtm ? hoveredAtm.name : hoveredCluster?.name}
                </span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                    (hoveredAtm?.threatProb || hoveredCluster?.peakThreatScore || 0) >= 75
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {hoveredAtm ? `${hoveredAtm.threatProb}% RISK` : hoveredCluster?.riskTier}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sector:</span>
                  <span className="text-slate-200">
                    {hoveredAtm ? hoveredAtm.sector : hoveredCluster?.sector}
                  </span>
                </div>
                {hoveredCluster && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Audited Incidents:</span>
                      <span className="text-emerald-400 font-bold">
                        {hoveredCluster.transactions.length} Blockchain Txns
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cumulative Loss:</span>
                      <span className="text-amber-400 font-bold">
                        ₹{hoveredCluster.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Anchored In:</span>
                      <span className="text-cyan-400">
                        {hoveredCluster.blockIndices.length > 0
                          ? `Blocks #${hoveredCluster.blockIndices.join(', #')}`
                          : 'Genesis Baseline'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                Click hotspot to inspect anchored cryptographic records
              </div>
            </div>
          )}
        </div>

        {/* Selected Cluster Deep-Dive Drawer / Panel */}
        {selectedCluster && (
          <div className="border-t border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="h-5 w-5 text-cyan-400" />
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    Cluster Analysis: {selectedCluster.name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>
                      GPS: {selectedCluster.centroidLat.toFixed(4)}°N, {selectedCluster.centroidLng.toFixed(4)}°E
                    </span>
                    <button
                      onClick={() => handleCopyCoords(selectedCluster.centroidLat, selectedCluster.centroidLng)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedCoords ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (onGenerateReport) {
                      onGenerateReport(selectedCluster);
                    } else {
                      downloadClusterIncidentPdf({
                        cluster: selectedCluster,
                        currentUser: currentUser || {
                          id: 'USER-ADMIN-01',
                          name: 'Inspector Vikramaditya Rao',
                          email: 'admin@cybercell.gov.in',
                          role: 'admin',
                          agency: 'Cyber Crime Police Command',
                          badgeNumber: 'TS-IPS-8841',
                          clusterNodeId: 'NODE-DEL-01',
                        },
                      });
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm active:scale-95"
                  title="Generate Section 65B certified PDF incident dossier"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Download Incident Report (PDF)</span>
                </button>

                <button
                  onClick={() => handleDispatchIntercept(selectedCluster)}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Dispatch 5km Intercept
                </button>
                <button
                  onClick={() => setSelectedClusterId(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="rounded bg-slate-900 p-2 border border-slate-800">
                <span className="text-slate-400 text-[10px]">Peak Fraud Probability:</span>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    selectedCluster.peakThreatScore >= 75
                      ? 'text-rose-400'
                      : selectedCluster.peakThreatScore >= 50
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {selectedCluster.peakThreatScore}% ({selectedCluster.riskTier})
                </div>
              </div>

              <div className="rounded bg-slate-900 p-2 border border-slate-800">
                <span className="text-slate-400 text-[10px]">Total Drained Exposure:</span>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  ₹{selectedCluster.totalAmount.toLocaleString()}
                </div>
              </div>

              <div className="rounded bg-slate-900 p-2 border border-slate-800">
                <span className="text-slate-400 text-[10px]">Dominant Gateway:</span>
                <div className="text-base font-bold text-cyan-400 mt-0.5">
                  {selectedCluster.dominantMode} Switch
                </div>
              </div>

              <div className="rounded bg-slate-900 p-2 border border-slate-800">
                <span className="text-slate-400 text-[10px]">Blockchain Anchors:</span>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {selectedCluster.blockIndices.length > 0
                    ? `Blocks #${selectedCluster.blockIndices.join(', #')}`
                    : 'Genesis Cluster'}
                </div>
              </div>
            </div>

            {/* List of individual transactions in cluster */}
            {selectedCluster.transactions.length > 0 && (
              <div className="mt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 font-mono">
                  Cryptographically Audited Transactions in Cluster:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedCluster.transactions.map((tx) => (
                    <div
                      key={tx.txId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded bg-slate-900 p-2 border border-slate-800 text-xs font-mono gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300">{tx.txId}</span>
                        <span className="text-slate-400 text-[10px]">({tx.paymentMode})</span>
                        <span className="text-slate-300">₹{tx.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-amber-400 font-bold">Threat: {tx.threatScore}%</span>
                        <span className="text-emerald-400 text-[10px]">
                          Block #{tx.blockIndex}
                        </span>
                        <span className="text-slate-400 text-[10px] truncate max-w-[140px]">
                          Leaf: {tx.merkleLeafHash.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cluster Hotspot Quick-Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {clusters.slice(0, 4).map((c) => {
          const isCritical = c.peakThreatScore >= 75;
          const isSelected = selectedClusterId === c.id;

          return (
            <div
              key={c.id}
              onClick={() => focusCluster(c)}
              className={`rounded-xl p-3.5 border cursor-pointer transition flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/50'
                  : isCritical
                  ? 'border-rose-900/60 bg-rose-950/20 hover:border-rose-600'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">{c.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold font-mono ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {c.peakThreatScore}% RISK
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{c.sector}</div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">
                  {c.transactions.length} Txns (₹{c.totalAmount.toLocaleString()})
                </span>
                <span className="text-cyan-400 flex items-center gap-0.5 hover:underline text-[10px]">
                  Focus <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
