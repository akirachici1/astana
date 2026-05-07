const { getDb } = require('./db.js');

async function initializeDatabase() {
  const db = getDb();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS paket (
      id TEXT PRIMARY KEY,
      tanggal TEXT NOT NULL,
      harga INTEGER NOT NULL,
      label TEXT,
      fasilitas TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pendaftaran (
      invoice_number TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      ktp TEXT,
      lahir TEXT,
      alamat TEXT,
      wa TEXT,
      paket_id TEXT,
      paket_tanggal TEXT,
      harga_penuh INTEGER,
      metode_pembayaran TEXT,
      keterangan TEXT,
      total_bayar INTEGER DEFAULT 0,
      nominal_transfer INTEGER,
      bank_pengirim TEXT,
      catatan TEXT,
      bukti_path TEXT,
      status TEXT DEFAULT 'Menunggu Pembayaran',
      tanggal_daftar TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paket_id) REFERENCES paket(id)
    )
  `);

  const checkPaket = await db.getAsync('SELECT COUNT(*) as count FROM paket');
  if (!checkPaket || checkPaket.count === 0) {
    const pakets = [
      ['PKT01', '01 Juli 2026', 28500000, 'Paket Hemat 9 Hari', '["Hotel Bintang 3","Visa Umroh","Transportasi"]'],
      ['PKT02', '15 Juli 2026', 29500000, 'Paket Reguler 12 Hari', '["Hotel Bintang 4","Visa Umroh","Transportasi","Konsumsi"]'],
      ['PKT03', '01 Agustus 2026', 31500000, 'Paket VIP 12 Hari', '["Hotel Bintang 5","Visa Umroh","Transportasi","Konsumsi Plus","Pemandu"]'],
      ['PKT04', '05 September 2026', 34500000, 'Paket Executive 15 Hari', '["Hotel Bintang 5","Visa Umroh","Transportasi","Konsumsi Plus","Pemandu","Kursi Roda"]']
    ];

    await new Promise((resolve, reject) => {
      const stmt = db.prepare('INSERT INTO paket (id,tanggal,harga,label,fasilitas) VALUES (?,?,?,?,?)', (err) => {
        if (err) return reject(err);
        let completed = 0;
        pakets.forEach((p) => {
          stmt.run(p, (err) => {
            if (err) return reject(err);
            completed += 1;
            if (completed === pakets.length) {
              stmt.finalize((err) => err ? reject(err) : resolve());
            }
          });
        });
      });
    });

    console.log('✅ Data paket default berhasil diinsert');
  }

  console.log('✅ Database terinisialisasi');
}

initializeDatabase().catch((err) => {
  console.error('❌ Gagal inisialisasi DB:', err.message || err);
  process.exit(1);
});

module.exports = { initializeDatabase };
