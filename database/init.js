'use strict';

require('dotenv').config();
const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || './database/astana.db';
const resolvedPath = path.resolve(DB_PATH);

const dbDir = path.dirname(resolvedPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(resolvedPath);
db.run('PRAGMA foreign_keys = ON');

db.run(`
  CREATE TABLE IF NOT EXISTS paket (
    id          TEXT PRIMARY KEY,
    tanggal     TEXT NOT NULL,
    harga       INTEGER NOT NULL,
    label       TEXT DEFAULT '',
    fasilitas   TEXT DEFAULT '[]',
    created_at  TEXT DEFAULT (datetime('now','localtime')),
    updated_at  TEXT DEFAULT (datetime('now','localtime'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS pendaftaran (
    invoice_number    TEXT PRIMARY KEY,
    nama              TEXT NOT NULL,
    ktp               TEXT NOT NULL,
    lahir             TEXT NOT NULL,
    alamat            TEXT NOT NULL,
    wa                TEXT NOT NULL,
    paket_id          TEXT NOT NULL,
    paket_tanggal     TEXT NOT NULL,
    harga_penuh       INTEGER NOT NULL,
    metode_pembayaran TEXT NOT NULL,
    keterangan        TEXT NOT NULL,
    total_bayar       INTEGER NOT NULL,
    status            TEXT NOT NULL DEFAULT 'Menunggu Pembayaran',
    tanggal_daftar    TEXT NOT NULL,
    nominal_transfer  INTEGER,
    bank_pengirim     TEXT,
    catatan           TEXT,
    bukti_path        TEXT,
    created_at        TEXT DEFAULT (datetime('now','localtime')),
    updated_at        TEXT DEFAULT (datetime('now','localtime'))
  )
`);

const countRow = db.get('SELECT COUNT(*) AS c FROM paket');
const count = countRow ? (countRow.c || countRow['COUNT(*)'] || 0) : 0;

if (count === 0) {
  const defaultPaket = [
    { id:'PKT01', tanggal:'01 Juli 2026',      harga:28500000, label:'Paket 01',  fasilitas:['Tiket Pesawat PP Jakarta–Jeddah','Hotel Bintang 4 Makkah (5 malam)','Hotel Bintang 4 Madinah (4 malam)','Pembimbing & Muthawif Berpengalaman','Visa Umroh Resmi','Perlengkapan Jamaah Lengkap','Asuransi Perjalanan'] },
    { id:'PKT02', tanggal:'15 Juli 2026',      harga:29500000, label:'Populer',   fasilitas:['Tiket Pesawat PP Jakarta–Jeddah','Hotel Bintang 4 Makkah (5 malam)','Hotel Bintang 4 Madinah (4 malam)','Pembimbing & Muthawif Berpengalaman','Visa Umroh Resmi','Perlengkapan + City Tour Jeddah','Asuransi Perjalanan'] },
    { id:'PKT03', tanggal:'01 Agustus 2026',   harga:31500000, label:'Paket 03',  fasilitas:['Tiket Pesawat PP Jakarta–Jeddah','Hotel Bintang 4 Makkah (6 malam)','Hotel Bintang 4 Madinah (4 malam)','Pembimbing & Muthawif Berpengalaman','Visa Umroh Resmi','Perlengkapan + Ziarah Makkah','Asuransi Perjalanan'] },
    { id:'PKT04', tanggal:'05 September 2026', harga:34500000, label:'Eksklusif', fasilitas:['Tiket Pesawat PP Jakarta–Jeddah','Hotel Bintang 5 Makkah (6 malam)','Hotel Bintang 5 Madinah (5 malam)','Pembimbing & Muthawif Senior','Visa Umroh Resmi','Paket Eksklusif Full Service','Asuransi Perjalanan Premium'] }
  ];
  for (const p of defaultPaket) {
    db.run('INSERT INTO paket (id,tanggal,harga,label,fasilitas) VALUES (?,?,?,?,?)',
      [p.id, p.tanggal, p.harga, p.label, JSON.stringify(p.fasilitas)]);
  }
  console.log('✅ Seed data paket berhasil dimasukkan.');
}

db.close();
console.log('✅ Database siap di:', resolvedPath);
