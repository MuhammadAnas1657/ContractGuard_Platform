import { jsPDF } from 'jspdf';
import { ArchitectureDocument, ArchitecturePack } from '../types/security';
import { createZipArchive, ZipEntry } from './zip-builder';
import { createWordDocument } from './docx-builder';
import { downloadBlob } from '../utils';

// Re-export downloadBlob for backwards compatibility across existing imports
export { downloadBlob };

export function generateArchitectureMarkdown(doc: ArchitectureDocument): string {
  const lines: string[] = [];

  lines.push(`# ${doc.title}`);
  lines.push(`> **${doc.subtitle}**`);
  lines.push('');
  lines.push(`- **Target Policy:** ${doc.policy_title} (v${doc.policy_version})`);
  lines.push(`- **Deployment Topology:** ${doc.deployment_label}`);
  lines.push(`- **Cryptographic Hash:** \`${doc.integrity_hash}\``);
  lines.push(`- **Generated Date:** ${doc.date}`);
  lines.push(`- **Author:** ${doc.author}`);
  if (doc.environment_notes) {
    lines.push(`- **Environment Notes:** ${doc.environment_notes}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Table of Contents');
  doc.sections.forEach((s) => {
    lines.push(`${s.number}. [${s.title}](#section-${s.number}-${s.id})`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');

  doc.sections.forEach((s) => {
    lines.push(`## Section ${s.number}: ${s.title} {#section-${s.number}-${s.id}}`);
    lines.push('');
    lines.push(`*${s.summary}*`);
    lines.push('');
    s.content.forEach((paragraph) => {
      lines.push(paragraph);
      lines.push('');
    });

    if (s.codeSnippets && s.codeSnippets.length > 0) {
      lines.push('### Implementation Snippets');
      lines.push('');
      s.codeSnippets.forEach((snippet) => {
        lines.push(`#### \`${snippet.filename}\``);
        if (snippet.description) {
          lines.push(`*${snippet.description}*`);
        }
        lines.push('');

        // Dynamic fence escaping: if code contains ```, use longer fence (e.g. ````)
        let fence = '```';
        while (snippet.code.includes(fence)) {
          fence += '`';
        }

        lines.push(fence + snippet.language);
        lines.push(snippet.code);
        lines.push(fence);
        lines.push('');
      });
    }

    if (s.checklistItems && s.checklistItems.length > 0) {
      lines.push('### Operational Verification Checklist');
      lines.push('');
      lines.push('| Status | Verification Item | Compliance Requirement |');
      lines.push('| :---: | :--- | :--- |');
      s.checklistItems.forEach((item) => {
        lines.push(
          `| ${item.checked ? '[x]' : '[ ]'} | ${item.label} | ${item.note || 'Required control'} |`
        );
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

export function generateArchitecturePdf(doc: ArchitectureDocument): jsPDF {
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  const brandEmerald: [number, number, number] = [16, 185, 129];
  const brandDark: [number, number, number] = [11, 16, 32];
  const textPrimary: [number, number, number] = [15, 23, 42];
  const textMuted: [number, number, number] = [100, 116, 139];

  // Helper: page background & header/footer
  function applyHeaderFooter(pageNum: number, totalPagesPlaceholder = 'Page ') {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

    // Running header (pages > 1)
    if (pageNum > 1) {
      pdf.text('ContractGuard Platform · Security Architecture Pack', margin, 30);
      pdf.text(doc.integrity_hash.slice(0, 24) + '...', pageWidth - margin, 30, { align: 'right' });
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 35, pageWidth - margin, 35);
    }

    // Running footer
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);
    pdf.text(
      `Confidential & Verifiable · Generated ${doc.date}`,
      margin,
      pageHeight - 22
    );
    pdf.text(`${totalPagesPlaceholder}${pageNum}`, pageWidth - margin, pageHeight - 22, {
      align: 'right',
    });
  }

  // ================= COVER PAGE =================
  pdf.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative grid / accents
  pdf.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  pdf.rect(margin, 60, 4, 70, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  pdf.text('CONTRACTGUARD SECURITY PLATFORM', margin + 14, 75);

  pdf.setFontSize(24);
  pdf.setTextColor(255, 255, 255);
  pdf.text(doc.title, margin + 14, 105);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(203, 213, 225);
  pdf.text(doc.subtitle, margin + 14, 126);

  // Metadata Card
  pdf.setFillColor(20, 27, 48);
  pdf.roundedRect(margin, 170, contentWidth, 230, 8, 8, 'F');
  pdf.setDrawColor(40, 52, 85);
  pdf.setLineWidth(1);
  pdf.roundedRect(margin, 170, contentWidth, 230, 8, 8, 'S');

  const metaRows = [
    ['Target Agent Policy:', `${doc.policy_title} (v${doc.policy_version})`],
    ['Deployment Topology:', doc.deployment_label],
    ['Interception Hierarchy:', '3-Stage Reference Monitor (Boundary, Deterministic, Semantic)'],
    ['Cryptographic Hash:', doc.integrity_hash],
    ['Document Generation Date:', doc.date],
    ['Author / Security Lead:', doc.author],
    ['Environment Context:', doc.environment_notes || 'Production Cluster / Default VPC'],
  ];

  let metaY = 205;
  metaRows.forEach(([lbl, val]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    pdf.text(lbl, margin + 20, metaY);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(241, 245, 249);
    pdf.text(val, margin + 175, metaY);
    metaY += 28;
  });

  // Table of Contents Box Outline on Cover (rows will be drawn with links after page tracking)
  pdf.setFillColor(20, 27, 48);
  pdf.roundedRect(margin, 420, contentWidth, 340, 8, 8, 'F');
  pdf.setDrawColor(40, 52, 85);
  pdf.roundedRect(margin, 420, contentWidth, 340, 8, 8, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  pdf.text('TABLE OF CONTENTS (10 SECTIONS)', margin + 20, 445);

  // ================= SECTIONS RENDERING & PAGE TRACKING =================
  let currentPage = 1;
  const sectionPageMap: Record<number, number> = {};

  doc.sections.forEach((sec) => {
    pdf.addPage();
    currentPage += 1;
    sectionPageMap[sec.number] = currentPage;
    applyHeaderFooter(currentPage);

    let y = 60;

    // Section Header
    pdf.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    pdf.rect(margin, y, 3, 30, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    pdf.text(`SECTION ${sec.number}`, margin + 10, y + 10);

    pdf.setFontSize(16);
    pdf.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
    pdf.text(sec.title, margin + 10, y + 26);

    y += 45;

    // Summary box
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(margin, y, contentWidth, 30, 4, 4, 'F');
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    pdf.text(`Summary: ${sec.summary}`, margin + 12, y + 19);

    y += 44;

    // Paragraphs
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);

    sec.content.forEach((para) => {
      const splitText = pdf.splitTextToSize(para, contentWidth);
      if (y + splitText.length * 13 > pageHeight - 50) {
        pdf.addPage();
        currentPage += 1;
        applyHeaderFooter(currentPage);
        y = 60;
      }
      pdf.text(splitText, margin, y);
      y += splitText.length * 13 + 10;
    });

    // Code Snippets
    if (sec.codeSnippets && sec.codeSnippets.length > 0) {
      sec.codeSnippets.forEach((snippet) => {
        if (y + 120 > pageHeight - 50) {
          pdf.addPage();
          currentPage += 1;
          applyHeaderFooter(currentPage);
          y = 60;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
        pdf.text(`Snippet: ${snippet.filename} (${snippet.language})`, margin, y);
        y += 12;

        const codeLines = pdf.splitTextToSize(snippet.code, contentWidth - 20);
        const boxHeight = Math.min(codeLines.length * 11 + 16, 250);

        pdf.setFillColor(15, 23, 42);
        pdf.roundedRect(margin, y, contentWidth, boxHeight, 4, 4, 'F');

        pdf.setFont('courier', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(248, 250, 252);
        pdf.text(codeLines.slice(0, 20), margin + 10, y + 16);

        y += boxHeight + 16;
      });
    }

    // Checklists
    if (sec.checklistItems && sec.checklistItems.length > 0) {
      if (y + 100 > pageHeight - 50) {
        pdf.addPage();
        currentPage += 1;
        applyHeaderFooter(currentPage);
        y = 60;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
      pdf.text('Operational Verification Matrix', margin, y);
      y += 12;

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, contentWidth, sec.checklistItems.length * 20 + 20, 4, 4, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, sec.checklistItems.length * 20 + 20, 4, 4, 'S');

      let checkY = y + 16;
      sec.checklistItems.forEach((item) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(
          item.checked ? brandEmerald[0] : 148,
          item.checked ? brandEmerald[1] : 163,
          item.checked ? brandEmerald[2] : 184
        );
        pdf.text(item.checked ? '[X]' : '[ ]', margin + 12, checkY);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        pdf.text(item.label, margin + 36, checkY);

        pdf.setFontSize(8);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        pdf.text(item.note || 'Mandatory', pageWidth - margin - 110, checkY);

        checkY += 20;
      });

      y += sec.checklistItems.length * 20 + 35;
    }
  });

  // ================= RETURN TO COVER PAGE TO RENDER CLICKABLE TOC =================
  pdf.setPage(1);

  let tocY = 472;
  doc.sections.forEach((s) => {
    const targetPage = sectionPageMap[s.number] || 2;

    // Section title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(241, 245, 249);
    pdf.text(`Section ${s.number}:  ${s.title}`, margin + 20, tocY);

    // Summary snippet
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text(`· ${s.summary.slice(0, 48)}...`, margin + 225, tocY);

    // Target page number
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    pdf.text(`p. ${targetPage}`, pageWidth - margin - 25, tocY, { align: 'right' });

    // Clickable link over the entire row targeting the actual page
    pdf.link(margin + 16, tocY - 12, contentWidth - 32, 20, {
      pageNumber: targetPage,
    });

    tocY += 28;
  });

  // Bookmarks / Outlines if supported
  if ((pdf as any).outline) {
    try {
      const outline = (pdf as any).outline;
      outline.add(null, 'Cover Page', { pageNumber: 1 });
      doc.sections.forEach((s) => {
        const p = sectionPageMap[s.number] || 2;
        outline.add(null, `Section ${s.number}: ${s.title}`, { pageNumber: p });
      });
    } catch {
      // Outline is optional in some jsPDF builds
    }
  }

  return pdf;
}

export function generateArchitectureBundleZip(
  pack: ArchitecturePack,
  yamlSpec: string
): Blob {
  const doc = pack.document;
  const mdContent = generateArchitectureMarkdown(doc);

  const tailoredEnv = `# =====================================================================
# Tailored Runtime Environment for ContractGuard
# Deployment Topology: ${pack.deployment_label}
# Target Policy: ${pack.policy_title} (v${pack.version})
# Policy SHA-256: ${pack.integrity_hash}
# =====================================================================

# Policy Configuration
CONTRACTGUARD_POLICY_PATH="./contracts.yaml"
CONTRACTGUARD_POLICY_HASH="${pack.integrity_hash}"
CONTRACTGUARD_DEPLOYMENT_MODE="${pack.deployment_style}"
CONTRACTGUARD_STRICT_MODE="true"
CONTRACTGUARD_FAIL_CLOSED="true"

# Stage 1: Fast Boundary & Provenance Gateway
CONTRACTGUARD_STAGE1_ENABLED="true"
CONTRACTGUARD_MAX_INGRESS_PAYLOAD_KB="512"

# Stage 2: Cumulative Effect Ledger & Parameter Binding
CONTRACTGUARD_LEDGER_STORAGE="redis://localhost:6379/0"
CONTRACTGUARD_LEDGER_TTL_SECONDS="86400"
CONTRACTGUARD_BUDGET_CURRENCY="USD"

# Stage 3: Nebius Token Factory Semantic Verifier
NEBIUS_API_KEY="YOUR_NEBIUS_API_KEY_HERE"
NEBIUS_TOKEN_FACTORY_ENDPOINT="https://api.tokenfactory.nebius.ai/v1"
NEBIUS_MODEL_NAME="nvidia/nemotron-mini-4b-instruct"

# Audit & Alerting Webhooks
CONTRACTGUARD_AUDIT_LOG_DESTINATION="stdout"
CONTRACTGUARD_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/PLACEHOLDER"
CONTRACTGUARD_PAGERDUTY_KEY="PLACEHOLDER_KEY"
`;

  const metadataJson = JSON.stringify(
    {
      pack_id: pack.id,
      policy_id: pack.policy_id,
      policy_title: pack.policy_title,
      version: pack.version,
      deployment_style: pack.deployment_style,
      deployment_label: pack.deployment_label,
      created_at: pack.created_at,
      integrity_hash: pack.integrity_hash,
      spec_version: '2.0.0',
    },
    null,
    2
  );

  const entries: ZipEntry[] = [
    { filename: 'architecture-specification.md', content: mdContent },
    { filename: 'contracts.yaml', content: yamlSpec },
    { filename: '.env.example', content: tailoredEnv },
    { filename: 'metadata.json', content: metadataJson },
  ];

  // Add individual code snippets
  doc.sections.forEach((sec) => {
    (sec.codeSnippets || []).forEach((snippet) => {
      entries.push({
        filename: `snippets/${snippet.filename}`,
        content: snippet.code,
      });
    });
  });

  return createZipArchive(entries);
}
