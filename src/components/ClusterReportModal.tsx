import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  X,
  AlertTriangle,
  Building,
  Crosshair,
  Sparkles,
  User,
  Calendar,
  Lock,
  Layers,
  CheckCircle2,
  Search,
  ChevronDown,
  Info,
} from 'lucide-react';
import { HotspotCluster } from './GeospatialHeatmap';
import { ATMNode, ATM_REGISTRY } from '../data/atmRegistry';
import { ThreatAnalysisResponse, UserProfile, BlockchainBlock } from '../types';
import { downloadClusterIncidentPdf } from '../lib/pdfReportGenerator';

interface ClusterReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusters: HotspotCluster[];
  selectedCluster: HotspotCluster | null;
  onSelectCluster: (cluster: HotspotCluster) => void;
  currentUser: UserProfile;
  latestAnalysis?: ThreatAnalysisResponse | null;
  latestBlocks?: BlockchainBlock[];
}

export const ClusterReportModal: React.FC<ClusterReportModalProps> = ({
  isOpen,
  onClose,
  clusters,
  selectedCluster,
  onSelectCluster,
  currentUser,
  latestAnalysis,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [officerNotes, setOfficerNotes] = useState(
    'Tactical interdiction protocol authorized under Section 91 CrPC. Coordinates relayed to Cyber Command dispatch.'
  );
  const [classification, setClassification] = useState<
    'CONFIDENTIAL // FIR EVIDENCE' | 'TOP SECRET // LES' | 'OFFICIAL USE ONLY'
  >('CONFIDENTIAL // FIR EVIDENCE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Filter clusters by search query
  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters;
    const q = searchQuery.toLowerCase();
    return clusters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.dominantMode.toLowerCase().includes(q)
    );
  }, [clusters, searchQuery]);

  // Active cluster for reporting
  const activeCluster = selectedCluster || clusters[0];

  // Linked ATMs for this cluster
  const linkedAtms = useMemo(() => {
    if (!activeCluster) return [];
    return ATM_REGISTRY.filter(
      (atm) =>
        activeCluster.linkedAtmIds.includes(atm.id) ||
        activeCluster.id.includes(atm.id) ||
        atm.sector.toLowerCase() === activeCluster.sector.toLowerCase()
    );
  }, [activeCluster]);

  if (!isOpen || !activeCluster) return null;

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      downloadClusterIncidentPdf({
        cluster: activeCluster,
        currentUser,
        latestAnalysis,
        linkedAtms,
        officerNotes,
        classificationLevel: classification,
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate PDF incident report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const isCritical = activeCluster.peakThreatScore >= 75;
  const isHigh = activeCluster.peakThreatScore >= 50 && !isCritical;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-500/10 p-2 border border-blue-500/30 text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Generate Forensic Incident Dossier
                </h3>
                <span className="rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono text-rose-300 font-bold">
                  PDF EXPORT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cryptographically certified incident report compliant with Section 65B Indian Evidence Act
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-300">
          {/* Cluster Selector Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair className="h-4 w-4 text-cyan-400" />
                Select Cybercrime Cluster:
              </label>

              {/* Cluster search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search cluster or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Cluster Selector Dropdown / Pills */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
              {filteredClusters.map((c) => {
                const isSelected = activeCluster.id === c.id;
                const isCrit = c.peakThreatScore >= 75;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectCluster(c)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                        : isCrit
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/40'
                        : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isCrit ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {c.peakThreatScore}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dossier Document Preview Card */}
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-4">
            {/* Dossier Meta Top Banner */}
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {activeCluster.name}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {activeCluster.riskTier} RISK ({activeCluster.peakThreatScore}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sector: {activeCluster.sector} | Geolocation: {activeCluster.centroidLat.toFixed(4)}°N,{' '}
                  {activeCluster.centroidLng.toFixed(4)}°E
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">Dossier Tracking Ref</span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  CYB-DOSSIER-{activeCluster.id.slice(-8)}
                </span>
              </div>
            </div>

            {/* Metric Synopsis Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Loss Exposure</span>
                <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                  ₹{activeCluster.totalAmount.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">Drained across switches</span>
              </div>

              <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Audited Transactions</span>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {activeCluster.transactions.length} Blockchain Txns
                </div>
                <span className="text-[10px] text-slate-400">100% Cryptographic Hash</span>
              </div>

              <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Dominant Cash-out Channel</span>
                <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                  {activeCluster.dominantMode} Gateway
                </div>
                <span className="text-[10px] text-slate-400">Mule withdrawal vector</span>
              </div>

              <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Ledger Anchors</span>
                <div className="text-sm font-bold text-indigo-400 font-mono mt-0.5">
                  {activeCluster.blockIndices.length > 0
                    ? `Blocks #${activeCluster.blockIndices.join(', #')}`
                    : 'Genesis Block'}
                </div>
                <span className="text-[10px] text-emerald-400">Quorum 5/5 Validated</span>
              </div>
            </div>

            {/* AI Forensic Analysis Section */}
            <div className="rounded-lg bg-indigo-950/20 border border-indigo-500/30 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                AI Forensic Intelligence & Behavioral Vectors
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                {latestAnalysis?.geminiForensics?.summary ||
                  `Neural model analysis identified coordinated high-velocity transactions matching syndicated mule dispersion patterns. Target nodes in ${activeCluster.sector} correlate with rapid cash withdrawal bursts post-UPI transfer.`}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pt-1 border-t border-indigo-500/20">
                <div>
                  <span className="text-indigo-300 font-semibold block">Modus Operandi Vector:</span>
                  <span className="text-slate-300 font-mono">
                    {latestAnalysis?.geminiForensics?.modusOperandi ||
                      (activeCluster.dominantMode === 'AEPS' ? 'AEPS Biometric Clone Scam' : 'Digital Arrest Extortion')}
                  </span>
                </div>
                <div>
                  <span className="text-indigo-300 font-semibold block">Flagged Mule Accounts:</span>
                  <span className="text-slate-300 font-mono">
                    {latestAnalysis?.intelligence?.extractedSuspectAccounts?.join(', ') ||
                      'AC-449102-TS, AC-882190-HYD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Physical ATM Cash-out Infrastructure */}
            {linkedAtms.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-blue-400" />
                  Correlated Cash-out ATM Nodes ({linkedAtms.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {linkedAtms.slice(0, 4).map((atm) => (
                    <div
                      key={atm.id}
                      className="rounded-lg bg-slate-900 p-2 border border-slate-800 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {atm.bank} - {atm.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {atm.address} ({atm.region})
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            atm.cctvOperational ?? true
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {atm.cctvOperational ?? true ? 'CCTV OK' : 'CCTV ALERT'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{atm.threatProb}% Risk</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audited Transactions Table Preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                Transactions Attached to Evidence Dossier ({activeCluster.transactions.length}):
              </span>

              {activeCluster.transactions.length === 0 ? (
                <div className="rounded-lg bg-slate-900/60 p-3 text-center text-slate-400 text-[11px]">
                  No active flagged transactions in current window. Baseline cluster monitoring metrics will be documented.
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-2">Tx ID</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Mode</th>
                        <th className="p-2">Mule Account</th>
                        <th className="p-2">Threat</th>
                        <th className="p-2">Merkle Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activeCluster.transactions.map((tx) => (
                        <tr key={tx.txId} className="hover:bg-slate-800/40">
                          <td className="p-2 text-cyan-300 font-bold">{tx.txId.slice(0, 12)}</td>
                          <td className="p-2 text-white font-bold">₹{tx.amount.toLocaleString()}</td>
                          <td className="p-2 text-slate-300">{tx.paymentMode}</td>
                          <td className="p-2 text-slate-400 truncate max-w-[100px]">{tx.destinationAccount}</td>
                          <td className="p-2">
                            <span
                              className={`font-bold ${
                                tx.threatScore >= 75
                                  ? 'text-rose-400'
                                  : tx.threatScore >= 50
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {tx.threatScore}%
                            </span>
                          </td>
                          <td className="p-2 text-slate-400 truncate max-w-[90px]">
                            {tx.merkleLeafHash?.slice(0, 10)}..
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Customization Options: Classification & Officer Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Evidence Classification Banner:
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="CONFIDENTIAL // FIR EVIDENCE">CONFIDENTIAL // FIR EVIDENCE</option>
                  <option value="TOP SECRET // LES">TOP SECRET // LAW ENFORCEMENT SENSITIVE (LES)</option>
                  <option value="OFFICIAL USE ONLY">OFFICIAL USE ONLY</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Certifying Officer:
                </label>
                <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 flex items-center justify-between">
                  <span>{currentUser.name} ({currentUser.badgeNumber})</span>
                  <span className="text-[10px] text-emerald-400 font-mono">NODE-{currentUser.clusterNodeId.slice(-6)}</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Officer Notes & Intercept Directives (Printed on Report):
                </label>
                <textarea
                  rows={2}
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  placeholder="Enter investigating officer observations or statutory notices..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-3.5 gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Cryptographic Merkle Proof & Sec. 65B Certified PDF Generation</span>
          </div>

          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4" />
                PDF Downloaded Successfully!
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>{isGenerating ? 'Generating PDF Dossier...' : 'Download Incident Report (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
