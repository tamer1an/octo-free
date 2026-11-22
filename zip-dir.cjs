/**
 * zip-dir.cjs
 *
 * Minimal, zero-dependency ZIP writer.
 *
 * Exists because PowerShell 5.1's Compress-Archive writes entry names with the
 * native path separator ("assets\foo.js"), which violates ZIP APPNOTE
 * §4.4.17.1 ("all slashes MUST be forward slashes") and is rejected by the AMO
 * linter as "Invalid name in archive". Node's stdlib has deflate but no zip
 * container, so we emit the container ourselves — ~100 lines, no build deps,
 * and identical output on every platform.
 *
 * Output is deterministic: entries are sorted and stamped with the canonical
 * 1980-01-01 DOS timestamp, so the same input tree always yields the same
 * bytes.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CRC-32 (IEEE 802.3, the polynomial ZIP mandates) ────────────────────────
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// Fixed DOS date/time = 1980-01-01 00:00:00, the epoch of the DOS format and
// the conventional value for reproducible archives.
const DOS_TIME = 0x0000;
const DOS_DATE = 0x0021;

const FLAG_UTF8 = 0x0800; // bit 11: entry name is UTF-8
const VERSION_NEEDED = 20; // 2.0 — deflate
const VERSION_MADE_BY = 0x031e; // UNIX (3) + spec 3.0, so external attrs mean mode
const EXTERNAL_ATTRS = (0o100644 << 16) >>> 0; // regular file, rw-r--r--

/**
 * Walks `dir` and returns { name, absPath } for every file, where `name` is
 * the archive-relative path using forward slashes.
 */
function collectFiles(dir, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name);
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(absPath, name));
    } else if (entry.isFile()) {
      files.push({ name, absPath });
    }
  }
  return files;
}

/**
 * Zips the *contents* of srcDir (no wrapping folder) into zipPath.
 * Returns the archive-relative entry names that were written.
 */
function zipDirectory(srcDir, zipPath) {
  const files = collectFiles(srcDir).sort((a, b) => (a.name < b.name ? -1 : 1));

  const parts = []; // local headers + payloads, in write order
  const central = []; // central directory headers
  let offset = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file.absPath);
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    // Store when deflate doesn't pay for itself (already-compressed PNGs).
    const compressed = deflated.length < raw.length ? deflated : raw;
    const method = deflated.length < raw.length ? 8 : 0;
    const crc = crc32(raw);
    const nameBuf = Buffer.from(file.name, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION_NEEDED, 4);
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // no extra field
    parts.push(local, nameBuf, compressed);

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(VERSION_MADE_BY, 4);
    cdh.writeUInt16LE(VERSION_NEEDED, 6);
    cdh.writeUInt16LE(FLAG_UTF8, 8);
    cdh.writeUInt16LE(method, 10);
    cdh.writeUInt16LE(DOS_TIME, 12);
    cdh.writeUInt16LE(DOS_DATE, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(compressed.length, 20);
    cdh.writeUInt32LE(raw.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30); // extra len
    cdh.writeUInt16LE(0, 32); // comment len
    cdh.writeUInt16LE(0, 34); // disk number start
    cdh.writeUInt16LE(0, 36); // internal attrs
    cdh.writeUInt32LE(EXTERNAL_ATTRS, 38);
    cdh.writeUInt32LE(offset, 42);
    central.push(cdh, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // this disk
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // no archive comment

  fs.writeFileSync(zipPath, Buffer.concat([...parts, centralBuf, eocd]));
  return files.map(f => f.name);
}

module.exports = { zipDirectory };
