/**
 * Core type definitions for NULL-AI Blockchain & AI Security Framework
 */

export type UserRole = 'admin' | 'investigator' | 'auditor' | 'analyst';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agency: string;
  badgeNumber: string;
  clusterNodeId: string;
  avatarUrl?: string;
}

export interface AuditTransaction {
  txId: string;
  complaintId: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: number;
  paymentMode: 'UPI' | 'IMPS' | 'AEPS' | 'WALLET' | 'SWIFT';
  timestamp: string;
  threatScore: number;
  threatTier: string;
  cryptographicHash: string;
  merkleLeafHash: string;
  digitalSignature: string;
  atmId: string;
  atmCoordinates: {
    lat: number;
    lng: number;
    city: string;
    branch: string;
  };
  auditStatus: 'COMMITTED' | 'VALIDATING' | 'FLAGGED';
  tampered?: boolean;
}

export interface ValidatorSignature {
  nodeId: string;
  nodeName: string;
  region: string;
  signature: string;
  timestamp: string;
  vote: 'ACCEPT' | 'REJECT';
}

export interface BlockchainBlock {
  index: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  merkleRoot: string;
  stateRoot: string;
  nonce: number;
  blockType: 'GENESIS' | 'STANDARD_AUDIT' | 'RETRAIN_ANCHOR' | 'MIGRATION_ANCHOR';
  transactions: AuditTransaction[];
  validatorQuorum: ValidatorSignature[];
  crossChainSyncHash: string;
  tampered?: boolean;
}

export interface ImmutableUserLog {
  logId: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  resource: string;
  timestamp: string;
  clusterNode: string;
  previousLogHash: string;
  currentLogHash: string;
  digitalSignature: string;
  tampered?: boolean;
}

export interface CrossChainSyncStatus {
  sourceChain: string;
  targetChain: string;
  syncBatchId: string;
  syncLatencyMs: number;
  channelMode: 'STATE_CHANNEL_OPTIMIZED' | 'ROLLUP_BATCH' | 'STANDARD_RELAY';
  merkleProofRoot: string;
  status: 'SYNCHRONIZED' | 'PENDING_RELAY' | 'CHALLENGE_WINDOW';
  timestamp: string;
  blockHeight: number;
}

export interface ClusterNode {
  nodeId: string;
  nodeName: string;
  region: string;
  status: 'ONLINE' | 'SYNCING' | 'MIGRATING' | 'OUT_OF_CONSENSUS';
  version: 'v1.0-legacy' | 'v2.0-dualwrite' | 'v3.0-blockchain';
  blockHeight: number;
  peerCount: number;
  latencyMs: number;
  isValidator: boolean;
  lastHeartbeat: string;
}

export interface NodeMigrationProgress {
  nodeId: string;
  nodeName: string;
  region: string;
  progress: number;
  currentStep: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'QUEUED' | 'VERIFIED';
  zeroDowntimePass: boolean;
}

export interface SchemaMigrationState {
  migrationId: string;
  currentVersion: string;
  targetVersion: string;
  status: 'IDLE' | 'PRE_CHECK' | 'EXPAND_PHASE' | 'ROLLING_UPGRADE' | 'CONTRACT_PHASE' | 'COMPLETED' | 'ROLLBACK';
  overallProgress: number;
  activePhaseDescription: string;
  nodesStatus: NodeMigrationProgress[];
  logs: Array<{
    id: string;
    timestamp: string;
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
    message: string;
    node?: string;
  }>;
  backwardCompatibilityCheck: {
    legacyV1ReadsOk: boolean;
    dualWriteActive: boolean;
    downtimeSeconds: number;
    testedQueriesCount: number;
  };
}

export interface AIModelFeature {
  featureName: string;
  weight: number;
  description: string;
}

export interface AIModelArchitecture {
  modelVersion: string;
  status: 'ACTIVE_STREAMING' | 'RETRAINING' | 'EVALUATING' | 'OPTIMIZED';
  currentAccuracy: number;
  driftPercentage: number;
  driftThreshold: number;
  trainingSamplesCount: number;
  lastRetrainedAt: string;
  modelHashOnChain: string;
  streamingIngestionRateTps: number;
  averageInferenceLatencyMs: number;
  featureWeights: AIModelFeature[];
  trainingPool: Array<{
    transactionId: string;
    features: number[];
    groundTruth: number;
    loggedAt: string;
  }>;
  recentTelemetry: Array<{
    id: string;
    timestamp: string;
    streamSource: 'UPI_SWITCH' | 'ATM_TELEMETRY' | 'CYBER_COMPLAINT' | 'REMITTANCE_GATEWAY';
    amount: number;
    fraudScore: number;
    tier: string;
    latencyMs: number;
  }>;
}

export interface IncidentInputPayload {
  complaintId: string;
  victimLocation: string;
  victimName?: string;
  victimPhone?: string;
  fraudCategory?: string;
  rawNarrative: string;
  transactionId: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: number;
  paymentMode: 'UPI' | 'IMPS' | 'AEPS' | 'WALLET';
  atmId?: string;
}

export interface ThreatAnalysisResponse {
  status: 'SUCCESS' | 'ERROR';
  transactionId: string;
  probability: number;
  tier: string;
  blockIndex: number;
  blockHash: string;
  merkleLeaf: string;
  validatorQuorumCount: number;
  crossChainSyncLatencyMs: number;
  intelligence: {
    extractedUpiIds: string[];
    extractedPhoneNumbers: string[];
    extractedSuspectAccounts: string[];
    urgencyFlag: number;
  };
  fieldBrief: string;
  bankWebhookDispatched: boolean;
  geminiForensics?: {
    summary: string;
    tacticalRecommendations: string[];
    modusOperandi: string;
    threatClassification: string;
  };
}
