import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  AlertOctagon,
  RefreshCw,
  GitCommit,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  BlockchainBlock,
  CrossChainSyncStatus,
  ImmutableUserLog,
} from '../types';

interface BlockchainExplorerProps {
  blocks: BlockchainBlock[];
  userLogs: ImmutableUserLog[];
  onRefreshChain: () => void;
  onTamperTest: () => Promise<void>;
  onRepairChain: () => Promise<void>;
  onCrossChainSync: (mode: CrossChainSyncStatus['channelMode']) => Promise<void>;
}

export const BlockchainExplorer: React.FC<BlockchainExplorerProps> = ({
  blocks,
  userLogs,
  onRefreshChain,
  onTamperTest,
  onRepairChain,
  onCrossChainSync,
}) => {
  const [expandedBlockIndex, setExpandedBlockIndex] = useState<number | null>(blocks.length > 1 ? 1 : 0);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    tamperedBlockIndex?: number;
    reason?: string;
    checkedBlocksCount?: number;
    checkedTransactionsCount?: number;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeSyncMode, setActiveSyncMode] = useState<CrossChainSyncStatus['channelMode']>('STATE_CHANNEL_OPTIMIZED');
  const [syncLoading, setSyncLoading] = useState(false);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/blockchain/verify');
      const data = await res.json();
      setVerificationResult(data);
    } catch (err) {
      console.error('Failed to verify chain:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSyncChange = async (mode: CrossChainSyncStatus['channelMode']) => {
    setActiveSyncMode(mode);
    setSyncLoading(true);
    try {
      await onCrossChainSync(mode);
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Verification & Tamper-Proof Operations */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white sm:text-lg">
                Decentralized Blockchain Ledger & Audit Trail
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Every incident transaction is bound by SHA-256 Merkle roots and ratified by 5/5 distributed cluster nodes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-sm"
            >
              {isVerifying ? (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  Auditing Cryptographic Signatures...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Audit Entire Blockchain Integrity
                </>
              )}
            </button>

            <button
              onClick={onTamperTest}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition"
              title="Inject simulated unauthorized edit into Block #1 to showcase cryptographic tamper detection"
            >
              <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
              Simulate Tamper Attack
            </button>

            <button
              onClick={onRepairChain}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-300" />
              Self-Heal from Consensus Quorum
            </button>
          </div>
        </div>

        {/* Verification Status Banner */}
        {verificationResult && (
          <div
            className={`mt-4 rounded-lg p-3.5 border text-xs ${
              verificationResult.isValid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {verificationResult.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {verificationResult.isValid
                    ? 'Cryptographic Audit Passed: 100% Immutable'
                    : `CRITICAL INTEGRITY BREACH: Block #${verificationResult.tamperedBlockIndex} Compromised!`}
                </div>
                <div className="mt-1 text-slate-300">
                  {verificationResult.isValid
                    ? `Verified all ${verificationResult.checkedBlocksCount} blocks and ${verificationResult.checkedTransactionsCount} transaction Merkle leaves. Zero hash collisions or tampering detected across cluster.`
                    : `${verificationResult.reason} — Byzantine consensus rejected payload and quarantined offending node!`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cross-Chain Latency Optimization Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              Cross-Chain Data Synchronization & Latency Optimization
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Target Channel: State Cyber Chain &lt;-&gt; NPCI/RBI Interbank Switch
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => handleSyncChange('STATE_CHANNEL_OPTIMIZED')}
            className={`rounded-lg p-3.5 text-left border transition ${
              activeSyncMode === 'STATE_CHANNEL_OPTIMIZED'
                ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/50'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300">State-Channel Optimized</span>
              <span className="font-mono text-sm font-bold text-emerald-400">~42 ms</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
              Instant off-chain state commitments with sub-second finality. Ideal for urgent freeze webhooks.
            </p>
            <div className="mt-2 text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
              94% Latency Reduction vs Standard
            </div>
          </button>

          <button
            onClick={() => handleSyncChange('ROLLUP_BATCH')}
            className={`rounded-lg p-3.5 text-left border transition ${
              activeSyncMode === 'ROLLUP_BATCH'
                ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/50'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Rollup Batch Settlement</span>
              <span className="font-mono text-sm font-bold text-amber-400">~280 ms</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
              Compresses 500+ transactions into a single cryptographic validity proof for interstate relays.
            </p>
            <div className="mt-2 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              High-Throughput Batch Mode
            </div>
          </button>

          <button
            onClick={() => handleSyncChange('STANDARD_RELAY')}
            className={`rounded-lg p-3.5 text-left border transition ${
              activeSyncMode === 'STANDARD_RELAY'
                ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/50'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Standard Cross-Chain Relay</span>
              <span className="font-mono text-sm font-bold text-rose-400">~850 ms</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
              Legacy multi-hop RPC consensus. Slower confirmation window across distributed clusters.
            </p>
            <div className="mt-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Legacy Baseline
            </div>
          </button>
        </div>
      </div>

      {/* Blockchain Block Explorer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              Immutable Blockchain Block Explorer ({blocks.length} Blocks Anchored)
            </h3>
          </div>
          <button
            onClick={onRefreshChain}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {blocks.map((block) => {
            const isExpanded = expandedBlockIndex === block.index;
            const isGenesis = block.index === 0;

            return (
              <div
                key={block.index}
                className={`rounded-xl border transition ${
                  block.tampered
                    ? 'border-rose-500/80 bg-rose-950/20'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                {/* Block Summary Bar */}
                <div
                  onClick={() => setExpandedBlockIndex(isExpanded ? null : block.index)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                        isGenesis
                          ? 'bg-purple-600 text-white'
                          : block.tampered
                          ? 'bg-rose-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      #{block.index}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {isGenesis ? 'Genesis Block' : `Block #${block.index} [${block.blockType}]`}
                        </span>
                        {block.tampered && (
                          <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
                            COMPROMISED HASH
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Hash: <span className="text-cyan-400">{block.hash.slice(0, 24)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                    <div>
                      <span className="text-slate-400">Txns: </span>
                      <span className="text-white font-bold">{block.transactions.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Quorum: </span>
                      <span className="text-emerald-400 font-bold">{block.validatorQuorum.length}/5</span>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 p-4 space-y-4 text-xs bg-slate-950">
                    {/* Header Technical Data */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                      <div className="rounded bg-slate-900 p-2.5 border border-slate-800">
                        <span className="text-slate-400">Previous Block Hash:</span>
                        <div className="text-slate-200 break-all">{block.previousHash}</div>
                      </div>
                      <div className="rounded bg-slate-900 p-2.5 border border-slate-800">
                        <span className="text-slate-400">Merkle Root (SHA-256):</span>
                        <div className="text-amber-300 break-all">{block.merkleRoot}</div>
                      </div>
                      <div className="rounded bg-slate-900 p-2.5 border border-slate-800">
                        <span className="text-slate-400">State Root:</span>
                        <div className="text-emerald-300 break-all">{block.stateRoot}</div>
                      </div>
                      <div className="rounded bg-slate-900 p-2.5 border border-slate-800">
                        <span className="text-slate-400">Cross-Chain State Sync Hash:</span>
                        <div className="text-cyan-300 break-all">{block.crossChainSyncHash}</div>
                      </div>
                    </div>

                    {/* Validator Signatures Quorum */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Decentralized Quorum Ratification ({block.validatorQuorum.length} Validating Peers):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {block.validatorQuorum.map((v, idx) => (
                          <div
                            key={idx}
                            className="rounded bg-slate-900/90 p-2 border border-slate-800 text-[11px] font-mono"
                          >
                            <div className="flex items-center justify-between text-emerald-400">
                              <span className="font-bold">{v.nodeName}</span>
                              <span className="text-[10px] bg-emerald-500/20 px-1 rounded">ACCEPTED</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-1">{v.signature}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transactions In Block */}
                    {block.transactions.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Audited Transactions Anchored in Block:
                        </span>
                        <div className="space-y-2">
                          {block.transactions.map((tx) => (
                            <div
                              key={tx.txId}
                              className={`rounded-lg p-3 border font-mono text-xs ${
                                tx.tampered
                                  ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                                  : 'border-slate-800 bg-slate-900/60 text-slate-300'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">{tx.txId}</span>
                                  <span className="text-slate-400 text-[11px]">({tx.paymentMode})</span>
                                  {tx.tampered && (
                                    <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                      TAMPERED RECORD
                                    </span>
                                  )}
                                </div>
                                <div className="text-amber-400 font-bold">
                                  ₹{tx.amount.toLocaleString()} (Fraud Weight: {tx.threatScore}%)
                                </div>
                              </div>

                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-400">
                                <div>
                                  From: <span className="text-slate-200">{tx.sourceAccount}</span> -&gt; To:{' '}
                                  <span className="text-slate-200">{tx.destinationAccount}</span>
                                </div>
                                <div>
                                  ATM Target:{' '}
                                  <span className="text-slate-200">
                                    {tx.atmId} ({tx.atmCoordinates.branch})
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 text-[10px] text-cyan-400 break-all">
                                SHA-256 Leaf: {tx.merkleLeafHash}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Immutable User Action Audit Log */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <GitCommit className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              Immutable User Action Audit Trail ({userLogs.length} Cryptographic Entries)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Back-linked SHA-256 Hash Chain</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400">
                <th className="p-2.5">Log ID</th>
                <th className="p-2.5">Actor</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Target Resource</th>
                <th className="p-2.5">Cluster Node</th>
                <th className="p-2.5">Current Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {userLogs.map((log) => (
                <tr key={log.logId} className="hover:bg-slate-950/40">
                  <td className="p-2.5 font-bold text-slate-300">{log.logId}</td>
                  <td className="p-2.5 text-slate-300">
                    <div>{log.userEmail}</div>
                    <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] uppercase text-slate-400">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="p-2.5 text-cyan-400 font-semibold">{log.action}</td>
                  <td className="p-2.5 text-slate-300">{log.resource}</td>
                  <td className="p-2.5 text-amber-400">{log.clusterNode}</td>
                  <td className="p-2.5 text-[10px] text-slate-400 truncate max-w-[120px]">
                    {log.currentLogHash.slice(0, 16)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
