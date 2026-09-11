import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Send,
  MapPin,
  Clock,
  Lock,
  Radio,
  FileCheck2,
  AlertTriangle,
  Building,
  CheckCircle,
  Copy,
  Sparkles,
  Flame,
  Maximize2,
  Minimize2,
  FileText,
  Download,
} from 'lucide-react';
import {
  AuditTransaction,
  BlockchainBlock,
  IncidentInputPayload,
  ThreatAnalysisResponse,
  UserProfile,
} from '../types';
import { ATM_REGISTRY, ATM_MAP, ATMNode } from '../data/atmRegistry';
import { GeospatialHeatmap, HotspotCluster, computeHotspotClusters } from './GeospatialHeatmap';
import { TelanganaGISMap } from './TelanganaGISMap';
import { NewCaseModal } from './NewCaseModal';
import { ClusterReportModal } from './ClusterReportModal';
import { PlusCircle, Compass } from 'lucide-react';

interface CommandGISDashboardProps {
  currentUser: UserProfile;
  latestBlocks: BlockchainBlock[];
  onIncidentAnalyzed: (response: ThreatAnalysisResponse) => void;
  onLogFieldVerdict: (transactionId: string, verdict: string) => void;
}

// Preset attack scenarios for 1-click rapid demonstration
const PRESET_SCENARIOS = [
  {
    title: 'Digital Arrest Scam',
    amount: 500000,
    narrative: 'Victim placed under continuous Skype interrogation for 14 hours by fake CBI nodal officers threatening immediate arrest over illegal FedEx parcel. Forced to liquidate fixed deposit and transfer to verified escrow mule account.',
    source: '1122334455',
    destination: '9988776655@ybl',
    mode: 'UPI' as const,
    location: 'Telangana',
    atm: 'ATM-SBI-0045',
  },
  {
    title: 'SIM-Swap ATM Cash-Out',
    amount: 100000,
    narrative: 'Victim phone went silent at midnight due to unauthorized eSIM clone. Attacker intercepted OTPs and drained savings into multiple instant withdrawal hops near Gachibowli ATM sector.',
    source: '4455667788',
    destination: 'mule8877@sbi',
    mode: 'UPI' as const,
    location: 'Telangana',
    atm: 'ATM-HDFC-0112',
  },
  {
    title: 'Loan App Harassment Extortion',
    amount: 35000,
    narrative: 'Predatory instant loan app extracted contact lists and fabricated morphed images. Demanding immediate transfer to avoid public harassment.',
    source: '5566778899',
    destination: 'paymule332@icici',
    mode: 'IMPS' as const,
    location: 'Telangana',
    atm: 'ATM-ICICI-009',
  },
  {
    title: 'Crypto Mule Fast-Hop',
    amount: 240000,
    narrative: 'Instant layered mule hop routing through PNB Madhapur Tech Cluster node before automated P2P tether swap. Critical velocity detected.',
    source: '7788990011',
    destination: 'cryptomule@axis',
    mode: 'UPI' as const,
    location: 'Telangana',
    atm: 'ATM-PNB-0721',
  },
  {
    title: 'AEPS Biometric Cloned Drain',
    amount: 85000,
    narrative: 'Cloned silicone fingerprint used at mini-ATM terminal in Hitec City core. High volume unauthorized merchant biometric pulls.',
    source: '2233445566',
    destination: 'aepsdrain@kotak',
    mode: 'AEPS' as const,
    location: 'Telangana',
    atm: 'ATM-KOTAK-088',
  },
];

export const CommandGISDashboard: React.FC<CommandGISDashboardProps> = ({
  currentUser,
  latestBlocks,
  onIncidentAnalyzed,
  onLogFieldVerdict,
}) => {
  const [formData, setFormData] = useState<IncidentInputPayload>({
    complaintId: `CYBER-${Date.now().toString().slice(-6)}`,
    victimLocation: 'Telangana',
    rawNarrative: PRESET_SCENARIOS[0].narrative,
    transactionId: `TXN-${Date.now().toString().slice(-6)}`,
    sourceAccount: PRESET_SCENARIOS[0].source,
    destinationAccount: PRESET_SCENARIOS[0].destination,
    amount: PRESET_SCENARIOS[0].amount,
    paymentMode: PRESET_SCENARIOS[0].mode,
    atmId: PRESET_SCENARIOS[0].atm,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<ThreatAnalysisResponse | null>(null);
  const [selectedAtm, setSelectedAtm] = useState<ATMNode>(ATM_REGISTRY[0]);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [selectedVerdictTx, setSelectedVerdictTx] = useState<string>('');
  const [selectedVerdictValue, setSelectedVerdictValue] = useState<string>('SUCCESSFUL_INTERCEPTION');
  const [verdictSuccessMsg, setVerdictSuccessMsg] = useState<string>('');
  const [isHeatmapExpanded, setIsHeatmapExpanded] = useState<boolean>(false);
  const [activeMapView, setActiveMapView] = useState<'GIS_MAP' | 'THERMAL_HEATMAP'>('GIS_MAP');
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false);
  const [modalPreSelectedAtm, setModalPreSelectedAtm] = useState<ATMNode | null>(null);
  const [modalPreSelectedCoords, setModalPreSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Hotspot cybercrime clusters aggregated across ledger blocks
  const allClusters: HotspotCluster[] = useMemo(
    () => computeHotspotClusters(latestBlocks),
    [latestBlocks]
  );

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedReportCluster, setSelectedReportCluster] = useState<HotspotCluster | null>(null);

  const handleOpenReportModal = (cluster?: HotspotCluster, atm?: ATMNode) => {
    if (cluster) {
      setSelectedReportCluster(cluster);
    } else if (atm) {
      const matched =
        allClusters.find(
          (c) =>
            c.linkedAtmIds.includes(atm.id) ||
            c.id.includes(atm.id) ||
            c.sector.toLowerCase() === atm.sector.toLowerCase()
        ) || allClusters[0];
      setSelectedReportCluster(matched);
    } else if (!selectedReportCluster && allClusters.length > 0) {
      setSelectedReportCluster(allClusters[0]);
    }
    setIsReportModalOpen(true);
  };

  const handleOpenNewCase = (atm?: ATMNode, coords?: { lat: number; lng: number }) => {
    setModalPreSelectedAtm(atm || null);
    setModalPreSelectedCoords(coords || null);
    setIsNewCaseModalOpen(true);
  };

  // Collect all transactions from blocks for the verdict dropdown
  const allAuditedTxs: AuditTransaction[] = latestBlocks.flatMap((b) => b.transactions);

  const applyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setFormData({
      complaintId: `CYBER-${Date.now().toString().slice(-6)}`,
      victimLocation: preset.location,
      rawNarrative: preset.narrative,
      transactionId: `TXN-${Date.now().toString().slice(-6)}`,
      sourceAccount: preset.source,
      destinationAccount: preset.destination,
      amount: preset.amount,
      paymentMode: preset.mode,
      atmId: preset.atm,
    });
    const targetNode = ATM_MAP[preset.atm] || ATM_REGISTRY[0];
    setSelectedAtm(targetNode);
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userContext: currentUser,
        }),
      });
      const data: ThreatAnalysisResponse = await res.json();
      if (data.status === 'SUCCESS') {
        setLatestAnalysis(data);
        onIncidentAnalyzed(data);
        // Refresh IDs for next run
        setFormData((prev) => ({
          ...prev,
          complaintId: `CYBER-${Date.now().toString().slice(-6)}`,
          transactionId: `TXN-${Date.now().toString().slice(-6)}`,
        }));
      }
    } catch (err) {
      console.error('Failed to submit incident analysis:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyBrief = () => {
    if (latestAnalysis?.fieldBrief) {
      navigator.clipboard.writeText(latestAnalysis.fieldBrief);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2000);
    }
  };

  const handleVerdictSubmit = () => {
    if (!selectedVerdictTx) return;
    onLogFieldVerdict(selectedVerdictTx, selectedVerdictValue);
    setVerdictSuccessMsg(`Logged verdict '${selectedVerdictValue}' for ${selectedVerdictTx}. Auto-training feedback queued!`);
    setTimeout(() => setVerdictSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Threat Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Audited Txns</span>
            <Building className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {allAuditedTxs.length.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400 font-medium">100% Cryptographic Hash Bound</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Anchored in Immutable Blockchain Blocks</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Byzantine Quorum</span>
            <Lock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">5 / 5</span>
            <span className="text-xs text-emerald-400/90 font-medium">Nodes Agreeing (&gt;66%)</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Proof-of-Authority Decentralized Consensus</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">High-Risk Alert Nodes</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {ATM_REGISTRY.filter((a) => a.threatProb >= 75).length}
            </span>
            <span className="text-xs text-rose-400/90 font-medium">Critical Intercept Required</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Targeting immediate ATM Cash-Out points</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cross-Chain Latency</span>
            <Radio className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">42 ms</span>
            <span className="text-xs text-cyan-400/90 font-medium">State-Channel Optimized</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">NPCI / RBI Interbank Remittance Sync</div>
        </div>
      </div>

      {/* Main Grid: Tactical Map & Ingestion Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Interactive GIS Geospatial Heatmap */}
        <div className={`${isHeatmapExpanded ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4 transition-all duration-300`}>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* View Switcher: Real-World GIS Map vs Thermal Heatmap */}
                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveMapView('GIS_MAP')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition ${
                      activeMapView === 'GIS_MAP'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>🗺️ Telangana & Hyderabad GIS Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMapView('THERMAL_HEATMAP')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition ${
                      activeMapView === 'THERMAL_HEATMAP'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>🔥 Tactical Heatmap</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Generate PDF Incident Report Button */}
                <button
                  type="button"
                  onClick={() => handleOpenReportModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-500 transition active:scale-95"
                  title="Generate Section 65B certified incident report PDF for cybercrime clusters"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Export Cluster Report (PDF)</span>
                </button>

                {/* Enter New Case Button on Dashboard */}
                <button
                  type="button"
                  onClick={() => handleOpenNewCase()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition active:scale-95"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>+ Enter New Case</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsHeatmapExpanded(!isHeatmapExpanded)}
                  className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition"
                  title={isHeatmapExpanded ? 'Contract to Split View' : 'Expand to Full Width'}
                >
                  {isHeatmapExpanded ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Split View</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Expand Map</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Map Renderer based on activeMapView */}
            {activeMapView === 'GIS_MAP' ? (
              <TelanganaGISMap
                latestBlocks={latestBlocks}
                selectedAtmId={selectedAtm.id}
                onSelectAtm={(atm) => {
                  setSelectedAtm(atm);
                  setFormData((prev) => ({ ...prev, atmId: atm.id }));
                }}
                onEnterNewCase={(atm, coords) => handleOpenNewCase(atm, coords)}
                onExportReport={(atm) => handleOpenReportModal(undefined, atm)}
              />
            ) : (
              <GeospatialHeatmap
                latestBlocks={latestBlocks}
                selectedAtmId={selectedAtm.id}
                currentUser={currentUser}
                onSelectAtm={(atm) => {
                  setSelectedAtm(atm);
                  setFormData((prev) => ({ ...prev, atmId: atm.id }));
                }}
                onGenerateReport={(cluster) => handleOpenReportModal(cluster)}
                onDirectDispatch={(cluster) => {
                  const targetTx = cluster.transactions[0];
                  if (targetTx) {
                    setSelectedVerdictTx(targetTx.txId);
                    setVerdictSuccessMsg(
                      `Dispatched tactical alert to ${cluster.name} (${cluster.sector}). Linked to Tx: ${targetTx.txId}`
                    );
                    setTimeout(() => setVerdictSuccessMsg(''), 5000);
                  }
                }}
              />
            )}

            {/* Selected Node Status Footer */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-950/80 p-3 border border-slate-800 text-xs">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-3 w-3 rounded-full ${
                    selectedAtm.threatProb >= 75
                      ? 'bg-rose-500 animate-ping'
                      : selectedAtm.threatProb >= 50
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                />
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>{selectedAtm.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({selectedAtm.id})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Sector: {selectedAtm.sector} | GPS: {selectedAtm.lat}°N, {selectedAtm.lng}°E
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Fraud Score</span>
                  <span
                    className={`font-bold ${
                      selectedAtm.threatProb >= 75
                        ? 'text-rose-400'
                        : selectedAtm.threatProb >= 50
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {selectedAtm.threatProb}% ({selectedAtm.status})
                  </span>
                </div>
              </div>
            </div>

            {/* Field Intercept Verdict Feedback Loop */}
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold text-slate-200">
                    Field Patrol Verdict Registry (Feeds AI Auto-Training)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Closed-Loop Ground Truth</span>
              </div>

              {verdictSuccessMsg && (
                <div className="mt-2 rounded bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {verdictSuccessMsg}
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                    Select Incident Tx
                  </label>
                  <select
                    value={selectedVerdictTx}
                    onChange={(e) => setSelectedVerdictTx(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 text-xs font-mono"
                  >
                    <option value="">-- Choose Transaction --</option>
                    {allAuditedTxs.map((tx) => (
                      <option key={tx.txId} value={tx.txId}>
                        {tx.txId} - ₹{tx.amount.toLocaleString()} ({tx.threatScore}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                    Intercept Outcome
                  </label>
                  <select
                    value={selectedVerdictValue}
                    onChange={(e) => setSelectedVerdictValue(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 text-xs"
                  >
                    <option value="SUCCESSFUL_INTERCEPTION">Successful Interception</option>
                    <option value="FROZEN_BY_BANK">Frozen By Bank Switch</option>
                    <option value="FALSE_POSITIVE">False Positive / Verified Legit</option>
                  </select>
                </div>

                <div className="sm:col-span-3 flex items-end">
                  <button
                    type="button"
                    onClick={handleVerdictSubmit}
                    disabled={!selectedVerdictTx}
                    className="w-full rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 font-semibold text-white text-xs transition"
                  >
                    Submit Verdict
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ingestion & Blockchain Anchor Form */}
        <div className={`${isHeatmapExpanded ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-4`}>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-slate-100 text-sm sm:text-base">
                  Ingest Incident & Anchor to Blockchain
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenNewCase()}
                  className="rounded-lg bg-blue-600/20 border border-blue-500/40 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition flex items-center gap-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open Full Modal</span>
                </button>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-300 border border-emerald-500/20">
                  RBAC Protected
                </span>
              </div>
            </div>

            {/* Quick Preset Selector */}
            <div className="mt-3">
              <span className="text-[11px] text-slate-400 block mb-1.5">Load Forensic Scenario Preset:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SCENARIOS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-blue-500 hover:text-white transition"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAnalyzeSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Complaint ID</label>
                  <input
                    type="text"
                    value={formData.complaintId}
                    onChange={(e) => setFormData({ ...formData, complaintId: e.target.value })}
                    required
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Victim State</label>
                  <input
                    type="text"
                    value={formData.victimLocation}
                    onChange={(e) => setFormData({ ...formData, victimLocation: e.target.value })}
                    required
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300">
                  Victim Unstructured Narrative (Scraped via NLP)
                </label>
                <textarea
                  rows={2}
                  value={formData.rawNarrative}
                  onChange={(e) => setFormData({ ...formData, rawNarrative: e.target.value })}
                  required
                  placeholder="Describe incident narrative..."
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Transaction ID / UTR</label>
                  <input
                    type="text"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    required
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Amount (INR)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    required
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Source Account</label>
                  <input
                    type="text"
                    value={formData.sourceAccount}
                    onChange={(e) => setFormData({ ...formData, sourceAccount: e.target.value })}
                    required
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Mule Dest Account</label>
                  <input
                    type="text"
                    value={formData.destinationAccount}
                    onChange={(e) => setFormData({ ...formData, destinationAccount: e.target.value })}
                    required
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Payment Gateway</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="UPI">UPI Instant</option>
                    <option value="IMPS">IMPS Core</option>
                    <option value="AEPS">AEPS Biometric</option>
                    <option value="WALLET">Wallet Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300">Target Cash-out Node</label>
                  <select
                    value={formData.atmId}
                    onChange={(e) => {
                      const newAtmId = e.target.value;
                      setFormData({ ...formData, atmId: newAtmId });
                      const matched = ATM_MAP[newAtmId];
                      if (matched) setSelectedAtm(matched);
                    }}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                  >
                    {ATM_REGISTRY.map((atm) => (
                      <option key={atm.id} value={atm.id}>
                        {atm.id} - {atm.bank} ({atm.sector})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white text-xs sm:text-sm hover:bg-blue-500 disabled:opacity-50 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Executing AI Scoring & Minting Block...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    Execute AI Scoring & Mint Blockchain Block
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Analysis & Dispatch Output Card */}
          {latestAnalysis && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200">
                  Blockchain Mint Confirmation & Alert Brief
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const targetCluster =
                        allClusters.find(
                          (c) =>
                            c.linkedAtmIds.includes(formData.atmId || '') ||
                            c.sector.toLowerCase() === selectedAtm.sector.toLowerCase()
                        ) || allClusters[0];
                      handleOpenReportModal(targetCluster);
                    }}
                    className="flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white transition shadow-sm"
                    title="Generate and download Section 65B certified incident report PDF"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Export PDF Dossier</span>
                  </button>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20">
                    Block #{latestAnalysis.blockIndex} Minted
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-950 p-2 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Calculated Fraud Weight:</div>
                  <div
                    className={`font-mono text-base font-bold ${
                      latestAnalysis.probability >= 75
                        ? 'text-rose-400'
                        : latestAnalysis.probability >= 45
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {latestAnalysis.probability}%
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{latestAnalysis.tier}</div>
                </div>

                <div className="rounded bg-slate-950 p-2 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Cryptographic Merkle Leaf:</div>
                  <div className="font-mono text-xs font-bold text-cyan-400 truncate">
                    {latestAnalysis.merkleLeaf}
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    5/5 Validator Signatures Sealed
                  </div>
                </div>
              </div>

              {/* Gemini 3.8-Flash Forensic Reasoning */}
              {latestAnalysis.geminiForensics && (
                <div className="mt-3 rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    Gemini 3.8-Flash Neural Forensic Reasoning
                  </div>
                  <div className="mt-1.5 text-xs text-slate-300">
                    <div className="text-indigo-200 font-semibold mb-1">
                      Vector: {latestAnalysis.geminiForensics.modusOperandi}
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {latestAnalysis.geminiForensics.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Tactical Field Brief Text & Copy */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Tactical Field Dispatch Brief (SMS & Webhook Formatted)</span>
                  <button
                    onClick={handleCopyBrief}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedBrief ? 'Copied!' : 'Copy Brief'}
                  </button>
                </div>
                <pre className="max-h-36 overflow-y-auto rounded bg-slate-950 p-2.5 font-mono text-[10px] text-slate-300 border border-slate-800 leading-tight">
                  {latestAnalysis.fieldBrief}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated New Cybercrime Case Registration Modal */}
      <NewCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        currentUser={currentUser}
        preSelectedAtm={modalPreSelectedAtm}
        preSelectedCoords={modalPreSelectedCoords}
        onCaseSubmitted={(analysis) => {
          setLatestAnalysis(analysis);
          onIncidentAnalyzed(analysis);
          if (modalPreSelectedAtm) {
            setSelectedAtm(modalPreSelectedAtm);
          }
        }}
      />

      {/* Comprehensive Cybercrime Cluster Forensic Incident Report (PDF) Modal */}
      <ClusterReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        clusters={allClusters}
        selectedCluster={selectedReportCluster}
        onSelectCluster={(cluster) => setSelectedReportCluster(cluster)}
        currentUser={currentUser}
        latestAnalysis={latestAnalysis}
        latestBlocks={latestBlocks}
      />
    </div>
  );
};
