/* =============================================
   ASTANA HAJJ & UMROH TRAVEL — script.js
   =============================================
   
   MODIFIKASI: Sumber data dialihkan dari localStorage
   ke REST API backend (server.js + SQLite).
   Semua UI/UX, alur, dan nama fungsi TIDAK berubah.
   ============================================= */

'use strict';

/* ══════════════════════════════════════════
   CONFIG — URL backend API
   Ganti dengan URL server Anda saat deploy
══════════════════════════════════════════ */
const API_BASE = window.API_BASE || 'http://localhost:3000';

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
const formatRupiah = (n) =>
  'Rp ' + Number(n).toLocaleString('id-ID');

const generateInvoiceNumber = () => {
  const now = new Date();
  const pad = (v, l = 2) => String(v).padStart(l, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `AHU-${date}-${rand}`;
};

// LS tetap digunakan untuk data SESI (selectedPackage, currentInvoice)
// karena ini adalah state navigasi antar halaman, bukan data persisten
const LS = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: (k) => localStorage.removeItem(k),
};

// Helper API request
async function apiGet(path) {
  const token = localStorage.getItem('adminToken') || '';
  const res = await fetch(API_BASE + path, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost(path, body) {
  const token = localStorage.getItem('adminToken') || '';
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPatch(path, body) {
  const token = localStorage.getItem('adminToken') || '';
  const res = await fetch(API_BASE + path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(path) {
  const token = localStorage.getItem('adminToken') || '';
  const res = await fetch(API_BASE + path, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPut(path, body) {
  const token = localStorage.getItem('adminToken') || '';
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ══════════════════════════════════════════
   NAVBAR — hamburger + active link
══════════════════════════════════════════ */
function initNavbar() {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.navbar-nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  const links = document.querySelectorAll('.navbar-nav a');
  const current = location.pathname.split('/').pop() || 'index.html';
  links.forEach(a => {
    const href = a.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

/* ══════════════════════════════════════════
   PAKET PAGE — select package
   (tidak berubah — hanya simpan ke localStorage sesi)
══════════════════════════════════════════ */
function initPaket() {
  const btns = document.querySelectorAll('.btn-pilih-paket');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pkg = {
        id: btn.dataset.id,
        tanggal: btn.dataset.tanggal,
        harga: parseInt(btn.dataset.harga),
        label: btn.dataset.label,
      };
      LS.set('selectedPackage', pkg);
      window.location.href = 'daftar.html';
    });
  });
}

/* ══════════════════════════════════════════
   DAFTAR PAGE — registration form
   PERUBAHAN: form submit → POST /api/pendaftaran
══════════════════════════════════════════ */
function initDaftar() {
  const pkg = LS.get('selectedPackage');
  const infoEl = document.getElementById('selected-pkg-info');
  const paymentRadios = document.querySelectorAll('input[name="pembayaran"]');
  const summaryEl = document.getElementById('payment-summary');
  const form = document.getElementById('form-daftar');

  if (pkg && infoEl) {
    document.getElementById('pkg-tanggal').textContent = pkg.tanggal;
    document.getElementById('pkg-harga').textContent = formatRupiah(pkg.harga);
    infoEl.style.display = 'flex';
  } else if (infoEl) {
    infoEl.style.display = 'none';
  }

  function updateSummary() {
    if (!pkg) return;
    const method = document.querySelector('input[name="pembayaran"]:checked')?.value;
    if (!method || !summaryEl) return;

    const harga = pkg.harga;
    let totalBayar = 0;
    let rows = '';

    if (method === 'dp') {
      totalBayar = Math.ceil(harga * 0.5);
      rows = `
        <div class="ps-row"><span class="ps-label">Harga Paket</span><span class="ps-value">${formatRupiah(harga)}</span></div>
        <div class="ps-row"><span class="ps-label">DP (50%)</span><span class="ps-value">${formatRupiah(totalBayar)}</span></div>
        <div class="ps-row"><span class="ps-label">Sisa (dibayar kemudian)</span><span class="ps-value">${formatRupiah(harga - totalBayar)}</span></div>
      `;
    } else if (method === 'cicilan') {
      totalBayar = Math.ceil(harga / 3);
      rows = `
        <div class="ps-row"><span class="ps-label">Harga Paket</span><span class="ps-value">${formatRupiah(harga)}</span></div>
        <div class="ps-row"><span class="ps-label">Cicilan 1 (dari 3×)</span><span class="ps-value">${formatRupiah(totalBayar)}</span></div>
        <div class="ps-row"><span class="ps-label">Per cicilan</span><span class="ps-value">${formatRupiah(totalBayar)}</span></div>
      `;
    } else {
      totalBayar = harga;
      rows = `
        <div class="ps-row"><span class="ps-label">Harga Paket</span><span class="ps-value">${formatRupiah(harga)}</span></div>
        <div class="ps-row"><span class="ps-label">Metode</span><span class="ps-value">Pelunasan Penuh</span></div>
      `;
    }

    summaryEl.innerHTML = `
      ${rows}
      <div class="ps-row ps-total">
        <span class="ps-label">Yang Harus Dibayar Sekarang</span>
        <strong class="ps-value">${formatRupiah(totalBayar)}</strong>
      </div>
    `;
    summaryEl.classList.add('visible');
  }

  paymentRadios.forEach(r => r.addEventListener('change', updateSummary));

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!pkg) {
        alert('Paket belum dipilih. Silakan pilih paket terlebih dahulu.');
        window.location.href = 'paket.html';
        return;
      }

      const method = document.querySelector('input[name="pembayaran"]:checked')?.value;
      if (!method) {
        alert('Pilih metode pembayaran terlebih dahulu.');
        return;
      }

      const harga = pkg.harga;
      let totalBayar, keterangan;

      if (method === 'dp') {
        totalBayar = Math.ceil(harga * 0.5);
        keterangan = 'DP 50%';
      } else if (method === 'cicilan') {
        totalBayar = Math.ceil(harga / 3);
        keterangan = 'Cicilan 3× (Pembayaran ke-1)';
      } else {
        totalBayar = harga;
        keterangan = 'Pelunasan Penuh';
      }

      const invoiceNumber = generateInvoiceNumber();
      const jamaah = {
        nama:   document.getElementById('nama').value.trim(),
        ktp:    document.getElementById('ktp').value.trim(),
        lahir:  document.getElementById('lahir').value,
        alamat: document.getElementById('alamat').value.trim(),
        wa:     document.getElementById('wa').value.trim(),
      };

      const invoiceData = {
        invoiceNumber,
        jamaah,
        paket: pkg,
        metodePembayaran: method,
        keterangan,
        totalBayar,
        hargaPenuh: harga,
        status: 'Menunggu Pembayaran',
        tanggalDaftar: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      };

      // Simpan ke sesi (untuk navigasi antar halaman)
      LS.set('currentInvoice', invoiceData);

      // ★ PERUBAHAN: Simpan ke database via API
      try {
        await apiPost('/api/pendaftaran', invoiceData);
      } catch (err) {
        console.warn('Gagal simpan ke server, menggunakan localStorage sebagai fallback:', err.message);
        // Fallback: tetap lanjut ke invoice, data tersimpan di localStorage
      }

      window.location.href = 'invoice.html';
    });
  }
}

/* ══════════════════════════════════════════
   INVOICE PAGE
   PERUBAHAN: Ambil data dari API jika tersedia,
   fallback ke localStorage
══════════════════════════════════════════ */
async function initInvoice() {
  let data = LS.get('currentInvoice');

  // Jika data ada di localStorage, coba sync status terbaru dari server
  if (data && data.invoiceNumber) {
    try {
      const serverData = await apiGet(`/api/pendaftaran/${data.invoiceNumber}`);
      // Update status dari server (status mungkin sudah berubah di admin)
      data.status = serverData.status;
      data.nominalTransfer = serverData.nominalTransfer;
      LS.set('currentInvoice', data);
    } catch (_) {
      // Tidak bisa reach server, pakai data lokal
    }
  }

  if (!data) {
    document.getElementById('invoice-content').innerHTML = `
      <div class="alert alert-info" style="margin:40px auto;max-width:500px;justify-content:center;">
        ℹ️ Tidak ada data invoice. Silakan <a href="daftar.html" style="color:var(--blue);font-weight:600;">daftar terlebih dahulu</a>.
      </div>`;
    return;
  }

  const { invoiceNumber, jamaah, paket, keterangan, totalBayar, hargaPenuh, status, tanggalDaftar } = data;

  setText('inv-number', invoiceNumber);
  setText('inv-date', tanggalDaftar);
  setText('inv-status', status);
  setStatus('inv-status', status);

  setText('inv-nama', jamaah.nama);
  setText('inv-ktp', jamaah.ktp);
  setText('inv-lahir', jamaah.lahir ? new Date(jamaah.lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');
  setText('inv-alamat', jamaah.alamat);
  setText('inv-wa', jamaah.wa);

  setText('inv-pkg-tanggal', paket.tanggal);
  setText('inv-pkg-harga', formatRupiah(hargaPenuh));

  const totalsEl = document.getElementById('inv-totals-body');
  if (totalsEl) {
    totalsEl.innerHTML = `
      <div class="inv-total-row"><span>Harga Paket</span><strong>${formatRupiah(hargaPenuh)}</strong></div>
      <div class="inv-total-row"><span>Metode Bayar</span><strong>${keterangan}</strong></div>
      <div class="inv-total-row inv-total-main"><span>Total Dibayar Sekarang</span><strong>${formatRupiah(totalBayar)}</strong></div>
    `;
  }

  const printBtn = document.getElementById('btn-print');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const confirmBtn = document.getElementById('btn-confirm');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      LS.set('confirmInvoiceNumber', invoiceNumber);
      window.location.href = 'konfirmasi.html';
    });
  }

  const downloadBtn = document.getElementById('btn-download');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      alert('Gunakan fitur "Print → Save as PDF" di browser Anda untuk menyimpan invoice sebagai file PDF.');
    });
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '-';
}

function setStatus(id, status) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'inv-status';
  if (status === 'Menunggu Pembayaran') el.classList.add('status-pending');
  else if (status === 'Menunggu Verifikasi') el.classList.add('status-waiting');
  else el.classList.add('status-verified');
}

/* ══════════════════════════════════════════
   KONFIRMASI PAGE
   PERUBAHAN: submit → PATCH /api/konfirmasi
══════════════════════════════════════════ */
function initKonfirmasi() {
  const invoiceNumEl = document.getElementById('konfirm-invoice-num');
  const savedNum     = LS.get('confirmInvoiceNumber');
  const currentInv   = LS.get('currentInvoice');

  if (invoiceNumEl && savedNum) {
    invoiceNumEl.value = savedNum;
  } else if (invoiceNumEl && currentInv) {
    invoiceNumEl.value = currentInv.invoiceNumber;
  }

  const fileInput = document.getElementById('bukti-transfer');
  const preview   = document.getElementById('upload-preview');
  const previewImg = document.getElementById('preview-img');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          previewImg.src = ev.target.result;
          preview.classList.add('visible');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const form = document.getElementById('form-konfirmasi');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const invoiceNum = document.getElementById('konfirm-invoice-num').value.trim();
      const nominal    = document.getElementById('nominal-transfer').value.trim();
      const bank       = document.getElementById('bank-pengirim')?.value || '';
      const catatan    = document.getElementById('catatan')?.value || '';

      if (!invoiceNum || !nominal) {
        alert('Mohon lengkapi semua data.');
        return;
      }

      // Update localStorage sesi
      const inv = LS.get('currentInvoice');
      if (inv && inv.invoiceNumber === invoiceNum) {
        inv.status = 'Menunggu Verifikasi';
        inv.nominalTransfer = nominal;
        LS.set('currentInvoice', inv);
      }

      // ★ PERUBAHAN: Kirim ke API
      try {
        const formData = new FormData();
        formData.append('invoice_number', invoiceNum);
        formData.append('nominal', nominal);
        if (bank) formData.append('bank', bank);
        if (catatan) formData.append('catatan', catatan);

        const buktiFile = document.getElementById('bukti-transfer')?.files[0];
        if (buktiFile) formData.append('bukti_transfer', buktiFile);

        const token = localStorage.getItem('adminToken') || '';
        await fetch(API_BASE + '/api/konfirmasi', {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });
      } catch (err) {
        console.warn('Gagal kirim konfirmasi ke server:', err.message);
        // Fallback: status sudah diupdate di localStorage, lanjut tampilkan success
      }

      const successEl = document.getElementById('konfirm-success');
      if (successEl) {
        successEl.style.display = 'block';
        form.style.display = 'none';
      }
    });
  }
}

/* ══════════════════════════════════════════
   INIT — detect page and call correct fn
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();

  const page = location.pathname.split('/').pop();

  if (page === 'paket.html') initPaket();
  else if (page === 'daftar.html') initDaftar();
  else if (page === 'invoice.html') initInvoice();
  else if (page === 'konfirmasi.html') initKonfirmasi();
});

/* ══════════════════════════════════════════
   ADMIN DASHBOARD FUNCTIONS
   PERUBAHAN: localStorage → API calls
══════════════════════════════════════════ */

const ADMIN_STORAGE = {
  INVOICE_HISTORY: 'invoiceHistory',
  ADMIN_PACKAGES:  'adminPackages'
};

const DEFAULT_ADMIN_PACKAGES = [
  { id: 'PKT01', tanggal: '01 Juli 2026',       harga: 28500000, label: 'Paket 01',  fasilitas: ['Tiket Pesawat PP Jakarta–Jeddah','Hotel Bintang 4 Makkah (5 malam)','Hotel Bintang 4 Madinah (4 malam)','Pembimbing & Muthawif Berpengalaman','Visa Umroh Resmi','Perlengkapan Jamaah Lengkap','Asuransi Perjalanan'] },
  { id: 'PKT02', tanggal: '15 Juli 2026',       harga: 29500000, label: 'Populer',   fasilitas: ['Tiket Pesawat PP Jakarta–Jeddah','Hotel Bintang 4 Makkah (5 malam)','Hotel Bintang 4 Madinah (4 malam)','Pembimbing & Muthawif Berpengalaman','Visa Umroh Resmi','Perlengkapan + City Tour Jeddah','Asuransi Perjalanan'] },
  { id: 'PKT03', tanggal: '01 Agustus 2026',    harga: 31500000, label: 'Paket 03',  fasilitas: ['Tiket Pesawat PP Jakarta–Jeddah','Hotel Bintang 4 Makkah (6 malam)','Hotel Bintang 4 Madinah (4 malam)','Pembimbing & Muthawif Berpengalaman','Visa Umroh Resmi','Perlengkapan + Ziarah Makkah','Asuransi Perjalanan'] },
  { id: 'PKT04', tanggal: '05 September 2026',  harga: 34500000, label: 'Eksklusif', fasilitas: ['Tiket Pesawat PP Jakarta–Jeddah','Hotel Bintang 5 Makkah (6 malam)','Hotel Bintang 5 Madinah (5 malam)','Pembimbing & Muthawif Senior','Visa Umroh Resmi','Paket Eksklusif Full Service','Asuransi Perjalanan Premium'] }
];

// ★ PERUBAHAN: Ambil paket dari API, fallback ke localStorage lama
async function adminLoadPackages() {
  try {
    const data = await apiGet('/api/paket');
    return data;
  } catch (_) {
    // Fallback ke localStorage
    const saved = localStorage.getItem(ADMIN_STORAGE.ADMIN_PACKAGES);
    if (saved) return JSON.parse(saved);
    localStorage.setItem(ADMIN_STORAGE.ADMIN_PACKAGES, JSON.stringify(DEFAULT_ADMIN_PACKAGES));
    return [...DEFAULT_ADMIN_PACKAGES];
  }
}

// ★ PERUBAHAN: Simpan paket ke API
async function adminSavePackages(packages) {
  // adminSavePackages dipanggil setelah operasi CRUD individual,
  // tidak perlu melakukan bulk save — ini hanya update localStorage sebagai cache
  localStorage.setItem(ADMIN_STORAGE.ADMIN_PACKAGES, JSON.stringify(packages));
}

// ★ PERUBAHAN: Ambil semua invoice dari API
async function adminLoadInvoices() {
  try {
    const data = await apiGet('/api/pendaftaran');
    return data;
  } catch (_) {
    const saved = localStorage.getItem(ADMIN_STORAGE.INVOICE_HISTORY);
    return saved ? JSON.parse(saved) : [];
  }
}

// ★ PERUBAHAN: adminSaveInvoices tidak lagi diperlukan (pakai API per operasi)
async function adminSaveInvoices(invoices) {
  localStorage.setItem(ADMIN_STORAGE.INVOICE_HISTORY, JSON.stringify(invoices));
}

function adminUpdateCurrentInvoice(invoiceNum, updates) {
  const current = localStorage.getItem('currentInvoice');
  if (current) {
    const currInv = JSON.parse(current);
    if (currInv.invoiceNumber === invoiceNum) {
      Object.assign(currInv, updates);
      localStorage.setItem('currentInvoice', JSON.stringify(currInv));
    }
  }
}

function adminGetStatusClass(status) {
  if (status === 'Menunggu Pembayaran') return 'badge-pending';
  if (status === 'Menunggu Verifikasi') return 'badge-waiting';
  return 'badge-verified';
}

async function adminRenderDashboard() {
  try {
    const stats = await apiGet('/api/stats');
    const { total, pending, waiting, verified, recent } = stats;

    const totalEl    = document.getElementById('totalPendaftaran');
    const pendingEl  = document.getElementById('pendingPayment');
    const waitingEl  = document.getElementById('waitingVerify');
    const verifiedEl = document.getElementById('verifiedCount');

    if (totalEl)    totalEl.textContent    = total;
    if (pendingEl)  pendingEl.textContent  = pending;
    if (waitingEl)  waitingEl.textContent  = waiting;
    if (verifiedEl) verifiedEl.textContent = verified;

    const tbody = document.getElementById('recentRegistrations');
    if (tbody) {
      if (!recent || recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada data</td></tr>';
        return;
      }
      tbody.innerHTML = recent.map(inv => `
        <tr>
          <td>${inv.invoiceNumber}</td>
          <td>${inv.jamaah?.nama || '-'}</td>
          <td>${inv.paket?.tanggal || '-'}</td>
          <td><span class="badge-status ${adminGetStatusClass(inv.status)}">${inv.status}</span></td>
          <td>${inv.tanggalDaftar || '-'}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('adminRenderDashboard error:', err);
  }
}

async function adminRenderPendaftaran() {
  const invoices = await adminLoadInvoices();
  const tbody = document.getElementById('pendaftaranTableBody');
  if (tbody) {
    if (invoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data pendaftaran</td></tr>';
      return;
    }
    tbody.innerHTML = invoices.map(inv => `
      <tr>
        <td>${inv.invoiceNumber}</td>
        <td>${inv.jamaah?.nama || '-'}</td>
        <td>${inv.jamaah?.wa || '-'}</td>
        <td>${inv.paket?.tanggal || '-'}</td>
        <td><span class="badge-status ${adminGetStatusClass(inv.status)}">${inv.status}</span></td>
        <td>
          <button class="action-btn action-view" onclick="adminViewDetail('${inv.invoiceNumber}')">Detail</button>
          <button class="action-btn action-delete" onclick="adminDeleteRegistration('${inv.invoiceNumber}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  }
}

async function adminRenderPaket() {
  const packages = await adminLoadPackages();
  const tbody = document.getElementById('paketTableBody');
  if (tbody) {
    if (packages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada paket</td></tr>';
      return;
    }
    tbody.innerHTML = packages.map(pkg => `
      <tr>
        <td>${pkg.id}</td>
        <td>${pkg.tanggal}</td>
        <td>Rp ${pkg.harga.toLocaleString('id-ID')}</td>
        <td>${pkg.label || '-'}</td>
        <td>
          <button class="action-btn action-edit" onclick="adminEditPaket('${pkg.id}')">Edit</button>
          <button class="action-btn action-delete" onclick="adminDeletePaket('${pkg.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  }
}

async function adminRenderKonfirmasi() {
  const invoices = await adminLoadInvoices();
  const pendingConfirm = invoices.filter(i =>
    i.status === 'Menunggu Verifikasi' ||
    (i.nominalTransfer && i.status !== 'Terverifikasi')
  );
  const tbody = document.getElementById('konfirmasiTableBody');
  if (tbody) {
    if (pendingConfirm.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada konfirmasi pembayaran</td></tr>';
      return;
    }
    tbody.innerHTML = pendingConfirm.map(inv => `
      <tr>
        <td>${inv.invoiceNumber}</td>
        <td>${inv.jamaah?.nama || '-'}</td>
        <td>${inv.nominalTransfer ? 'Rp ' + Number(inv.nominalTransfer).toLocaleString('id-ID') : '-'}</td>
        <td>${inv.bankPengirim || '-'}</td>
        <td><span class="badge-status ${adminGetStatusClass(inv.status)}">${inv.status}</span></td>
        <td>
          <button class="action-btn action-view" onclick="adminViewDetail('${inv.invoiceNumber}')">Detail</button>
          <button class="action-btn action-edit" onclick="adminVerifyPayment('${inv.invoiceNumber}')">Verifikasi</button>
        </td>
      </tr>
    `).join('');
  }
}

window.adminViewDetail = async function(invoiceNum) {
  const invoices = await adminLoadInvoices();
  const inv = invoices.find(i => i.invoiceNumber === invoiceNum);
  if (!inv) return;

  const modalBody = document.getElementById('modalDetailBody');
  if (modalBody) {
    modalBody.innerHTML = `
      <div class="detail-row"><div class="detail-label">Nomor Invoice</div><div class="detail-value">${inv.invoiceNumber}</div></div>
      <div class="detail-row"><div class="detail-label">Nama Lengkap</div><div class="detail-value">${inv.jamaah?.nama || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">No. KTP/Paspor</div><div class="detail-value">${inv.jamaah?.ktp || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Tanggal Lahir</div><div class="detail-value">${inv.jamaah?.lahir || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Alamat</div><div class="detail-value">${inv.jamaah?.alamat || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">No. WhatsApp</div><div class="detail-value">${inv.jamaah?.wa || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Paket</div><div class="detail-value">${inv.paket?.tanggal || '-'} (Rp ${inv.hargaPenuh?.toLocaleString('id-ID') || '-'})</div></div>
      <div class="detail-row"><div class="detail-label">Metode Pembayaran</div><div class="detail-value">${inv.keterangan || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Total Dibayar</div><div class="detail-value">Rp ${inv.totalBayar?.toLocaleString('id-ID') || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Status</div><div class="detail-value"><span class="badge-status ${adminGetStatusClass(inv.status)}">${inv.status}</span></div></div>
      ${inv.nominalTransfer ? `<div class="detail-row"><div class="detail-label">Nominal Transfer</div><div class="detail-value">Rp ${Number(inv.nominalTransfer).toLocaleString('id-ID')}</div></div>` : ''}
      ${inv.bankPengirim ? `<div class="detail-row"><div class="detail-label">Bank Pengirim</div><div class="detail-value">${inv.bankPengirim}</div></div>` : ''}
    `;
  }
  const modal = document.getElementById('modalDetail');
  if (modal) modal.classList.add('active');
};

// ★ PERUBAHAN: Hapus via API
window.adminDeleteRegistration = async function(invoiceNum) {
  if (confirm('Yakin ingin menghapus pendaftaran ini?')) {
    try {
      await apiDelete(`/api/pendaftaran/${invoiceNum}`);
    } catch (err) {
      console.warn('Hapus via API gagal, fallback localStorage:', err.message);
      // Fallback localStorage
      let invoices = JSON.parse(localStorage.getItem(ADMIN_STORAGE.INVOICE_HISTORY) || '[]');
      invoices = invoices.filter(i => i.invoiceNumber !== invoiceNum);
      localStorage.setItem(ADMIN_STORAGE.INVOICE_HISTORY, JSON.stringify(invoices));
    }

    const current = localStorage.getItem('currentInvoice');
    if (current) {
      const currInv = JSON.parse(current);
      if (currInv.invoiceNumber === invoiceNum) {
        localStorage.removeItem('currentInvoice');
      }
    }
    adminRefreshAll();
  }
};

// ★ PERUBAHAN: Verifikasi via API
window.adminVerifyPayment = async function(invoiceNum) {
  if (confirm('Verifikasi pembayaran ini? Status akan diubah menjadi Terverifikasi.')) {
    try {
      await apiPatch(`/api/pendaftaran/${invoiceNum}/verifikasi`, {});
    } catch (err) {
      console.warn('Verifikasi via API gagal, fallback localStorage:', err.message);
      // Fallback
      let invoices = JSON.parse(localStorage.getItem(ADMIN_STORAGE.INVOICE_HISTORY) || '[]');
      const idx = invoices.findIndex(i => i.invoiceNumber === invoiceNum);
      if (idx !== -1) {
        invoices[idx].status = 'Terverifikasi';
        localStorage.setItem(ADMIN_STORAGE.INVOICE_HISTORY, JSON.stringify(invoices));
      }
    }

    adminUpdateCurrentInvoice(invoiceNum, { status: 'Terverifikasi' });
    adminRefreshAll();
    alert('Pembayaran berhasil diverifikasi!');
  }
};

// ★ PERUBAHAN: Edit paket — load dari API
window.adminEditPaket = async function(pkgId) {
  const packages = await adminLoadPackages();
  const pkg = packages.find(p => p.id === pkgId);
  if (pkg) {
    const titleEl     = document.getElementById('modalPaketTitle');
    const tanggalEl   = document.getElementById('paketTanggal');
    const hargaEl     = document.getElementById('paketHarga');
    const labelEl     = document.getElementById('paketLabel');
    const fasilitasEl = document.getElementById('paketFasilitas');
    const editIdEl    = document.getElementById('paketEditId');

    if (titleEl)     titleEl.textContent = 'Edit Paket';
    if (tanggalEl)   tanggalEl.value = pkg.tanggal;
    if (hargaEl)     hargaEl.value = pkg.harga;
    if (labelEl)     labelEl.value = pkg.label || '';
    if (fasilitasEl) fasilitasEl.value = pkg.fasilitas ? pkg.fasilitas.join(', ') : '';
    if (editIdEl)    editIdEl.value = pkg.id;

    const modal = document.getElementById('modalPaket');
    if (modal) modal.classList.add('active');
  }
};

// ★ PERUBAHAN: Hapus paket via API
window.adminDeletePaket = async function(pkgId) {
  if (confirm('Yakin ingin menghapus paket ini?')) {
    try {
      await apiDelete(`/api/paket/${pkgId}`);
    } catch (err) {
      console.warn('Hapus paket via API gagal:', err.message);
    }
    adminRenderPaket();
  }
};

function adminCloseModal() {
  const modal = document.getElementById('modalDetail');
  if (modal) modal.classList.remove('active');
}

function adminClosePaketModal() {
  const modal = document.getElementById('modalPaket');
  if (modal) modal.classList.remove('active');
  const form = document.getElementById('paketForm');
  if (form) form.reset();
  const editId = document.getElementById('paketEditId');
  if (editId) editId.value = '';
}

async function adminRefreshAll() {
  adminRenderDashboard();
  adminRenderPendaftaran();
  adminRenderPaket();
  adminRenderKonfirmasi();
}

function adminInit() {
  if (!document.querySelector('.admin-sidebar')) return;

  adminRefreshAll();

  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.section-content').forEach(section => section.classList.remove('active'));

      if (tab === 'dashboard') {
        const dashSection = document.getElementById('dashboard-section');
        if (dashSection) dashSection.classList.add('active');
      } else if (tab === 'pendaftaran') {
        const pendSection = document.getElementById('pendaftaran-section');
        if (pendSection) pendSection.classList.add('active');
        adminRenderPendaftaran();
      } else if (tab === 'paket') {
        const paketSection = document.getElementById('paket-section');
        if (paketSection) paketSection.classList.add('active');
        adminRenderPaket();
      } else if (tab === 'konfirmasi') {
        const konfSection = document.getElementById('konfirmasi-section');
        if (konfSection) konfSection.classList.add('active');
        adminRenderKonfirmasi();
      }
    });
  });

  const tambahBtn = document.getElementById('btnTambahPaket');
  if (tambahBtn) {
    tambahBtn.addEventListener('click', () => {
      const titleEl     = document.getElementById('modalPaketTitle');
      const tanggalEl   = document.getElementById('paketTanggal');
      const hargaEl     = document.getElementById('paketHarga');
      const labelEl     = document.getElementById('paketLabel');
      const fasilitasEl = document.getElementById('paketFasilitas');
      const editIdEl    = document.getElementById('paketEditId');

      if (titleEl)     titleEl.textContent = 'Tambah Paket';
      if (tanggalEl)   tanggalEl.value = '';
      if (hargaEl)     hargaEl.value = '';
      if (labelEl)     labelEl.value = '';
      if (fasilitasEl) fasilitasEl.value = '';
      if (editIdEl)    editIdEl.value = '';

      const modal = document.getElementById('modalPaket');
      if (modal) modal.classList.add('active');
    });
  }

  // ★ PERUBAHAN: Simpan paket via API (POST/PUT)
  const paketForm = document.getElementById('paketForm');
  if (paketForm) {
    paketForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tanggal      = document.getElementById('paketTanggal')?.value || '';
      const harga        = parseInt(document.getElementById('paketHarga')?.value || '0');
      const label        = document.getElementById('paketLabel')?.value || '';
      const fasilitasText = document.getElementById('paketFasilitas')?.value || '';
      const fasilitas    = fasilitasText.split(',').map(f => f.trim()).filter(f => f);
      const editId       = document.getElementById('paketEditId')?.value || '';

      try {
        if (editId) {
          // Update existing
          await apiPut(`/api/paket/${editId}`, { tanggal, harga, label, fasilitas });
        } else {
          // Tambah baru
          const packages = await adminLoadPackages();
          const newId = 'PKT' + String(packages.length + 5).padStart(2, '0');
          await apiPost('/api/paket', {
            id: newId, tanggal, harga, label,
            fasilitas: fasilitas.length ? fasilitas : ['Tiket Pesawat', 'Hotel', 'Pembimbing', 'Visa']
          });
        }
      } catch (err) {
        console.warn('Simpan paket via API gagal, fallback localStorage:', err.message);
        // Fallback localStorage
        let packages = JSON.parse(localStorage.getItem(ADMIN_STORAGE.ADMIN_PACKAGES) || '[]');
        if (editId) {
          const index = packages.findIndex(p => p.id === editId);
          if (index !== -1) {
            packages[index] = { ...packages[index], tanggal, harga, label, fasilitas: fasilitas.length ? fasilitas : packages[index].fasilitas };
          }
        } else {
          const newId = 'PKT' + String(packages.length + 5).padStart(2, '0');
          packages.push({ id: newId, tanggal, harga, label, fasilitas: fasilitas.length ? fasilitas : ['Tiket Pesawat', 'Hotel', 'Pembimbing', 'Visa'] });
        }
        localStorage.setItem(ADMIN_STORAGE.ADMIN_PACKAGES, JSON.stringify(packages));
      }

      adminClosePaketModal();
      adminRenderPaket();
      alert('Paket berhasil disimpan!');
    });
  }

  const toggleBtn = document.getElementById('adminToggle');
  const sidebar   = document.getElementById('adminSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  const modalDetail = document.getElementById('modalDetail');
  const modalPaket  = document.getElementById('modalPaket');

  if (modalDetail) {
    modalDetail.addEventListener('click', (e) => {
      if (e.target === modalDetail) adminCloseModal();
    });
  }
  if (modalPaket) {
    modalPaket.addEventListener('click', (e) => {
      if (e.target === modalPaket) adminClosePaketModal();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  adminInit();
});
