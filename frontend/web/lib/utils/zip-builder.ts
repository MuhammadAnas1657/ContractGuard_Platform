// Pure TypeScript client-side ZIP file builder (zero external dependencies)
// Creates standard uncompressed (Stored) PKZIP files compatible with Windows, macOS, and Linux.

export interface ZipEntry {
  filename: string;
  content: string | Uint8Array;
}

export function createZipArchive(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let currentOffset = 0;
  const parts: Uint8Array[] = [];

  // CRC32 table & calculator
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[i] = c;
  }

  function calculateCrc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // 1. Write Local File Headers + File Data
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.filename.replace(/\\/g, '/'));
    const contentBytes =
      typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
    const crc = calculateCrc32(contentBytes);
    const offset = currentOffset;

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed (2.0)
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method: 0 (Stored)
    view.setUint16(10, 0x5421, true); // File last mod time
    view.setUint16(12, 0x589b, true); // File last mod date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length

    header.set(nameBytes, 30);

    parts.push(header);
    parts.push(contentBytes);

    currentOffset += header.length + contentBytes.length;

    fileRecords.push({
      nameBytes,
      contentBytes,
      crc,
      offset,
    });
  }

  // 2. Write Central Directory
  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const rec of fileRecords) {
    const cdHeader = new Uint8Array(46 + rec.nameBytes.length);
    const cdView = new DataView(cdHeader.buffer);

    cdView.setUint32(0, 0x02014b50, true); // Central directory header signature
    cdView.setUint16(4, 20, true); // Version made by
    cdView.setUint16(6, 20, true); // Version needed
    cdView.setUint16(8, 0, true); // Bit flag
    cdView.setUint16(10, 0, true); // Compression method: 0
    cdView.setUint16(12, 0x5421, true); // Time
    cdView.setUint16(14, 0x589b, true); // Date
    cdView.setUint32(16, rec.crc, true); // CRC-32
    cdView.setUint32(20, rec.contentBytes.length, true); // Compressed size
    cdView.setUint32(24, rec.contentBytes.length, true); // Uncompressed size
    cdView.setUint16(28, rec.nameBytes.length, true); // File name length
    cdView.setUint16(30, 0, true); // Extra field length
    cdView.setUint16(32, 0, true); // File comment length
    cdView.setUint16(34, 0, true); // Disk number start
    cdView.setUint16(36, 0, true); // Internal file attributes
    cdView.setUint32(38, 0, true); // External file attributes
    cdView.setUint32(42, rec.offset, true); // Relative offset of local header

    cdHeader.set(rec.nameBytes, 46);

    parts.push(cdHeader);
    centralDirSize += cdHeader.length;
    currentOffset += cdHeader.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk where central dir starts
  eocdView.setUint16(8, fileRecords.length, true); // Number of records on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total number of central dir records
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirStart, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  parts.push(eocd);

  return new Blob(parts as any, { type: 'application/zip' });
}
