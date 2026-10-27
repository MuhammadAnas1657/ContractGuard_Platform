import { ArchitectureDocument } from '../types/security';
import { createZipArchive, ZipEntry } from './zip-builder';

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function buildDocumentXml(doc: ArchitectureDocument): string {
  const parts: string[] = [];

  parts.push(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`);
  parts.push(
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
  );
  parts.push(`<w:body>`);

  // Document Badge
  parts.push(
    `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="10B981"/></w:rPr><w:t>CONTRACTGUARD PLATFORM SPECIFICATION</w:t></w:r></w:p>`
  );

  // Title
  parts.push(
    `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(
      doc.title
    )}</w:t></w:r></w:p>`
  );

  // Subtitle
  parts.push(
    `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="360"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:color w:val="64748B"/></w:rPr><w:t>${escapeXml(
      doc.subtitle
    )}</w:t></w:r></w:p>`
  );

  // Metadata block
  const meta: [string, string][] = [
    ['Target Policy', `${doc.policy_title} (v${doc.policy_version})`],
    ['Deployment Topology', doc.deployment_label],
    ['Integrity Digest', doc.integrity_hash],
    ['Generated Date', doc.date],
    ['Author', doc.author],
  ];
  if (doc.environment_notes) {
    meta.push(['Environment Notes', doc.environment_notes]);
  }

  for (const [k, v] of meta) {
    parts.push(
      `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="10B981"/></w:rPr><w:t xml:space="preserve">${escapeXml(
        k
      )}: </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(
        v
      )}</w:t></w:r></w:p>`
    );
  }

  // Page break to TOC
  parts.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);

  // Table of Contents
  parts.push(
    `<w:p><w:pPr><w:spacing w:before="240" w:after="180"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="0F172A"/></w:rPr><w:t>Table of Contents (10 Sections)</w:t></w:r></w:p>`
  );
  for (const s of doc.sections) {
    parts.push(
      `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="10B981"/></w:rPr><w:t xml:space="preserve">Section ${s.number}: </w:t></w:r><w:r><w:rPr><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">${escapeXml(
        s.title
      )} — </w:t></w:r><w:r><w:rPr><w:i/><w:color w:val="64748B"/></w:rPr><w:t>${escapeXml(
        s.summary
      )}</w:t></w:r></w:p>`
    );
  }

  // Sections
  for (const s of doc.sections) {
    // Page break before section
    parts.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);

    // Section title
    parts.push(
      `<w:p><w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="10B981"/></w:rPr><w:t>${escapeXml(
        `Section ${s.number}: ${s.title}`
      )}</w:t></w:r></w:p>`
    );

    // Summary
    parts.push(
      `<w:p><w:pPr><w:spacing w:after="180"/></w:pPr><w:r><w:rPr><w:i/><w:b/><w:sz w:val="22"/><w:color w:val="059669"/></w:rPr><w:t>${escapeXml(
        s.summary
      )}</w:t></w:r></w:p>`
    );

    // Paragraphs
    for (const p of s.content) {
      parts.push(
        `<w:p><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">${escapeXml(
          p
        )}</w:t></w:r></w:p>`
      );
    }

    // Snippets
    if (s.codeSnippets && s.codeSnippets.length > 0) {
      for (const snip of s.codeSnippets) {
        parts.push(
          `<w:p><w:pPr><w:spacing w:before="240" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="10B981"/></w:rPr><w:t>${escapeXml(
            `Snippet: ${snip.filename} (${snip.language})`
          )}</w:t></w:r></w:p>`
        );
        const lines = String(snip.code || '').split(/\r?\n/);
        for (const line of lines) {
          parts.push(
            `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="180" w:right="180"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:color w:val="F8FAFC"/></w:rPr><w:t xml:space="preserve">${escapeXml(
              line || ' '
            )}</w:t></w:r></w:p>`
          );
        }
      }
    }

    // Checklists
    if (s.checklistItems && s.checklistItems.length > 0) {
      parts.push(
        `<w:p><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr><w:t>Operational Verification Checklist</w:t></w:r></w:p>`
      );
      for (const item of s.checklistItems) {
        parts.push(
          `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${
            item.checked ? '10B981' : '94A3B8'
          }"/></w:rPr><w:t>${item.checked ? '[X] ' : '[ ] '}</w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">${escapeXml(
            item.label
          )} - </w:t></w:r><w:r><w:rPr><w:i/><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(
            item.note || 'Required'
          )}</w:t></w:r></w:p>`
        );
      }
    }
  }

  // Section properties (A4 with 1-inch margins)
  parts.push(
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>`
  );
  parts.push(`</w:body></w:document>`);

  return parts.join('\n');
}

export function createWordDocument(doc: ArchitectureDocument): Blob {
  const documentXml = buildDocumentXml(doc);

  const entries: ZipEntry[] = [
    { filename: '[Content_Types].xml', content: CONTENT_TYPES_XML },
    { filename: '_rels/.rels', content: RELS_XML },
    { filename: 'word/document.xml', content: documentXml },
  ];

  const zipBlob = createZipArchive(entries);

  return new Blob([zipBlob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
