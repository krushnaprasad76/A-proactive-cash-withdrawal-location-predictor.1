import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CommandGISDashboard } from './components/CommandGISDashboard';
import { BlockchainExplorer } from './components/BlockchainExplorer';
import { MigrationControlCenter } from './components/MigrationControlCenter';
import { AIStreamingStudio } from './components/AIStreamingStudio';
import {
  UserProfile,
  BlockchainBlock,
  ImmutableUserLog,
  SchemaMigrationState,
  AIModelArchitecture,
  CrossChainSyncStatus,
  ThreatAnalysisResponse,
} from './types';
import { INITIAL_MIGRATION_STATE } from './lib/migrationEngine';
import { INITIAL_AI_STATE } from './lib/aiStreamingEngine';

export default function App() {
  // Pre-configured demo users
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([
    {
      id: 'USER-ADMIN-01',
      name: 'Inspector Vikramaditya Rao',
      email: 'admin@cybercell.gov.in',
      role: 'admin',
      agency: 'Cyber Crime Police Command (CERT-In / CID)',
      badgeNumber: 'TS-IPS-8841',
      clusterNodeId: 'NODE-DEL-01',
    },
    {
      id: 'USER-INV-02',
      name: 'Sub-Inspector Ananya Sharma',
      email: 'investigator.ananya@cybercell.gov.in',
      role: 'investigator',
      agency: 'Telangana Cyber Security Bureau (TGCSB)',
      badgeNumber: 'TS-CYB-3490',
      clusterNodeId: 'NODE-HYD-02',
    },
    {
      id: 'USER-AUDIT-03',
      name: 'Dr. Rajesh Nair',
      email: 'auditor.cert@gov.in',
      role: 'auditor',
      agency: 'National Cybersecurity Audit Council',
      badgeNumber: 'NCAC-AUD-991',
      clusterNodeId: 'NODE-BLR-04',
    },
    {
      id: 'USER-ANALYST-04',
      name: 'Priya Mukherjee',
      email: 'analyst@finswitch.org',
      role: 'analyst',
      agency: 'NPCI / Financial Intelligence Unit (FIU-IND)',
      badgeNumber: 'FIU-ANL-112',
      clusterNodeId: 'NODE-BOM-03',
    },
  ]);

  const [currentUser, setCurrentUser] = useState<UserProfile>(availableUsers[0]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Application State
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [userLogs, setUserLogs] = useState<ImmutableUserLog[]>([]);
  const [migrationState, setMigrationState] = useState<SchemaMigrationState>(INITIAL_MIGRATION_STATE);
  const [aiState, setAIState] = useState<AIModelArchitecture>(INITIAL_AI_STATE);
  const [syncLatencyMs, setSyncLatencyMs] = useState<number>(42);

  // Fetch initial ledger and state from API
  const fetchBlockchainData = async () => {
    try {
      const res = await fetch('/api/blockchain/blocks');
      const data = await res.json();
      if (data.blocks) {
        setBlocks(data.blocks);
      }
    } catch (err) {
      console.warn('Backend API fetching blocks failed, using fallback:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (data.logs) {
        setUserLogs(data.logs);
      }
    } catch (err) {
      console.warn('Backend API fetching logs failed:', err);
    }
  };

  const fetchMigrationState = async () => {
    try {
      const res = await fetch('/api/migration/status');
      const data = await res.json();
      if (data.migrationState) {
        setMigrationState(data.migrationState);
      }
    } catch (err) {
      console.warn('Backend API fetching migration failed:', err);
    }
  };

  const fetchAIState = async () => {
    try {
      const res = await fetch('/api/ai/status');
      const data = await res.json();
      if (data.modelVersion) {
        setAIState(data);
      }
    } catch (err) {
      console.warn('Backend API fetching AI failed:', err);
    }
  };

  useEffect(() => {
    fetchBlockchainData();
    fetchAuditLogs();
    fetchMigrationState();
    fetchAIState();
  }, []);

  // Incident Analyzed Callback
  const handleIncidentAnalyzed = (response: ThreatAnalysisResponse) => {
    fetchBlockchainData();
    fetchAuditLogs();
    fetchAIState();
  };

  // Field Verdict Submission Callback
  const handleLogFieldVerdict = async (transactionId: string, verdict: string) => {
    try {
      await fetch('/api/ai/retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackBatch: [
            {
              transactionId,
              features: [50000.0, 1, 10.0, 0.4, 2, 1],
              groundTruth: verdict === 'FALSE_POSITIVE' ? 0 : 1,
            },
          ],
          userContext: currentUser,
        }),
      });
      fetchAIState();
      fetchBlockchainData();
      fetchAuditLogs();
    } catch (err) {
      console.error('Failed to log field verdict:', err);
    }
  };

  // Tamper Test Callback
  const handleTamperTest = async () => {
    try {
      await fetch('/api/blockchain/tamper-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockIndex: 1, tamperedAmount: 9999999.0 }),
      });
      fetchBlockchainData();
      fetchAuditLogs();
    } catch (err) {
      console.error('Tamper test error:', err);
    }
  };

  // Repair Chain Callback
  const handleRepairChain = async () => {
    try {
      await fetch('/api/blockchain/repair', { method: 'POST' });
      fetchBlockchainData();
      fetchAuditLogs();
    } catch (err) {
      console.error('Repair chain error:', err);
    }
  };

  // Cross-Chain Sync Mode Switch Callback
  const handleCrossChainSync = async (mode: CrossChainSyncStatus['channelMode']) => {
    try {
      const res = await fetch('/api/blockchain/cross-chain-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      setSyncLatencyMs(data.syncLatencyMs);
    } catch (err) {
      console.error('Cross-chain sync error:', err);
    }
  };

  // Migration Phase Execution Callback
  const handleExecutePhase = async (phase: 'EXPAND' | 'ROLLING_NODES' | 'CONTRACT' | 'ROLLBACK') => {
    try {
      const res = await fetch('/api/migration/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase, userContext: currentUser }),
      });
      const updated = await res.json();
      setMigrationState(updated);
      fetchAuditLogs();
    } catch (err) {
      console.error('Migration execution error:', err);
    }
  };

  // AI Auto-Retrain Callback
  const handleTriggerRetrain = async (samples?: any[]) => {
    try {
      const res = await fetch('/api/ai/retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackBatch: samples, userContext: currentUser }),
      });
      const data = await res.json();
      if (data.aiModelState) {
        setAIState(data.aiModelState);
      }
      fetchBlockchainData();
      fetchAuditLogs();
      return data;
    } catch (err) {
      console.error('AI retrain error:', err);
      return null;
    }
  };

  // Simulate Stream Ingestion Event Callback
  const handleSimulateStreamEvent = async () => {
    try {
      await fetch('/api/ai/simulate-stream', { method: 'POST' });
      fetchAIState();
    } catch (err) {
      console.error('Stream simulation error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#e2e8f0] flex flex-col">
      {/* Role-Based App Header */}
      <Header
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSelectUser={setCurrentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        blockHeight={blocks.length > 0 ? blocks[blocks.length - 1].index : 0}
        syncLatencyMs={syncLatencyMs}
      />

      {/* Primary Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'dashboard' && (
          <CommandGISDashboard
            currentUser={currentUser}
            latestBlocks={blocks}
            onIncidentAnalyzed={handleIncidentAnalyzed}
            onLogFieldVerdict={handleLogFieldVerdict}
          />
        )}

        {activeTab === 'blockchain' && (
          <BlockchainExplorer
            blocks={blocks}
            userLogs={userLogs}
            onRefreshChain={fetchBlockchainData}
            onTamperTest={handleTamperTest}
            onRepairChain={handleRepairChain}
            onCrossChainSync={handleCrossChainSync}
          />
        )}

        {activeTab === 'migration' && (
          <MigrationControlCenter
            currentUser={currentUser}
            migrationState={migrationState}
            onExecutePhase={handleExecutePhase}
          />
        )}

        {activeTab === 'ai-studio' && (
          <AIStreamingStudio
            currentUser={currentUser}
            aiState={aiState}
            onTriggerRetrain={handleTriggerRetrain}
            onSimulateStreamEvent={handleSimulateStreamEvent}
          />
        )}
      </main>

      {/* Global Security Footer */}
      <footer className="border-t border-slate-800 bg-[#090d16] py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Enterprise Blockchain & AI Cybercrime Defense Network</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Current Authenticated Node: <span className="text-cyan-400">{currentUser.clusterNodeId}</span> | Role: <span className="text-amber-400 uppercase font-bold">{currentUser.role}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
