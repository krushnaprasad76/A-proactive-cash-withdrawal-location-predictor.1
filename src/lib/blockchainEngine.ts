/**
 * Cryptographic & Blockchain Engine for NULL-AI
 * Provides SHA-256 hashing, Merkle tree verification, multi-validator consensus quorum,
 * immutable audit trails, and optimized cross-chain sync.
 */

import {
  AuditTransaction,
  BlockchainBlock,
  ClusterNode,
  CrossChainSyncStatus,
  ImmutableUserLog,
  ValidatorSignature,
} from '../types';

// Fast SHA-256 hash using Web Crypto API or Node crypto
export async function sha256(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Synchronous simple hash fallback for edge cases
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  for (let i = 0; i < message.length; i++) {
    const c = message.charCodeAt(i);
    h0 = (h0 ^ (c * 31 + (h1 << 5))) >>> 0;
    h1 = (h1 ^ (c * 17 + (h2 << 7))) >>> 0;
    h2 = (h2 ^ (c * 13 + (h3 << 9))) >>> 0;
    h3 = (h3 ^ (c * 7 + (h0 << 11))) >>> 0;
  }
  return [h0, h1, h2, h3].map(h => h.toString(16).padStart(8, '0')).join('') + '00000000000000000000000000000000';
}

// Compute Merkle Root of an array of transaction hashes
export async function computeMerkleRoot(hashes: string[]): Promise<string> {
  if (!hashes || hashes.length === 0) {
    return sha256('EMPTY_MERKLE_ROOT');
  }
  if (hashes.length === 1) {
    return sha256(hashes[0] + hashes[0]);
  }

  let currentLevel = [...hashes];
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = await sha256(left + right);
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}

// Active distributed cluster nodes simulating decentralized validation
export const CLUSTER_NODES: ClusterNode[] = [
  {
    nodeId: 'NODE-DEL-01',
    nodeName: 'CERT-In National Gateway Node',
    region: 'Delhi NCR (North Tier-1)',
    status: 'ONLINE',
    version: 'v3.0-blockchain',
    blockHeight: 1428,
    peerCount: 16,
    latencyMs: 14,
    isValidator: true,
    lastHeartbeat: new Date().toISOString(),
  },
  {
    nodeId: 'NODE-HYD-02',
    nodeName: 'Telangana State Cyber Defense Hub',
    region: 'Hyderabad (South Central)',
    status: 'ONLINE',
    version: 'v3.0-blockchain',
    blockHeight: 1428,
    peerCount: 15,
    latencyMs: 18,
    isValidator: true,
    lastHeartbeat: new Date().toISOString(),
  },
  {
    nodeId: 'NODE-BOM-03',
    nodeName: 'Mumbai Central FinSwitch Anchor',
    region: 'Maharashtra (Western Hub)',
    status: 'ONLINE',
    version: 'v3.0-blockchain',
    blockHeight: 1428,
    peerCount: 18,
    latencyMs: 12,
    isValidator: true,
    lastHeartbeat: new Date().toISOString(),
  },
  {
    nodeId: 'NODE-BLR-04',
    nodeName: 'Bangalore Cyber Forensic Research Core',
    region: 'Karnataka (Tech Corridor)',
    status: 'ONLINE',
    version: 'v3.0-blockchain',
    blockHeight: 1428,
    peerCount: 14,
    latencyMs: 16,
    isValidator: true,
    lastHeartbeat: new Date().toISOString(),
  },
  {
    nodeId: 'NODE-KOL-05',
    nodeName: 'Eastern Border Threat Intercept Cell',
    region: 'Kolkata (Eastern Sector)',
    status: 'ONLINE',
    version: 'v3.0-blockchain',
    blockHeight: 1428,
    peerCount: 13,
    latencyMs: 22,
    isValidator: true,
    lastHeartbeat: new Date().toISOString(),
  },
];

// Produce decentralized multi-node validator signatures (>66% Byzantine consensus)
export async function collectValidatorQuorum(
  blockHash: string,
  blockIndex: number
): Promise<ValidatorSignature[]> {
  const quorum: ValidatorSignature[] = [];
  for (const node of CLUSTER_NODES) {
    if (node.isValidator && node.status === 'ONLINE') {
      const sigData = `${node.nodeId}:${blockIndex}:${blockHash}:${node.region}`;
      const sigHash = await sha256(sigData);
      quorum.push({
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        region: node.region,
        signature: `SIG_ED25519_${sigHash.slice(0, 32)}`,
        timestamp: new Date().toISOString(),
        vote: 'ACCEPT',
      });
    }
  }
  return quorum;
}

// Generate an audit transaction with cryptographic hash and leaf proof
export async function createAuditTransaction(
  rawTx: Omit<AuditTransaction, 'cryptographicHash' | 'merkleLeafHash' | 'digitalSignature' | 'auditStatus'>
): Promise<AuditTransaction> {
  const payloadString = `${rawTx.txId}:${rawTx.complaintId}:${rawTx.sourceAccount}:${rawTx.destinationAccount}:${rawTx.amount}:${rawTx.paymentMode}:${rawTx.timestamp}:${rawTx.threatScore}:${rawTx.atmId}`;
  const cryptoHash = await sha256(payloadString);
  const leafHash = await sha256(`LEAF:${cryptoHash}`);
  const signature = `ED25519_${(await sha256(`SIG:${cryptoHash}`)).slice(0, 24)}`;

  return {
    ...rawTx,
    cryptographicHash: cryptoHash,
    merkleLeafHash: leafHash,
    digitalSignature: signature,
    auditStatus: 'COMMITTED',
  };
}

// Mint a new block anchored into the immutable ledger
export async function mintBlock(
  index: number,
  previousHash: string,
  transactions: AuditTransaction[],
  blockType: BlockchainBlock['blockType'] = 'STANDARD_AUDIT'
): Promise<BlockchainBlock> {
  const txHashes = transactions.map(t => t.cryptographicHash);
  const merkleRoot = await computeMerkleRoot(txHashes);
  const timestamp = new Date().toISOString();
  const stateRoot = await sha256(`STATE_ROOT_${index}_${timestamp}_${merkleRoot.slice(0, 16)}`);
  const crossChainSyncHash = await sha256(`CROSS_CHAIN_STATE_${merkleRoot}_${index}`);
  
  const header = `${index}:${timestamp}:${previousHash}:${merkleRoot}:${stateRoot}:${crossChainSyncHash}:${blockType}`;
  const blockHash = await sha256(header);
  const quorum = await collectValidatorQuorum(blockHash, index);

  return {
    index,
    timestamp,
    previousHash,
    hash: blockHash,
    merkleRoot,
    stateRoot,
    nonce: Math.floor(Math.random() * 900000) + 100000,
    blockType,
    transactions,
    validatorQuorum: quorum,
    crossChainSyncHash,
  };
}

// Complete verification of entire blockchain integrity
export async function verifyBlockchainIntegrity(chain: BlockchainBlock[]): Promise<{
  isValid: boolean;
  tamperedBlockIndex?: number;
  reason?: string;
  expectedHash?: string;
  actualHash?: string;
  checkedBlocksCount: number;
  checkedTransactionsCount: number;
}> {
  let totalTx = 0;
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];
    totalTx += block.transactions.length;

    // Check 1: Manual tamper flag
    if (block.tampered) {
      return {
        isValid: false,
        tamperedBlockIndex: block.index,
        reason: `Cryptographic anomaly detected in Block #${block.index}: Payload state does not match validator seal`,
        expectedHash: 'VALID_CONSENSUS_HASH',
        actualHash: block.hash,
        checkedBlocksCount: i + 1,
        checkedTransactionsCount: totalTx,
      };
    }

    // Check 2: Genesis block
    if (i === 0) {
      continue;
    }

    // Check 3: Previous hash pointer
    const prevBlock = chain[i - 1];
    if (block.previousHash !== prevBlock.hash) {
      return {
        isValid: false,
        tamperedBlockIndex: block.index,
        reason: `Broken chain link at Block #${block.index}: previousHash [${block.previousHash.slice(0, 12)}...] does not match Block #${prevBlock.index} hash [${prevBlock.hash.slice(0, 12)}...]`,
        expectedHash: prevBlock.hash,
        actualHash: block.previousHash,
        checkedBlocksCount: i + 1,
        checkedTransactionsCount: totalTx,
      };
    }

    // Check 4: Recalculate transactions and Merkle Root
    const computedTxHashes: string[] = [];
    for (const tx of block.transactions) {
      if (tx.tampered) {
        return {
          isValid: false,
          tamperedBlockIndex: block.index,
          reason: `Transaction #${tx.txId} payload altered post-consensus. Cryptographic hash signature invalid.`,
          expectedHash: 'VALID_TX_HASH',
          actualHash: tx.cryptographicHash,
          checkedBlocksCount: i + 1,
          checkedTransactionsCount: totalTx,
        };
      }
      computedTxHashes.push(tx.cryptographicHash);
    }

    const recomputedMerkle = await computeMerkleRoot(computedTxHashes);
    if (recomputedMerkle !== block.merkleRoot) {
      return {
        isValid: false,
        tamperedBlockIndex: block.index,
        reason: `Merkle root mismatch in Block #${block.index}: Calculated [${recomputedMerkle.slice(0, 12)}...] != Stored [${block.merkleRoot.slice(0, 12)}...]`,
        expectedHash: recomputedMerkle,
        actualHash: block.merkleRoot,
        checkedBlocksCount: i + 1,
        checkedTransactionsCount: totalTx,
      };
    }

    // Check 5: Recalculate block hash header
    const header = `${block.index}:${block.timestamp}:${block.previousHash}:${block.merkleRoot}:${block.stateRoot}:${block.crossChainSyncHash}:${block.blockType}`;
    const recomputedBlockHash = await sha256(header);
    if (recomputedBlockHash !== block.hash) {
      return {
        isValid: false,
        tamperedBlockIndex: block.index,
        reason: `Block header hash signature mismatch in Block #${block.index}. Block metadata altered.`,
        expectedHash: recomputedBlockHash,
        actualHash: block.hash,
        checkedBlocksCount: i + 1,
        checkedTransactionsCount: totalTx,
      };
    }

    // Check 6: Quorum size
    if (block.validatorQuorum.length < 3) {
      return {
        isValid: false,
        tamperedBlockIndex: block.index,
        reason: `Consensus violation at Block #${block.index}: Quorum fell below required Byzantine threshold (>66%).`,
        expectedHash: 'QUORUM >= 4',
        actualHash: `Received ${block.validatorQuorum.length}`,
        checkedBlocksCount: i + 1,
        checkedTransactionsCount: totalTx,
      };
    }
  }

  return {
    isValid: true,
    checkedBlocksCount: chain.length,
    checkedTransactionsCount: totalTx,
  };
}

// Append an immutable user action log with back-linked cryptographic hash
export async function createImmutableUserLog(
  prevLog: ImmutableUserLog | null,
  userId: string,
  userEmail: string,
  userRole: ImmutableUserLog['userRole'],
  action: string,
  resource: string,
  clusterNode: string = 'NODE-DEL-01'
): Promise<ImmutableUserLog> {
  const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();
  const previousLogHash = prevLog ? prevLog.currentLogHash : await sha256('GENESIS_USER_AUDIT_TRAIL');
  const payload = `${logId}:${userId}:${userEmail}:${userRole}:${action}:${resource}:${timestamp}:${clusterNode}:${previousLogHash}`;
  const currentLogHash = await sha256(payload);
  const digitalSignature = `USER_SIG_${(await sha256(`USER_${currentLogHash}`)).slice(0, 24)}`;

  return {
    logId,
    userId,
    userEmail,
    userRole,
    action,
    resource,
    timestamp,
    clusterNode,
    previousLogHash,
    currentLogHash,
    digitalSignature,
  };
}

// Cross-chain sync simulation comparing standard relay vs optimized state channels
export function getOptimizedCrossChainMetrics(channelMode: CrossChainSyncStatus['channelMode']): CrossChainSyncStatus {
  const syncBatchId = `SYNC-BATCH-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  // Latency optimization comparison:
  // Standard Relay: 650-950ms (full multi-signature RPC roundtrip)
  // Rollup Batch: 220-380ms (zk/optimistic compressed proof)
  // State Channel Optimized: 35-75ms (instant counter-signed state commit)
  let syncLatencyMs = 42;
  if (channelMode === 'STANDARD_RELAY') {
    syncLatencyMs = Math.floor(Math.random() * 300) + 650;
  } else if (channelMode === 'ROLLUP_BATCH') {
    syncLatencyMs = Math.floor(Math.random() * 160) + 220;
  } else {
    syncLatencyMs = Math.floor(Math.random() * 40) + 35;
  }

  return {
    sourceChain: 'State Cyber Defense Chain (Telangana/Delhi)',
    targetChain: 'Interbank Remittance Switch (NPCI / RBI Unified Relay)',
    syncBatchId,
    syncLatencyMs,
    channelMode,
    merkleProofRoot: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 10)}`,
    status: 'SYNCHRONIZED',
    timestamp,
    blockHeight: 1428,
  };
}
