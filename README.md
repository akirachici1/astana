# 🕌 Astana Hajj & Umroh Travel — Backend Database

Dokumentasi setup backend SQLite untuk website Astana Hajj & Umroh Travel.

---

## 📁 Struktur Proyek

```
astana-backend/
├── server.js               ← Express API server (titik masuk utama)
├── package.json
├── .env                    ← Konfigurasi environment (JANGAN commit ke Git!)
├── .env.example            ← Template konfigurasi
├── database/
│   ├── init.js             ← Script pembuatan tabel + seed data
│   ├── db.js               ← Koneksi singleton SQLite
│   └── astana.db           ← File database (dibuat otomatis saat pertama run)
├── uploads/                ← Folder simpan bukti transfer jamaah
└── public/                 ← Salin semua file HTML/CSS/JS frontend ke sini
    ├── index.html
    ├── paket.html
    ├── daftar.html
    ├── invoice.html
    ├── konfirmasi.html
    ├── kontak.html
    ├── admin.html          ← SUDAH DIMODIFIKASI (login via API)
    ├── admin_dashboard.html
    ├── style.css
    ├── script.js           ← SUDAH DIMODIFIKASI (data via API)
    └── Image_laper.jpeg
```

---

## 🗄️ Schema Database (SQLite)

### Tabel `paket`
| Kolom        | Tipe    | Keterangan                         |
|-------------|---------|-----------------------------------|
| id          | TEXT PK | e.g. PKT01, PKT02                  |
| tanggal     | TEXT    | e.g. "01 Juli 2026"                |
| harga       | INTEGER | dalam Rupiah                       |
| label       | TEXT    | e.g. "Populer", "Eksklusif"        |
| fasilitas   | TEXT    | JSON array (list fasilitas)        |
| created_at  | TEXT    | Timestamp otomatis                 |
| updated_at  | TEXT    | Timestamp otomatis                 |

### Tabel `pendaftaran`
| Kolom              | Tipe    | Keterangan                              |
|-------------------|---------|----------------------------------------|
| invoice_number    | TEXT PK | e.g. AHU-20260701-1234                  |
| nama              | TEXT    | Nama lengkap jamaah                     |
| ktp               | TEXT    | No. KTP / Paspor                        |
| lahir             | TEXT    | Tanggal lahir (YYYY-MM-DD)              |
| alamat            | TEXT    | Alamat lengkap                          |
| wa                | TEXT    | Nomor WhatsApp                          |
| paket_id          | TEXT FK | Referensi ke paket.id                   |
| paket_tanggal     | TEXT    | Snapshot tanggal saat daftar            |
| harga_penuh       | INTEGER | Snapshot harga saat daftar              |
| metode_pembayaran | TEXT    | dp / cicilan / lunas                    |
| keterangan        | TEXT    | Label metode (e.g. "DP 50%")            |
| total_bayar       | INTEGER | Nominal yang harus dibayar              |
| status            | TEXT    | Menunggu Pembayaran / Menunggu Verifikasi / Terverifikasi |
| tanggal_daftar    | TEXT    | Display string tanggal daftar           |
| nominal_transfer  | INTEGER | Diisi saat konfirmasi (opsional)        |
| bank_pengirim     | TEXT    | Bank/metode transfer (opsional)         |
| catatan           | TEXT    | Catatan dari jamaah (opsional)          |
| bukti_path        | TEXT    | Path file bukti transfer                |
| created_at        | TEXT    | Timestamp otomatis                      |
| updated_at        | TEXT    | Timestamp otomatis                      |

---

## 🚀 Cara Menjalankan

### 1. Prasyarat
- Node.js v18+ terinstall
- npm terinstall

### 2. Install Dependencies
```bash
cd astana-backend
npm install
```

### 3. Konfigurasi Environment
```bash
# Salin template
cp .env.example .env

# Edit .env sesuai kebutuhan
nano .env
```

Isi file `.env`:
```env
PORT=3000
DB_PATH=./database/astana.db
ADMIN_USERNAME=nama_admin_anda
ADMIN_PASSWORD=password_yang_kuat
CORS_ORIGIN=https://domain-anda.com
```

### 4. Salin File Frontend
Salin **semua file HTML/CSS/gambar** dari folder website asli ke folder `public/`:
```bash
cp index.html paket.html daftar.html invoice.html \
   konfirmasi.html kontak.html admin_dashboard.html \
   style.css Image_laper.jpeg \
   astana-backend/public/

# File script.js dan admin.html sudah ada di public/ (versi modifikasi)
```

### 5. Jalankan Server
```bash
# Mode production
npm start

# Output:
# ╔══════════════════════════════════════════╗
# ║   Astana Hajj & Umroh — API Server      ║
# ║   Running on http://localhost:3000       ║
# ╚══════════════════════════════════════════╝
```

### 6. Buka Website
```
http://localhost:3000/index.html
```

Database akan dibuat otomatis di `database/astana.db` beserta data paket default.

---

## 🌐 API Endpoints

| Method | Endpoint                                    | Auth  | Keterangan                      |
|--------|---------------------------------------------|-------|---------------------------------|
| POST   | /api/admin/login                            | -     | Login admin, dapat token        |
| GET    | /api/paket                                  | -     | Ambil semua paket               |
| GET    | /api/paket/:id                              | -     | Ambil satu paket                |
| POST   | /api/paket                                  | Admin | Tambah paket baru               |
| PUT    | /api/paket/:id                              | Admin | Update paket                    |
| DELETE | /api/paket/:id                              | Admin | Hapus paket                     |
| POST   | /api/pendaftaran                            | -     | Simpan pendaftaran jamaah       |
| GET    | /api/pendaftaran                            | Admin | Semua pendaftaran               |
| GET    | /api/pendaftaran/:invoiceNumber             | -     | Satu invoice                    |
| DELETE | /api/pendaftaran/:invoiceNumber             | Admin | Hapus pendaftaran               |
| PATCH  | /api/konfirmasi                             | -     | Upload bukti + update status    |
| PATCH  | /api/pendaftaran/:invoiceNumber/verifikasi  | Admin | Verifikasi pembayaran           |
| GET    | /api/stats                                  | Admin | Statistik dashboard admin       |

---

## 🔐 Keamanan

- **SQL Injection**: Semua query menggunakan **parameterized statements** via `better-sqlite3` (otomatis aman)
- **CORS**: Dikonfigurasi via `CORS_ORIGIN` di `.env`, batasi ke domain frontend Anda saat deploy
- **Credentials**: Disimpan di `.env`, **jangan di-hardcode** di kode
- **Upload**: Validasi tipe file (hanya gambar), batas ukuran 5MB
- **Admin Auth**: Token sederhana cukup untuk skala proyek ini. Untuk produksi skala besar, pertimbangkan JWT

---

## ☁️ Deploy ke VPS / Hosting

### Menggunakan PM2 (Rekomendasi)
```bash
npm install -g pm2
pm2 start server.js --name astana-backend
pm2 save
pm2 startup
```

### Nginx Reverse Proxy (opsional, jika pakai domain)
```nginx
server {
    listen 80;
    server_name domain-anda.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Untuk upload file besar
    client_max_body_size 10M;
}
```

### Deploy ke Railway / Render / Fly.io
1. Push ke GitHub
2. Connect repo ke platform
3. Set environment variables di dashboard platform
4. Deploy — platform otomatis jalankan `npm start`

---

## 📊 Perubahan di `script.js`

Hanya 4 bagian yang dimodifikasi, semua UI/UX **identik**:

| Fungsi Asli | Perubahan |
|------------|-----------|
| `form submit` di `initDaftar()` | Tambah `POST /api/pendaftaran` setelah simpan ke localStorage |
| `initInvoice()` | Tambah sync status dari `GET /api/pendaftaran/:id` |
| `form submit` di `initKonfirmasi()` | Tambah `PATCH /api/konfirmasi` setelah update localStorage |
| Fungsi admin (load/save/delete/verify) | Panggil API, fallback ke localStorage jika server tidak tersedia |

**Prinsip**: localStorage tetap dipakai untuk state sesi antar halaman. Database server sebagai persistent storage.

---

## ⚠️ Catatan Penting

1. File `database/astana.db` mengandung **semua data jamaah** — backup secara berkala!
2. Folder `uploads/` berisi bukti transfer — sertakan dalam backup
3. File `.env` **jangan** di-commit ke Git (tambahkan ke `.gitignore`)
4. Ganti `ADMIN_PASSWORD` dengan password yang kuat sebelum deploy
