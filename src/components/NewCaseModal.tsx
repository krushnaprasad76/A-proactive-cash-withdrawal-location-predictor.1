import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Send,
  X,
  FilePlus,
  Building,
  User,
  Phone,
  IndianRupee,
  MapPin,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Check,
} from 'lucide-react';
import {
  IncidentInputPayload,
  ThreatAnalysisResponse,
  UserProfile,
} from '../types';
import { ATM_REGISTRY, ATM_MAP, ATMNode, TELANGANA_DISTRICTS } from '../data/atmRegistry';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  preSelectedAtm?: ATMNode | null;
  preSelectedCoords?: { lat: number; lng: number } | null;
  onCaseSubmitted: (analysis: ThreatAnalysisResponse) => void;
}

const FRAUD_PRESETS = [
  {
    title: 'Digital Arrest Scam',
    category: 'Digital Arrest / Impersonation',
    amount: 500000,
    narrative: 'Victim kept under continuous Skype interrogation for 14 hours by fake CBI nodal officers threatening immediate arrest over illegal parcel. Victim forced to transfer savings to verified mule account.',
    mode: 'UPI' as const,
    atmId: 'ATM-SBI-0045',
    district: 'Hyderabad',
  },
  {
    title: 'SIM Swap ATM Cash-Out',
    category: 'SIM Swap / OTP Interception',
    amount: 150000,
    narrative: 'Attacker cloned victim eSIM at midnight and intercepted bank 2FA OTPs, followed by sequential rapid ATM withdrawals in Cyberabad IT corridor.',
    mode: 'UPI' as const,
    atmId: 'ATM-HDFC-0112',
    district: 'Ranga Reddy',
  },
  {
    title: 'AEPS Biometric Cloned Drain',
    category: 'AEPS Biometric Spoofing',
    amount: 85000,
    narrative: 'Silicone cloned thumb impression used at mini-ATM terminal to siphon funds through multiple micro AEPS withdrawal limits.',
    mode: 'AEPS' as const,
    atmId: 'ATM-KOTAK-088',
    district: 'Hyderabad',
  },
  {
    title: 'Loan App Extortion',
    category: 'Predatory Loan App Blackmail',
    amount: 45000,
    narrative: 'Predatory instant loan app extracted contacts and sent morphed pictures. Forced to transfer money to mule UPI handle to stop harassment.',
    mode: 'IMPS' as const,
    atmId: 'ATM-ICICI-009',
    district: 'Warangal Urban',
  },
  {
    title: 'Warangal Mule Fast-Hop',
    category: 'Layered Mule Laundering',
    amount: 280000,
    narrative: 'Phishing funds deposited into mule account in Hanamkonda with immediate dispatch of withdrawal runner to SBI Chowrasta ATM.',
    mode: 'UPI' as const,
    atmId: 'ATM-SBI-WGL-01',
    district: 'Warangal Urban',
  },
  {
    title: 'Nizamabad Card Skimming',
    category: 'ATM Skimming / PIN Harvest',
    amount: 92000,
    narrative: 'Magnetic stripe skimmer placed on ATM vestibule card slot. Cloned card used for back-to-back midnight cash-out.',
    mode: 'UPI' as const,
    atmId: 'ATM-SBI-NZB-01',
    district: 'Nizamabad',
  },
];

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  preSelectedAtm,
  preSelectedCoords,
  onCaseSubmitted,
}) => {
  const generateComplaintId = () => `CYBER-${new Date().getFullYear()}-TS-${Math.floor(100000 + Math.random() * 900000)}`;
  const generateTxId = () => `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

  const [formData, setFormData] = useState({
    complaintId: generateComplaintId(),
    victimName: 'K. Venkatesh Rao',
    victimPhone: '+91 98480 55421',
    victimLocation: 'Hyderabad',
    fraudCategory: 'Digital Arrest / Impersonation',
    rawNarrative: FRAUD_PRESETS[0].narrative,
    transactionId: generateTxId(),
    sourceAccount: '112233445521',
    destinationAccount: 'mule_target99@icici',
    amount: 500000,
    paymentMode: 'UPI' as 'UPI' | 'IMPS' | 'AEPS' | 'WALLET',
    atmId: ATM_REGISTRY[0].id,
  });

  const [freezeMuleSwitch, setFreezeMuleSwitch] = useState(true);
  const [dispatchPatrol, setDispatchPatrol] = useState(true);
  const [mintOnChain, setMintOnChain] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResponse, setSuccessResponse] = useState<ThreatAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync pre-selected ATM or Coords when opened
  useEffect(() => {
    if (preSelectedAtm) {
      setFormData((prev) => ({
        ...prev,
        atmId: preSelectedAtm.id,
        victimLocation: preSelectedAtm.district || preSelectedAtm.city,
      }));
    } else if (preSelectedCoords) {
      setFormData((prev) => ({
        ...prev,
        rawNarrative: `${prev.rawNarrative}\n[GPS Pin Location: Lat ${preSelectedCoords.lat}, Lng ${preSelectedCoords.lng}]`,
      }));
    }
  }, [preSelectedAtm, preSelectedCoords, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof FRAUD_PRESETS[0]) => {
    setFormData((prev) => ({
      ...prev,
      complaintId: generateComplaintId(),
      transactionId: generateTxId(),
      fraudCategory: preset.category,
      amount: preset.amount,
      rawNarrative: preset.narrative,
      paymentMode: preset.mode,
      atmId: preset.atmId,
      victimLocation: preset.district,
    }));
    setSuccessResponse(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: IncidentInputPayload = {
        complaintId: formData.complaintId,
        victimLocation: formData.victimLocation,
        victimName: formData.victimName,
        victimPhone: formData.victimPhone,
        fraudCategory: formData.fraudCategory,
        rawNarrative: formData.rawNarrative,
        transactionId: formData.transactionId,
        sourceAccount: formData.sourceAccount,
        destinationAccount: formData.destinationAccount,
        amount: Number(formData.amount),
        paymentMode: formData.paymentMode,
        atmId: formData.atmId,
      };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          userContext: currentUser,
          directives: {
            freezeMuleSwitch,
            dispatchPatrol,
            mintOnChain,
          },
        }),
      });

      const data: ThreatAnalysisResponse = await res.json();
      if (data.status === 'SUCCESS') {
        setSuccessResponse(data);
        onCaseSubmitted(data);
      } else {
        setErrorMessage('Failed to submit incident analysis to blockchain network.');
      }
    } catch (err: any) {
      console.error('Incident submission error:', err);
      setErrorMessage(err?.message || 'Network error occurred during incident ingestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedNodeObj = ATM_MAP[formData.atmId] || ATM_REGISTRY[0];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-700 bg-[#0d1322] p-6 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <FilePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Enter New Cybercrime Case</h2>
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-500/30">
                  Telangana State Cyber Security Bureau
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Log active incident, verify ATM cash-out nodes, and anchor cryptographically to ledger
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successResponse && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-200 text-sm">
                    Incident Anchored & Verified on Blockchain!
                  </h4>
                  <div className="mt-1 text-xs text-slate-300 space-y-0.5 font-mono">
                    <div>Block Index: <span className="text-emerald-400 font-bold">#{successResponse.blockIndex}</span> | Threat Score: <span className="text-rose-400 font-bold">{successResponse.probability}%</span></div>
                    <div className="truncate max-w-xl text-[11px] text-slate-400">Block Hash: {successResponse.blockHash}</div>
                    <div className="text-[11px] text-slate-400">PoA Validator Quorum: 5/5 Nodes Agreed (&gt;66%)</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition"
              >
                View on Map & Ledger
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1-Click Fast Demonstration Presets */}
        <div className="mt-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            ⚡ Quick-Fill Attack Scenarios:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {FRAUD_PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 text-left hover:border-blue-500/50 hover:bg-slate-800 transition group"
              >
                <div className="text-[11px] font-bold text-slate-200 group-hover:text-blue-300 truncate">
                  {preset.title}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  ₹{preset.amount.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Incident Entry Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Row 1: Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Complaint Reference ID</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, complaintId: generateComplaintId() })}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Re-gen
                </button>
              </label>
              <input
                type="text"
                value={formData.complaintId}
                onChange={(e) => setFormData({ ...formData, complaintId: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Victim Full Name
              </label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={formData.victimName}
                  onChange={(e) => setFormData({ ...formData, victimName: e.target.value })}
                  placeholder="Victim Name"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Victim Phone / Contact
              </label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={formData.victimPhone}
                  onChange={(e) => setFormData({ ...formData, victimPhone: e.target.value })}
                  placeholder="+91 98..."
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Location, Category, Transaction ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Incident District / Jurisdiction
              </label>
              <select
                value={formData.victimLocation}
                onChange={(e) => setFormData({ ...formData, victimLocation: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                {TELANGANA_DISTRICTS.filter((d) => d !== 'All Districts').map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fraud Modus Operandi
              </label>
              <select
                value={formData.fraudCategory}
                onChange={(e) => setFormData({ ...formData, fraudCategory: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Digital Arrest / Impersonation">Digital Arrest / Fake Law Enforcement</option>
                <option value="SIM Swap / OTP Interception">SIM Swap / Cloned eSIM OTP Drain</option>
                <option value="Predatory Loan App Blackmail">Predatory Loan App Harassment</option>
                <option value="Fake Bank KYC / Phishing Link">Fake Bank KYC / Smishing Link</option>
                <option value="AEPS Biometric Spoofing">AEPS Cloned Biometric Cash-out</option>
                <option value="ATM Skimming / PIN Harvest">ATM Skimming / Magnetic Strip Clone</option>
                <option value="Layered Mule Laundering">Multi-Hop Layered Mule Transfer</option>
                <option value="Telegram Task / Crypto Scam">Task-based Investment / Crypto Scam</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Transaction Reference ID</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transactionId: generateTxId() })}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Re-gen
                </button>
              </label>
              <input
                type="text"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Financials & Suspect Mule Target */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Disputed Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  required
                  min={1}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-7 pr-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Gateway
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="UPI">UPI Instant Switch</option>
                <option value="IMPS">IMPS Core Banking</option>
                <option value="AEPS">AEPS Biometric Terminal</option>
                <option value="WALLET">Prepaid Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Source Account / VPA
              </label>
              <input
                type="text"
                value={formData.sourceAccount}
                onChange={(e) => setFormData({ ...formData, sourceAccount: e.target.value })}
                required
                placeholder="Victim Account / VPA"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mule Beneficiary VPA / Acc
              </label>
              <input
                type="text"
                value={formData.destinationAccount}
                onChange={(e) => setFormData({ ...formData, destinationAccount: e.target.value })}
                required
                placeholder="Suspect Mule Account"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Target ATM Cash-Out Node across Hyderabad & Telangana */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-blue-400" />
                <span>Suspected Cash-Out ATM Node (Hyderabad & Telangana Mesh)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedNodeObj.district} | GPS: {selectedNodeObj.lat}°N, {selectedNodeObj.lng}°E
              </span>
            </label>
            <select
              value={formData.atmId}
              onChange={(e) => setFormData({ ...formData, atmId: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
            >
              {ATM_REGISTRY.map((atm) => (
                <option key={atm.id} value={atm.id}>
                  [{atm.bank}] {atm.id} — {atm.name} ({atm.district} / {atm.sector}) — Risk: {atm.threatProb}%
                </option>
              ))}
            </select>
          </div>

          {/* Row 5: Case Narrative */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Case Narrative & Officer Investigation Notes
            </label>
            <textarea
              rows={3}
              value={formData.rawNarrative}
              onChange={(e) => setFormData({ ...formData, rawNarrative: e.target.value })}
              required
              placeholder="Detail the sequence of events, impersonation tactics, contact numbers, and withdrawal pattern..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none font-sans"
            />
          </div>

          {/* Directive Enforcement Checkboxes */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Automated Defense Protocols:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={freezeMuleSwitch}
                  onChange={(e) => setFreezeMuleSwitch(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <span>Trigger 1930 / NPCI Switch Freeze</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={dispatchPatrol}
                  onChange={(e) => setDispatchPatrol(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <span>Dispatch Sector Patrol Intercept</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={mintOnChain}
                  onChange={(e) => setMintOnChain(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <span>Mint to Immutable Ledger (PoA)</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Anchoring on Ledger & Calculating AI Threat...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Case & Mint to Blockchain</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
