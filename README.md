# 🎓 SIAP PPDB v2.0
### Sistem Informasi Penerimaan Peserta Didik Baru - dengan Login Admin

---

## 📁 Struktur Project

```
siap-ppdb/
├── frontend/
│   ├── index.html      → Halaman utama (landing page)
│   ├── daftar.html     → Halaman form pendaftaran siswa
│   ├── login.html      → Halaman login admin ⭐ BARU
│   ├── admin.html      → Dashboard admin (terproteksi)
│   └── style.css       → Styling semua halaman
├── backend/
│   └── server.js       → Server Express + Session
├── package.json        → Info project & library
└── README.md           → Panduan ini
```

---

## 🚀 Cara Menjalankan

### Langkah 1 - Pastikan Node.js sudah terinstal
```bash
node --version
```
Download di https://nodejs.org jika belum ada.

### Langkah 2 - Masuk ke folder project
```bash
cd siap-ppdb
```

### Langkah 3 - Install library (termasuk express-session yang baru)
```bash
npm install
```

### Langkah 4 - Jalankan server
```bash
npm start
```

### Langkah 5 - Buka browser
```
http://localhost:3000
```

---

## 🔐 Alur Login Admin

```
[1] Buka /login.html
[2] Isi email: admin@ppdb.com  |  password: 123456
[3] Klik "Masuk" → JS kirim POST /api/login ke server
[4] Server cocokkan email+password dengan akun hardcoded
[5] Jika cocok → server buat SESSION & kirim COOKIE ke browser
[6] Browser redirect ke /admin.html
[7] admin.html fetch GET /api/cek-login (kirim cookie otomatis)
[8] Server cek cookie → temukan session → izinkan akses
[9] Data pendaftar ditampilkan ✅
[10] Klik Logout → POST /api/logout → session dihapus di server
```

---

## 📖 Halaman & URL

| Halaman | URL | Akses |
|---------|-----|-------|
| Beranda | http://localhost:3000 | Publik |
| Pendaftaran | http://localhost:3000/daftar.html | Publik |
| Login Admin | http://localhost:3000/login.html | Publik |
| Dashboard Admin | http://localhost:3000/admin.html | Harus Login |

---

## 🔌 Endpoint API

| Method | URL | Proteksi | Fungsi |
|--------|-----|----------|--------|
| POST | /api/login | ❌ Publik | Login admin |
| POST | /api/logout | ❌ Publik | Logout admin |
| GET | /api/cek-login | ❌ Publik | Cek status sesi |
| POST | /api/daftar | ❌ Publik | Kirim pendaftaran |
| GET | /api/pendaftar | ✅ Login | Ambil semua data |

---

## ⚠️ Catatan Penting
- Akun admin disimpan langsung di kode (hardcoded) — hanya untuk belajar
- Data pendaftar tersimpan di memori, hilang saat server dimatikan
- Untuk produksi: gunakan database & enkripsi password (bcrypt)
