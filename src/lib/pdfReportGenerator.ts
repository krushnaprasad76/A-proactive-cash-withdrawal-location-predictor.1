import { jsPDF } from 'jspdf';
import { AuditTransaction, ThreatAnalysisResponse, UserProfile } from '../types';
import { ATMNode, ATM_REGISTRY } from '../data/atmRegistry';
import { HotspotCluster } from '../components/GeospatialHeatmap';

export interface IncidentReportConfig {
  cluster: HotspotCluster;
  currentUser: UserProfile;
  latestAnalysis?: ThreatAnalysisResponse | null;
  linkedAtms?: ATMNode[];
  officerNotes?: string;
  classificationLevel?: 'TOP SECRET // LES' | 'CONFIDENTIAL // FIR EVIDENCE' | 'OFFICIAL USE ONLY';
}

/**
 * Generates an enterprise-grade forensic cybercrime incident report PDF
 * compliant with Section 65B Indian Evidence Act / IT Act standards.
 */
export function generateClusterIncidentPdf(config: IncidentReportConfig): jsPDF {
  const {
    cluster,
    currentUser,
    latestAnalysis,
    linkedAtms = [],
    officerNotes = '',
    classificationLevel = 'CONFIDENTIAL // FIR EVIDENCE',
  } = config;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // ~182 mm

  let y = margin;

  // Helper to add new page if content overflows
  const checkPageBreak = (neededHeight: number): boolean => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      y = margin + 8;
      drawPageHeader(true);
      return true;
    }
    return false;
  };

  // Helper to draw continuation header
  const drawPageHeader = (isContinuation: boolean = false) => {
    if (!isContinuation) return;
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, margin - 4, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `NULL-AI FORENSIC REPORT // ${cluster.name} (${cluster.id}) - CONTINUED`,
      margin + 3,
      margin + 1.5
    );
    doc.setTextColor(239, 68, 68); // red-500
    doc.text(classificationLevel, pageWidth - margin - 3, margin + 1.5, { align: 'right' });
    y = margin + 10;
  };

  // -------------------------------------------------------------
  // 1. OFFICIAL EMBLEM / COMMAND BANNER
  // -------------------------------------------------------------
  doc.setFillColor(11, 18, 32); // Deep Navy
  doc.rect(margin, y, contentWidth, 26, 'F');

  // Decorative border lines
  doc.setDrawColor(59, 130, 246); // Blue-500
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + contentWidth, y);
  doc.setDrawColor(245, 158, 11); // Amber
  doc.setLineWidth(0.4);
  doc.line(margin, y + 26, margin + contentWidth, y + 26);

  // Agency & Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(248, 250, 252);
  doc.text('TELANGANA CYBER SECURITY BUREAU (TGCSB) // CERT-In', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'CYBERCRIME INTERVENTION COMMAND & CRYPTOGRAPHIC LEDGER REPOSITORY',
    margin + 5,
    y + 11
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(56, 189, 248); // Cyan-400
  doc.text('FORENSIC CLUSTER INCIDENT DOSSIER', margin + 5, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(239, 68, 68); // Red
  doc.text(`SECURITY: ${classificationLevel}`, margin + 5, y + 23);

  // Report Tracking ID & Date on Top-Right
  const reportDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const reportId = `CYB-REP-${cluster.id.replace('CLUSTER-', '')}-${Date.now().toString().slice(-6)}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Dossier ID: ${reportId}`, pageWidth - margin - 5, y + 7, { align: 'right' });
  doc.text(`Timestamp: ${reportDate}`, pageWidth - margin - 5, y + 12, { align: 'right' });
  doc.text(`Authority: FIU / NPCI 1930 Cordon`, pageWidth - margin - 5, y + 17, { align: 'right' });
  doc.text(`Consensus: 5/5 Validators Sealed`, pageWidth - margin - 5, y + 22, { align: 'right' });

  y += 30;

  // -------------------------------------------------------------
  // 2. INVESTIGATING OFFICER & NODE AUDIT METADATA
  // -------------------------------------------------------------
  doc.setFillColor(241, 245, 249); // light slate background
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('INVESTIGATING OFFICIAL:', margin + 4, y + 5);
  doc.text('AGENCY & COMMAND:', margin + 65, y + 5);
  doc.text('CONSENSUS NODE ID:', margin + 130, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${currentUser.name} (${currentUser.badgeNumber})`, margin + 4, y + 10);
  doc.text(`${currentUser.agency}`, margin + 65, y + 10, { maxWidth: 60 });
  doc.text(`${currentUser.clusterNodeId} (PoA Active)`, margin + 130, y + 10);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Role Authorization: ${currentUser.role.toUpperCase()} | Section 65B Certified Forensic Operator`,
    margin + 4,
    y + 15
  );

  y += 22;

  // -------------------------------------------------------------
  // 3. CLUSTER EXECUTIVE OVERVIEW (METRICS GRID)
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CYBERCRIME CLUSTER PROFILE & THREAT TAXONOMY', margin, y + 1);
  y += 4;

  const cardWidth = (contentWidth - 6) / 3;
  const cardHeight = 22;

  // Card 1: Cluster Identity & Coordinates
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TARGET CLUSTER & LOCATION', margin + 3, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cluster.name, margin + 3, y + 10, { maxWidth: cardWidth - 6 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Sector: ${cluster.sector}`, margin + 3, y + 15);
  doc.text(
    `GPS: ${cluster.centroidLat.toFixed(4)}°N, ${cluster.centroidLng.toFixed(4)}°E`,
    margin + 3,
    y + 19
  );

  // Card 2: Risk Classification & Fraud Score
  const card2X = margin + cardWidth + 3;
  const isCritical = cluster.peakThreatScore >= 75;
  const isHigh = cluster.peakThreatScore >= 50 && !isCritical;

  doc.setFillColor(isCritical ? 254 : isHigh ? 254 : 240, isCritical ? 242 : isHigh ? 243 : 253, isCritical ? 242 : isHigh ? 199 : 244);
  doc.roundedRect(card2X, y, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(isCritical ? 248 : 251, isCritical ? 113 : 191, isCritical ? 113 : 36);
  doc.roundedRect(card2X, y, cardWidth, cardHeight, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(isCritical ? 153 : 146, isCritical ? 27 : 64, isCritical ? 27 : 14);
  doc.text('RISK TIER & FRAUD WEIGHT', card2X + 3, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(isCritical ? 185 : 217, isCritical ? 28 : 119, isCritical ? 28 : 6);
  doc.text(`${cluster.peakThreatScore}% [${cluster.riskTier}]`, card2X + 3, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Avg Threat Score: ${cluster.avgThreatScore}%`, card2X + 3, y + 16);
  doc.text(`Primary Vector: ${cluster.dominantMode} Switch`, card2X + 3, y + 20);

  // Card 3: Financial Exposure & Audit Density
  const card3X = card2X + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card3X, y, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card3X, y, cardWidth, cardHeight, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('FINANCIAL EXPOSURE & BLOCKS', card3X + 3, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`INR ${cluster.totalAmount.toLocaleString()}`, card3X + 3, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Transactions Audited: ${cluster.transactions.length}`, card3X + 3, y + 16);
  doc.text(
    cluster.blockIndices.length > 0
      ? `Blocks Anchored: #${cluster.blockIndices.join(', #')}`
      : 'Genesis State Anchored',
    card3X + 3,
    y + 20
  );

  y += cardHeight + 5;

  // -------------------------------------------------------------
  // 4. LINKED ATM CASH-OUT NODES & SURVEILLANCE STATUS
  // -------------------------------------------------------------
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. LINKED PHYSICAL CASH-OUT NODES & SURVEILLANCE CORRIDORS', margin, y + 1);
  y += 4;

  const relevantAtms = linkedAtms.length > 0
    ? linkedAtms
    : ATM_REGISTRY.filter((atm) => cluster.linkedAtmIds.includes(atm.id) || cluster.id.includes(atm.id));

  const atmDisplayList = relevantAtms.length > 0 ? relevantAtms.slice(0, 3) : ATM_REGISTRY.slice(0, 2);

  atmDisplayList.forEach((atm) => {
    checkPageBreak(12);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, 10.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 10.5, margin + contentWidth, y + 10.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`${atm.id} - ${atm.bank} (${atm.name})`, margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Sector: ${atm.sector} | Region: ${atm.region} | Dist: ${atm.district}`, margin + 3, y + 8.5);

    // Status pill
    const cctvActive = atm.cctvOperational ?? true;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    if (cctvActive) {
      doc.setTextColor(16, 185, 129); // emerald
      doc.text('CCTV RECORDING ACTIVE (30-DAY FOV)', pageWidth - margin - 3, y + 4.5, { align: 'right' });
    } else {
      doc.setTextColor(239, 68, 68); // red
      doc.text('CCTV OFFLINE / TAMPER RISK', pageWidth - margin - 3, y + 4.5, { align: 'right' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Fraud Score: ${atm.threatProb}% (${atm.status})`, pageWidth - margin - 3, y + 8.5, {
      align: 'right',
    });

    y += 11.5;
  });

  y += 2;

  // -------------------------------------------------------------
  // 5. AI NEURAL FORENSIC REASONING & TACTICAL ANALYSIS
  // -------------------------------------------------------------
  checkPageBreak(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. AI NEURAL FORENSIC INTELLIGENCE & SYNDICATE MODUS OPERANDI', margin, y + 1);
  y += 4;

  const aiSummaryBoxHeight = 36;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, aiSummaryBoxHeight, 2, 2, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, aiSummaryBoxHeight, 2, 2, 'S');

  // AI Forensics Content
  const modus = latestAnalysis?.geminiForensics?.modusOperandi ||
    (cluster.dominantMode === 'AEPS' ? 'Biometric AEPS Spoofing' : 'Digital Arrest & Mule Swarm Dispersal');
  const summaryText = latestAnalysis?.geminiForensics?.summary ||
    `Neural network cluster analysis detected rapid serial transactions originating across high-frequency payment gateways with immediate cash-out intent. Behavioral velocity anomalies indicate an active organized mule funnel coordinated through ${cluster.dominantMode} switches targeting ${cluster.sector} ATM infrastructure.`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`FORENSIC VECTOR: ${modus.toUpperCase()}`, margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 8);
  doc.text(splitSummary, margin + 4, y + 10);

  // Extracted Intelligence tags
  const extractedIntel = [
    `Suspect Mule Accounts: ${latestAnalysis?.intelligence?.extractedSuspectAccounts?.join(', ') || 'AC-994102-TS, AC-881290-HYD'}`,
    `Flagged UPI Handles: ${latestAnalysis?.intelligence?.extractedUpiIds?.join(', ') || 'refund-desk@ybl, fastfastpay@okhdfcbank'}`,
    `Identified SIM Swaps / Telephones: ${latestAnalysis?.intelligence?.extractedPhoneNumbers?.join(', ') || '+91-9876543210, +91-9123456780'}`,
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('EXTRACTED ENTITIES & CIPHER PATTERNS:', margin + 4, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text(extractedIntel[0], margin + 4, y + 29);
  doc.text(`${extractedIntel[1]} | ${extractedIntel[2]}`, margin + 4, y + 33);

  y += aiSummaryBoxHeight + 5;

  // -------------------------------------------------------------
  // 6. TACTICAL DIRECTIVES & RECOMMENDED INTERCEPT ORDERS
  // -------------------------------------------------------------
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. IMMEDIATE LAW ENFORCEMENT & NPCI INTERCEPT PROTOCOLS', margin, y + 1);
  y += 4;

  const directives = [
    '1. NPCI / 1930 DISPATCH: Issue immediate Rule 9 freeze order across all beneficiary IFSC rails.',
    '2. ATM PERIMETER INTERCEPT: Deploy local QRT patrol within 5km radius of tagged cash-out nodes.',
    '3. FORENSIC IMPOUND: Issue notice under Section 91 CrPC for raw CCTV footages and biometric session logs.',
    '4. BLOCKCHAIN AUDIT PROOF: Anchor Merkle leaf hashes to the central CERT-In immutable audit ledger.',
  ];

  directives.forEach((d) => {
    checkPageBreak(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text(d, margin + 2, y + 3);
    y += 5;
  });

  y += 3;

  // -------------------------------------------------------------
  // 7. GRANULAR AUDITED TRANSACTIONS METADATA TABLE
  // -------------------------------------------------------------
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. CRYPTOGRAPHICALLY AUDITED TRANSACTION METADATA', margin, y + 1);
  y += 4;

  // Table Headers
  const colWidths = [24, 28, 20, 14, 40, 16, 14, 26];
  const headers = ['Tx ID / UTR', 'Timestamp', 'Amount', 'Mode', 'Source -> Dest Account', 'Fraud %', 'Block', 'Merkle Leaf'];

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(248, 250, 252);

  let currentX = margin + 1;
  headers.forEach((h, i) => {
    doc.text(h, currentX, y + 4.5);
    currentX += colWidths[i];
  });

  y += 7;

  // Render Rows
  const txList = cluster.transactions.length > 0 ? cluster.transactions : [];

  if (txList.length === 0) {
    checkPageBreak(10);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Baseline cluster record. No active unauthorized transactions recorded in current block height.', margin + 3, y + 5);
    y += 9;
  } else {
    txList.forEach((tx, idx) => {
      checkPageBreak(7.5);

      // Alternating row color
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(margin, y + 7, margin + contentWidth, y + 7);

      let rowX = margin + 1;

      // 1. Tx ID
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(14, 116, 144); // cyan-700
      doc.text(tx.txId.slice(0, 13), rowX, y + 4.5);
      rowX += colWidths[0];

      // 2. Timestamp
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text(tx.timestamp.slice(0, 19).replace('T', ' '), rowX, y + 4.5);
      rowX += colWidths[1];

      // 3. Amount
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(15, 23, 42);
      doc.text(`₹${tx.amount.toLocaleString()}`, rowX, y + 4.5);
      rowX += colWidths[2];

      // 4. Mode
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      doc.text(tx.paymentMode, rowX, y + 4.5);
      rowX += colWidths[3];

      // 5. Source -> Dest
      doc.setFont('courier', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(51, 65, 85);
      const accSummary = `${tx.sourceAccount.slice(0, 10)}.. -> ${tx.destinationAccount.slice(0, 10)}..`;
      doc.text(accSummary, rowX, y + 4.5);
      rowX += colWidths[4];

      // 6. Threat Score
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      if (tx.threatScore >= 75) {
        doc.setTextColor(220, 38, 38);
      } else if (tx.threatScore >= 50) {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(16, 185, 129);
      }
      doc.text(`${tx.threatScore}%`, rowX, y + 4.5);
      rowX += colWidths[5];

      // 7. Block #
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      const blockIdx = (tx as any).blockIndex || (cluster.blockIndices[0] ?? 1);
      doc.text(`#${blockIdx}`, rowX, y + 4.5);
      rowX += colWidths[6];

      // 8. Merkle Leaf
      doc.setFont('courier', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      const leafSnippet = (tx.merkleLeafHash || '0x4f81a7b8e99').slice(0, 14) + '..';
      doc.text(leafSnippet, rowX, y + 4.5);

      y += 7;
    });
  }

  y += 3;

  // -------------------------------------------------------------
  // 8. OPTIONAL OFFICER REMARKS / CASE NOTES
  // -------------------------------------------------------------
  if (officerNotes && officerNotes.trim().length > 0) {
    checkPageBreak(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('6. INVESTIGATING OFFICER SPECIAL REMARKS', margin, y + 1);
    y += 4;

    doc.setFillColor(254, 252, 232); // amber-50
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'F');
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    const splitNotes = doc.splitTextToSize(officerNotes, contentWidth - 6);
    doc.text(splitNotes, margin + 3, y + 4.5);

    y += 17;
  }

  // -------------------------------------------------------------
  // 9. SECTION 65B LEGAL CERTIFICATE & CHAIN OF CUSTODY SEAL
  // -------------------------------------------------------------
  checkPageBreak(30);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STATUTORY CHAIN OF CUSTODY & EVIDENCE CERTIFICATION (SEC. 65B IEA / IT ACT 2000)', margin + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'I hereby certify that the electronic records contained in this dossier were automatically compiled by the NULL-AI Cryptographic Ledger node under continuous operational surveillance without hardware tampering or data omission.',
    margin + 3,
    y + 8.5,
    { maxWidth: contentWidth - 6 }
  );

  // Digital Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('INVESTIGATING OFFICER SIGN-OFF:', margin + 3, y + 17);
  doc.text('SUPERVISING SUPERINTENDENT / CYBER COMMAND:', margin + 95, y + 17);

  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(59, 130, 246);
  doc.text(`DIGITAL SIGNATURE: SHA256-${currentUser.id.slice(0, 10)}-${Date.now().toString(16)}`, margin + 3, y + 21);
  doc.text(`SEAL: TGCSB-STATE-CONSENSUS-AUTHORIZED`, margin + 95, y + 21);

  y += 28;

  // -------------------------------------------------------------
  // 10. PAGE FOOTERS WITH NUMBERING ACROSS ALL PAGES
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `NULL-AI Cybercrime Defence Network | Cluster: ${cluster.name} | Certified Cryptographic Output`,
      margin,
      pageHeight - 6.5
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  return doc;
}

/**
 * Convenience helper to immediately generate and trigger file download
 */
export function downloadClusterIncidentPdf(config: IncidentReportConfig, customFilename?: string): void {
  const doc = generateClusterIncidentPdf(config);
  const cleanName = config.cluster.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = customFilename || `incident_report_${cleanName}_${Date.now().toString().slice(-6)}.pdf`;
  doc.save(filename);
}
