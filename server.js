/**
 * ══════════════════════════════════════════════════════════
 * server.js — Express API Server
 * Astana Hajj & Umroh Travel
 * Jalankan: node server.js
 * ══════════════════════════════════════════════════════════
 */

'use strict';

require('dotenv').config();
require('./database/init.js'); // inisialisasi DB + seed

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const multer  = require('multer');
const fs      = require('fs');
const crypto  = require('crypto');

const { getDb } = require('./database/db.js');

const app  = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'astana-secret';

function adminTokenFor(username) {
  const timestamp = `${Date.now()}`;
  const payload = `${username}:${timestamp}`;
  const signature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

function verifyAdminToken(token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;
    const [username, timestamp, signature] = parts;
    const payload = `${username}:${timestamp}`;
    const expected = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('hex');
    return signature === expected && username === (process.env.ADMIN_USERNAME || 'faris');
  } catch (_) {
    return false;
  }
}

function dbGet(sql, params = []) {
  return getDb().getAsync(sql, params);
}

function dbAll(sql, params = []) {
  return getDb().allAsync(sql, params);
}

function dbRun(sql, params = []) {
  return getDb().runAsync(sql, params);
}

/* ── MIDDLEWARE ── */
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: corsOrigin ? corsOrigin.split(',').map(s => s.trim()) : '*',
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan file frontend dari folder "public"
app.use(express.static(path.join(__dirname, 'public')));
// Bukti transfer yang diupload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ── MULTER ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `bukti_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Hanya file gambar'));
  }
});

/* ── HELPERS ── */

// node-sqlite3-wasm: .get() mengembalikan object dengan key persis nama kolom
// .all() mengembalikan array of objects
function rowToInvoiceObject(row) {
  if (!row) return null;
  return {
    invoiceNumber:    row.invoice_number,
    tanggalDaftar:    row.tanggal_daftar,
    status:           row.status,
    metodePembayaran: row.metode_pembayaran,
    keterangan:       row.keterangan,
    totalBayar:       row.total_bayar,
    hargaPenuh:       row.harga_penuh,
    nominalTransfer:  row.nominal_transfer  || undefined,
    bankPengirim:     row.bank_pengirim     || undefined,
    catatan:          row.catatan           || undefined,
    buktiPath:        row.bukti_path        || undefined,
    jamaah: {
      nama:   row.nama,
      ktp:    row.ktp,
      lahir:  row.lahir,
      alamat: row.alamat,
      wa:     row.wa,
    },
    paket: {
      id:      row.paket_id,
      tanggal: row.paket_tanggal,
      harga:   row.harga_penuh,
      label:   row.paket_id,
    }
  };
}

function rowToPaketObject(row) {
  if (!row) return null;
  return {
    id:        row.id,
    tanggal:   row.tanggal,
    harga:     row.harga,
    label:     row.label,
    fasilitas: JSON.parse(row.fasilitas || '[]'),
  };
}

/* ── ADMIN AUTH MIDDLEWARE ── */
function adminAuth(req, res, next) {
  const token = (req.headers['authorization'] || '').replace(/Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Token tidak ada' });
  if (verifyAdminToken(token)) return next();
  return res.status(401).json({ error: 'Token tidak valid' });
}

/* ══════════════════════════════════════════
   ROUTES — ADMIN LOGIN
══════════════════════════════════════════ */
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === (process.env.ADMIN_USERNAME || 'faris') &&
      password === (process.env.ADMIN_PASSWORD || 'farisganteng123')) {
    const token = adminTokenFor(username);
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false, error: 'Username atau password salah' });
});

/* ══════════════════════════════════════════
   ROUTES — PAKET
══════════════════════════════════════════ */
app.get('/api/paket', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM paket ORDER BY rowid');
    res.json(rows.map(rowToPaketObject));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/paket/:id', async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM paket WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Paket tidak ditemukan' });
    res.json(rowToPaketObject(row));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/paket', adminAuth, async (req, res) => {
  try {
    const { id, tanggal, harga, label, fasilitas } = req.body;
    if (!id || !tanggal || !harga) return res.status(400).json({ error: 'id, tanggal, harga wajib' });
    await dbRun(
      'INSERT INTO paket (id,tanggal,harga,label,fasilitas) VALUES (?,?,?,?,?)',
      [id, tanggal, parseInt(harga, 10), label || '', JSON.stringify(fasilitas || [])]
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'ID paket sudah ada' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/paket/:id', adminAuth, async (req, res) => {
  try {
    const { tanggal, harga, label, fasilitas } = req.body;
    await dbRun(
      `UPDATE paket SET tanggal=?,harga=?,label=?,fasilitas=?,updated_at=datetime('now','localtime') WHERE id=?`,
      [tanggal, parseInt(harga, 10), label || '', JSON.stringify(fasilitas || []), req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/paket/:id', adminAuth, async (req, res) => {
  try {
    await dbRun('DELETE FROM paket WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ══════════════════════════════════════════
   ROUTES — PENDAFTARAN
══════════════════════════════════ */
app.post('/api/pendaftaran', async (req, res) => {
  try {
    const { invoiceNumber, jamaah, paket, metodePembayaran, keterangan, totalBayar, hargaPenuh, status, tanggalDaftar } = req.body;
    if (!invoiceNumber || !jamaah || !paket) return res.status(400).json({ error: 'Data tidak lengkap' });
    await dbRun(
      `INSERT INTO pendaftaran
        (invoice_number,nama,ktp,lahir,alamat,wa,paket_id,paket_tanggal,harga_penuh,
         metode_pembayaran,keterangan,total_bayar,status,tanggal_daftar)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoiceNumber, jamaah.nama, jamaah.ktp, jamaah.lahir, jamaah.alamat, jamaah.wa,
       paket.id, paket.tanggal, parseInt(hargaPenuh, 10),
       metodePembayaran, keterangan, parseInt(totalBayar, 10),
       status || 'Menunggu Pembayaran', tanggalDaftar]
    );
    res.status(201).json({ success: true, invoiceNumber });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Invoice sudah ada' });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pendaftaran', adminAuth, async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM pendaftaran ORDER BY created_at DESC');
    res.json(rows.map(rowToInvoiceObject));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ROUTE: CEK STATUS PENDAFTARAN */
app.get('/api/pendaftaran/status', async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    if (!keyword || keyword.length < 4) {
      return res.status(400).json({ error: 'Keyword minimal 4 karakter' });
    }

    const kw = keyword.toLowerCase();
    const row = await dbGet(
      `SELECT * FROM pendaftaran
       WHERE LOWER(invoice_number) LIKE ?
          OR LOWER(ktp)            LIKE ?
          OR LOWER(wa)             LIKE ?
       LIMIT 1`,
      [`%${kw}%`, `%${kw}%`, `%${kw}%`]
    );

    if (!row) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }

    res.json(rowToInvoiceObject(row));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pendaftaran/:invoiceNumber', async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM pendaftaran WHERE invoice_number=?', [req.params.invoiceNumber]);
    if (!row) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
    res.json(rowToInvoiceObject(row));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/pendaftaran/:invoiceNumber', adminAuth, async (req, res) => {
  try {
    await dbRun('DELETE FROM pendaftaran WHERE invoice_number=?', [req.params.invoiceNumber]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ══════════════════════════════════════════
   ROUTES — KONFIRMASI PEMBAYARAN
══════════════════════════════════════════ */
app.patch('/api/konfirmasi', upload.single('bukti_transfer'), async (req, res) => {
  try {
    const { invoice_number, nominal, bank, catatan } = req.body;
    if (!invoice_number || !nominal) return res.status(400).json({ error: 'invoice_number dan nominal wajib' });
    const buktiPath = req.file ? `/uploads/${req.file.filename}` : null;
    await dbRun(
      `UPDATE pendaftaran
       SET status='Menunggu Verifikasi', nominal_transfer=?, bank_pengirim=?, catatan=?,
           bukti_path=COALESCE(?,bukti_path), updated_at=datetime('now','localtime')
       WHERE invoice_number=?`,
      [parseInt(nominal, 10), bank || null, catatan || null, buktiPath, invoice_number]
    );
    res.json({ success: true, status: 'Menunggu Verifikasi' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/pendaftaran/:invoiceNumber/verifikasi', adminAuth, async (req, res) => {
  try {
    await dbRun(
      `UPDATE pendaftaran SET status='Terverifikasi', updated_at=datetime('now','localtime') WHERE invoice_number=?`,
      [req.params.invoiceNumber]
    );
    res.json({ success: true, status: 'Terverifikasi' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/pendaftaran/:invoiceNumber/tolak', adminAuth, async (req, res) => {
  try {
    await dbRun(
      `UPDATE pendaftaran SET status='Menunggu Pembayaran', updated_at=datetime('now','localtime') WHERE invoice_number=?`,
      [req.params.invoiceNumber]
    );
    res.json({ success: true, status: 'Menunggu Pembayaran' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ══════════════════════════════════════════
   ROUTES — STATS
══════════════════════════════════════════ */
app.get('/api/stats', adminAuth, async (req, res) => {
  try {
    const toN = row => row ? (row.c || row['COUNT(*)'] || 0) : 0;
    const total    = toN(await dbGet("SELECT COUNT(*) AS c FROM pendaftaran"));
    const pending  = toN(await dbGet("SELECT COUNT(*) AS c FROM pendaftaran WHERE status='Menunggu Pembayaran'"));
    const waiting  = toN(await dbGet("SELECT COUNT(*) AS c FROM pendaftaran WHERE status='Menunggu Verifikasi'"));
    const verified = toN(await dbGet("SELECT COUNT(*) AS c FROM pendaftaran WHERE status='Terverifikasi'"));
    const recentRows = await dbAll('SELECT * FROM pendaftaran ORDER BY created_at DESC LIMIT 5');
    const recent = recentRows.map(rowToInvoiceObject);
    res.json({ total, pending, waiting, verified, recent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* START SERVER */
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   Astana Hajj & Umroh — API Server      ║
  ║   Running on http://localhost:${PORT}       ║
  ╚══════════════════════════════════════════╝
  `);
});
