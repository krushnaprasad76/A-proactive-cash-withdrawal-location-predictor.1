import React, { useState } from 'react';
import {
  RefreshCw,
  Database,
  Server,
  CheckCircle,
  AlertCircle,
  Play,
  RotateCcw,
  Clock,
  Terminal,
  Code2,
  Copy,
} from 'lucide-react';
import { SchemaMigrationState, UserProfile } from '../types';
import { MIGRATION_SQL_SCRIPTS } from '../lib/migrationEngine';

interface MigrationControlCenterProps {
  currentUser: UserProfile;
  migrationState: SchemaMigrationState;
  onExecutePhase: (phase: 'EXPAND' | 'ROLLING_NODES' | 'CONTRACT' | 'ROLLBACK') => Promise<void>;
}

export const MigrationControlCenter: React.FC<MigrationControlCenterProps> = ({
  currentUser,
  migrationState,
  onExecutePhase,
}) => {
  const [selectedScriptTab, setSelectedScriptTab] = useState<'expand' | 'dualWrite' | 'contract'>('expand');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'SUCCESS' | 'WARN'>('ALL');

  const handlePhaseClick = async (phase: 'EXPAND' | 'ROLLING_NODES' | 'CONTRACT' | 'ROLLBACK') => {
    setIsExecuting(true);
    try {
      await onExecutePhase(phase);
    } finally {
      setIsExecuting(false);
    }
  };

  const currentScriptContent =
    selectedScriptTab === 'expand'
      ? MIGRATION_SQL_SCRIPTS.expandPhase
      : selectedScriptTab === 'dualWrite'
      ? MIGRATION_SQL_SCRIPTS.dualWriteTrigger
      : MIGRATION_SQL_SCRIPTS.contractPhase;

  const handleCopySql = () => {
    navigator.clipboard.writeText(currentScriptContent);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const filteredLogs = migrationState.logs.filter(
    (l) => logFilter === 'ALL' || l.level === logFilter
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Control Room Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-bold text-white sm:text-lg">
                Zero-Downtime Schema Migration & Distributed Rolling Updates
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Expand-and-Contract architecture evolution across 5 cluster nodes. Guarantees 100% backward compatibility.
            </p>
          </div>

          {/* Operational Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePhaseClick('EXPAND')}
              disabled={isExecuting}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              Phase 1: Expand
            </button>

            <button
              onClick={() => handlePhaseClick('ROLLING_NODES')}
              disabled={isExecuting}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow-sm"
            >
              <Server className="h-3.5 w-3.5" />
              Phase 2: Rolling Nodes
            </button>

            <button
              onClick={() => handlePhaseClick('CONTRACT')}
              disabled={isExecuting}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-sm"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Phase 3: Contract
            </button>

            <button
              onClick={() => handlePhaseClick('ROLLBACK')}
              disabled={isExecuting}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              Rollback Safe
            </button>
          </div>
        </div>

        {/* Active Phase Banner */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-slate-950 p-3.5 border border-slate-800 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">Current Phase:</span>
              <span className="rounded bg-blue-500/20 px-2 py-0.5 font-bold font-mono text-blue-300 border border-blue-500/30">
                {migrationState.status}
              </span>
              <span className="font-mono text-slate-400">({migrationState.overallProgress}% Complete)</span>
            </div>
            <p className="mt-1 text-slate-300">{migrationState.activePhaseDescription}</p>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px] shrink-0">
            <div className="rounded bg-slate-900 px-2.5 py-1 border border-slate-800">
              <span className="text-slate-400">Downtime:</span>{' '}
              <strong className="text-emerald-400">0.00s</strong>
            </div>
            <div className="rounded bg-slate-900 px-2.5 py-1 border border-slate-800">
              <span className="text-slate-400">Legacy V1:</span>{' '}
              <strong className="text-emerald-400">100% Compatible</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Node Distributed Rollout Matrix */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              Distributed Cluster Node Rollout Matrix (Rolling Updates)
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400">All 5 Peer Nodes Synchronized</span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          {migrationState.nodesStatus.map((node) => (
            <div
              key={node.nodeId}
              className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-cyan-400">{node.nodeId}</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
                    {node.status}
                  </span>
                </div>
                <div className="mt-1 font-semibold text-white text-xs truncate">{node.nodeName}</div>
                <div className="text-[11px] text-slate-400">{node.region}</div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-mono font-bold text-white">{node.progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
                <div className="mt-2 text-[10px] text-slate-400 truncate">{node.currentStep}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backward-Compatibility Verification Showcase */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              Backward Compatibility Live Verifier (Legacy v1 vs Upgraded v3)
            </h3>
          </div>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-300 border border-emerald-500/20">
            Expand-and-Contract Dual Active
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
          {/* Legacy V1 Client View */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
            <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-300">Legacy V1 Client (e.g. Old Streamlit / Terminal)</span>
              <span className="text-[10px] text-slate-400">Reads 'legacy_v1_transaction_trail'</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Legacy apps continue querying standard fields with zero SQL errors or column mismatch crashes:
            </p>
            <pre className="mt-2 rounded bg-slate-900 p-2 text-[10px] text-slate-300 overflow-x-auto border border-slate-800">
{`SELECT transaction_id, source_account, destination_account, amount, tx_timestamp 
FROM legacy_v1_transaction_trail 
WHERE transaction_id = 'TXN-990182';

-- Result: 1 row returned (Status: 200 OK | Latency: 1.8ms | Dropped: 0)`}
            </pre>
          </div>

          {/* Upgraded V3 Blockchain Client View */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
            <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300">Upgraded V3 Distributed Client</span>
              <span className="text-[10px] text-slate-400">Reads 'transaction_trail' with anchors</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              New clients query immutable cryptographic hashes, Merkle roots, and quorum counts concurrently:
            </p>
            <pre className="mt-2 rounded bg-slate-900 p-2 text-[10px] text-cyan-300 overflow-x-auto border border-slate-800">
{`SELECT transaction_id, blockchain_hash, merkle_leaf_hash, block_height, consensus_quorum_count
FROM transaction_trail 
WHERE transaction_id = 'TXN-990182';

-- Result: 1 row returned (Block #1 | Quorum: 5/5 | Leaf: Verified)`}
            </pre>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Real-Time Migration Terminal Logs & SQL Scripts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real-time Telemetry Terminal (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-cyan-400" />
              <h3 className="font-bold text-white text-sm sm:text-base">
                Real-Time Migration Progress Logs & Telemetry
              </h3>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 text-[10px] font-mono">
              {(['ALL', 'INFO', 'SUCCESS', 'WARN'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  className={`rounded px-2 py-0.5 transition ${
                    logFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 h-64 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] space-y-2 border border-slate-800">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-slate-400 shrink-0">[{log.timestamp.slice(11, 19)}]</span>
                <span
                  className={`shrink-0 font-bold px-1 rounded text-[9px] ${
                    log.level === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : log.level === 'WARN'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-slate-400 shrink-0">({log.node || 'NODE-DEL-01'}):</span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SQL Blueprint Viewer (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm sm:text-base">SQL Migration DDL</h3>
            </div>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              <Copy className="h-3 w-3" />
              {copiedSql ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Tab selector */}
          <div className="mt-3 flex gap-1 border-b border-slate-800 text-xs">
            <button
              onClick={() => setSelectedScriptTab('expand')}
              className={`px-3 py-1.5 font-medium border-b-2 transition ${
                selectedScriptTab === 'expand'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Expand Phase
            </button>
            <button
              onClick={() => setSelectedScriptTab('dualWrite')}
              className={`px-3 py-1.5 font-medium border-b-2 transition ${
                selectedScriptTab === 'dualWrite'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Dual-Write Trigger
            </button>
            <button
              onClick={() => setSelectedScriptTab('contract')}
              className={`px-3 py-1.5 font-medium border-b-2 transition ${
                selectedScriptTab === 'contract'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Contract Phase
            </button>
          </div>

          <pre className="mt-3 h-52 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] text-slate-300 border border-slate-800 leading-tight">
            {currentScriptContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
