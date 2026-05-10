// =============================================
// SIAP PPDB v7 - server.js
// Fitur baru:
//   1. Identitas wali murid (namaWali, pekerjaanWali, noHPWali, alamatWali)
//   2. Upload dokumen ganda (foto, ijazah, akta, kk) via multer
//   3. Hasil tes offline (nilaiTes, hasilTes, catatanAdmin)
//   4. Endpoint PATCH /api/pendaftar/:id/tes untuk input hasil tes
// =============================================

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const session  = require('express-session');
const bcrypt   = require('bcrypt');
const multer   = require('multer');
const fs       = require('fs');

const app  = express();
const PORT = 3000;

// Path file JSON penyimpanan
const FILE_DATA   = path.join(__dirname, 'data.json');
const FILE_ADMIN  = path.join(__dirname, 'admin.json');
const FOLDER_UPLOAD = path.join(__dirname, '../uploads');

// Pastikan folder uploads ada
if (!fs.existsSync(FOLDER_UPLOAD)) fs.mkdirSync(FOLDER_UPLOAD, { recursive: true });

// ===== Fungsi baca/tulis JSON =====
function bacaData() {
  try {
    if (!fs.existsSync(FILE_DATA)) return [];
    return JSON.parse(fs.readFileSync(FILE_DATA, 'utf8'));
  } catch { return []; }
}
function simpanData(data) {
  fs.writeFileSync(FILE_DATA, JSON.stringify(data, null, 2), 'utf8');
}
function bacaAdmin() {
  try {
    if (!fs.existsSync(FILE_ADMIN)) return [];
    return JSON.parse(fs.readFileSync(FILE_ADMIN, 'utf8'));
  } catch { return []; }
}
function simpanAdmin(data) {
  fs.writeFileSync(FILE_ADMIN, JSON.stringify(data, null, 2), 'utf8');
}

let daftarPendaftar = bacaData();
let daftarAdmin     = bacaAdmin();
const BCRYPT_ROUNDS = 10;

// ===== Generate NIM otomatis =====
function generateNIM(jurusan) {
  const kodeJurusan = { 'IPA': '01', 'IPS': '02', 'Bahasa': '03' };
  const kode   = kodeJurusan[jurusan] || '00';
  const tahun  = new Date().getFullYear().toString().slice(-2);
  const maxId  = daftarPendaftar.reduce((max, p) => Math.max(max, p.id || 0), 0);
  const urut   = (maxId + 1).toString().padStart(4, '0');
  return `${kode}${tahun}${urut}`;
}

// =============================================
// [DIUPDATE] KONFIGURASI MULTER
// Sekarang mendukung 4 jenis dokumen:
//   foto   → hanya gambar (jpg/png)
//   ijazah, akta, kk → gambar atau PDF
// =============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FOLDER_UPLOAD),
  // Nama file: jenis-dokumen_timestamp.ext agar mudah dikenali
  filename: (req, file, cb) => {
    const ext     = path.extname(file.originalname).toLowerCase();
    const namaUnik = `${file.fieldname}_${Date.now()}${ext}`;
    cb(null, namaUnik);
  }
});

// [DIUPDATE] Filter file: foto hanya jpg/png, dokumen bisa + pdf
const filterFile = (req, file, cb) => {
  const gambar = ['image/jpeg', 'image/jpg', 'image/png'];
  const semua  = [...gambar, 'application/pdf'];

  if (file.fieldname === 'foto') {
    // Foto profil: hanya gambar
    if (gambar.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Foto hanya boleh JPG/PNG!'), false);
  }
  // Dokumen lain (ijazah, akta, kk): gambar atau PDF
  if (semua.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`File ${file.fieldname} hanya boleh JPG/PNG/PDF!`), false);
};

// [DIUPDATE] upload.fields() untuk terima beberapa file sekaligus
const upload = multer({
  storage,
  fileFilter: filterFile,
  limits: { fileSize: 2 * 1024 * 1024 } // maks 2MB per file
}).fields([
  { name: 'foto',   maxCount: 1 },
  { name: 'ijazah', maxCount: 1 },
  { name: 'akta',   maxCount: 1 },
  { name: 'kk',     maxCount: 1 }
]);

// ===== MIDDLEWARE =====
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  secret: 'siap-ppdb-rahasia-super-aman-v7',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2, httpOnly: true }
}));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(FOLDER_UPLOAD));

function cekLogin(req, res, next) {
  if (!req.session.admin)
    return res.status(401).json({ berhasil: false, pesan: 'Akses ditolak. Silakan login terlebih dahulu.' });
  next();
}

// ===== AUTENTIKASI ADMIN (tidak berubah) =====
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ berhasil: false, pesan: 'Email dan password harus diisi!' });
  if (!email.includes('@')) return res.status(400).json({ berhasil: false, pesan: 'Format email tidak valid!' });
  if (password.length < 6)  return res.status(400).json({ berhasil: false, pesan: 'Password minimal 6 karakter!' });
  daftarAdmin = bacaAdmin();
  if (daftarAdmin.find(a => a.email === email))
    return res.status(400).json({ berhasil: false, pesan: 'Email ini sudah terdaftar!' });
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  daftarAdmin.push({ id: daftarAdmin.length + 1, email: email.toLowerCase().trim(), passwordHash, waktuDaftar: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) });
  simpanAdmin(daftarAdmin);
  res.status(201).json({ berhasil: true, pesan: 'Akun admin berhasil dibuat!' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ berhasil: false, pesan: 'Email dan password harus diisi!' });
  daftarAdmin = bacaAdmin();
  const admin = daftarAdmin.find(a => a.email === email.toLowerCase().trim());
  if (!admin) return res.status(401).json({ berhasil: false, pesan: 'Email atau password salah!' });
  if (!await bcrypt.compare(password, admin.passwordHash))
    return res.status(401).json({ berhasil: false, pesan: 'Email atau password salah!' });
  req.session.admin = { id: admin.id, email: admin.email, waktuLogin: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) };
  res.json({ berhasil: true, pesan: 'Login berhasil!' });
});

app.post('/api/reset-password', async (req, res) => {
  const { email, passwordBaru } = req.body;
  if (!email || !passwordBaru) return res.status(400).json({ berhasil: false, pesan: 'Email dan password baru harus diisi!' });
  if (passwordBaru.length < 6) return res.status(400).json({ berhasil: false, pesan: 'Password baru minimal 6 karakter!' });
  daftarAdmin = bacaAdmin();
  const idx = daftarAdmin.findIndex(a => a.email === email.toLowerCase().trim());
  if (idx === -1) return res.status(404).json({ berhasil: false, pesan: 'Email tidak ditemukan!' });
  daftarAdmin[idx].passwordHash = await bcrypt.hash(passwordBaru, BCRYPT_ROUNDS);
  simpanAdmin(daftarAdmin);
  res.json({ berhasil: true, pesan: 'Password berhasil direset!' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ berhasil: true }); });
});

app.get('/api/cek-login', (req, res) => {
  res.json(req.session.admin ? { sudahLogin: true, admin: req.session.admin } : { sudahLogin: false });
});

// =============================================
// [DIUPDATE] POST /api/daftar
// Perubahan:
//   - Terima 4 file sekaligus (foto, ijazah, akta, kk)
//   - Terima field wali (namaWali, pekerjaanWali, noHPWali, alamatWali)
//   - Validasi semua field wali wajib diisi
//   - Simpan path semua dokumen ke data siswa
// =============================================
app.post('/api/daftar', (req, res) => {
  // upload.fields() sudah dikonfigurasi di atas, jalankan sebagai middleware manual
  upload(req, res, function(err) {
    // Tangkap error dari multer (misal: format file salah, ukuran lewat batas)
    if (err) {
      return res.status(400).json({ berhasil: false, pesan: err.message });
    }

    const {
      nama, nisn, alamat, asalSekolah, noHP, jenisKelamin, jurusan,
      // [BARU] Field identitas wali murid
      namaWali, pekerjaanWali, noHPWali, alamatWali
    } = req.body;

    // Validasi field siswa
    if (!nama || !nisn || !alamat || !asalSekolah || !noHP || !jenisKelamin || !jurusan)
      return res.status(400).json({ berhasil: false, pesan: 'Semua data siswa harus diisi!' });

    // [BARU] Validasi field wali — wajib semua
    if (!namaWali || !pekerjaanWali || !noHPWali || !alamatWali)
      return res.status(400).json({ berhasil: false, pesan: 'Semua data wali murid harus diisi!' });

    if (!/^\d{10}$/.test(nisn))
      return res.status(400).json({ berhasil: false, pesan: 'NISN harus 10 digit angka!' });
    if (!['Laki-laki', 'Perempuan'].includes(jenisKelamin))
      return res.status(400).json({ berhasil: false, pesan: 'Jenis kelamin tidak valid!' });
    if (!['IPA', 'IPS', 'Bahasa'].includes(jurusan))
      return res.status(400).json({ berhasil: false, pesan: 'Pilihan jurusan tidak valid!' });

    // [BARU] Validasi: semua dokumen wajib diupload
    const files = req.files || {};
    if (!files.foto)   return res.status(400).json({ berhasil: false, pesan: 'Foto siswa wajib diupload!' });
    if (!files.ijazah) return res.status(400).json({ berhasil: false, pesan: 'Ijazah/SKL wajib diupload!' });
    if (!files.akta)   return res.status(400).json({ berhasil: false, pesan: 'Akta Kelahiran wajib diupload!' });
    if (!files.kk)     return res.status(400).json({ berhasil: false, pesan: 'Kartu Keluarga wajib diupload!' });

    daftarPendaftar = bacaData();

    if (daftarPendaftar.find(p => p.nisn === nisn.trim()))
      return res.status(400).json({ berhasil: false, pesan: 'NISN ini sudah terdaftar!' });

    const nim = generateNIM(jurusan);

    // [DIUPDATE] Objek pendaftar sekarang menyertakan wali & semua dokumen
    const pendaftarBaru = {
      id: (daftarPendaftar.reduce((max, p) => Math.max(max, p.id || 0), 0)) + 1,
      nim,
      // Data siswa
      nama: nama.trim(),
      nisn: nisn.trim(),
      jenisKelamin,
      alamat: alamat.trim(),
      asalSekolah: asalSekolah.trim(),
      noHP: noHP.trim(),
      jurusan,
      // [BARU] Identitas wali murid
      namaWali: namaWali.trim(),
      pekerjaanWali: pekerjaanWali.trim(),
      noHPWali: noHPWali.trim(),
      alamatWali: alamatWali.trim(),
      // [BARU] Dokumen (simpan nama file saja, URL diakses via /uploads/namafile)
      foto:   files.foto[0].filename,
      ijazah: files.ijazah[0].filename,
      akta:   files.akta[0].filename,
      kk:     files.kk[0].filename,
      // Status & hasil tes (default kosong)
      status: 'pending',
      catatan: '',
      // [BARU] Hasil tes offline — diisi admin nanti
      nilaiTes:    null,
      hasilTes:    null,   // Diproses / Lulus / Cadangan / Tidak Lulus
      catatanAdmin: '',
      waktuDaftar: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jakarta' })
    };

    daftarPendaftar.push(pendaftarBaru);
    simpanData(daftarPendaftar);

    console.log(`[+] Pendaftar: ${nama} | NIM: ${nim} | Dokumen: foto,ijazah,akta,kk`);
    res.status(201).json({ berhasil: true, pesan: 'Pendaftaran berhasil!', data: pendaftarBaru });
  });
});

// ===== GET /api/pendaftar (tidak berubah) =====
app.get('/api/pendaftar', cekLogin, (req, res) => {
  daftarPendaftar = bacaData();
  res.json(daftarPendaftar);
});

// =============================================
// [BARU] PATCH /api/pendaftar/:id/tes
// Admin menginput nilai dan hasil tes offline
// Body: { nilaiTes, hasilTes, catatanAdmin }
// =============================================
app.patch('/api/pendaftar/:id/tes', cekLogin, (req, res) => {
  const id = parseInt(req.params.id);
  const { nilaiTes, hasilTes, catatanAdmin } = req.body;

  // Validasi hasilTes harus salah satu dari pilihan
  const hasilValid = ['Diproses', 'Lulus', 'Cadangan', 'Tidak Lulus'];
  if (hasilTes && !hasilValid.includes(hasilTes))
    return res.status(400).json({ berhasil: false, pesan: 'Hasil tes tidak valid!' });

  // Validasi nilaiTes harus angka 0-100
  if (nilaiTes !== null && nilaiTes !== undefined && nilaiTes !== '') {
    const nilai = Number(nilaiTes);
    if (isNaN(nilai) || nilai < 0 || nilai > 100)
      return res.status(400).json({ berhasil: false, pesan: 'Nilai tes harus angka 0-100!' });
  }

  daftarPendaftar = bacaData();
  const idx = daftarPendaftar.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ berhasil: false, pesan: 'Data tidak ditemukan!' });

  // Update field hasil tes
  daftarPendaftar[idx].nilaiTes    = nilaiTes !== '' ? Number(nilaiTes) : null;
  daftarPendaftar[idx].hasilTes    = hasilTes    || null;
  daftarPendaftar[idx].catatanAdmin = catatanAdmin || '';

  // Sinkronisasi: update juga field status berdasarkan hasilTes
  // agar cek-status.html siswa juga mendapat info terbaru
  if (hasilTes === 'Lulus')       daftarPendaftar[idx].status = 'diterima';
  else if (hasilTes === 'Tidak Lulus') daftarPendaftar[idx].status = 'ditolak';
  else if (hasilTes === 'Cadangan')    daftarPendaftar[idx].status = 'diverifikasi';
  else                                  daftarPendaftar[idx].status = 'pending';

  simpanData(daftarPendaftar);
  console.log(`[✓] Hasil tes: ${daftarPendaftar[idx].nama} → ${hasilTes} (Nilai: ${nilaiTes})`);
  res.json({ berhasil: true, pesan: 'Hasil tes berhasil disimpan.', data: daftarPendaftar[idx] });
});

// ===== PATCH /api/pendaftar/:id/status (tidak berubah) =====
app.patch('/api/pendaftar/:id/status', cekLogin, (req, res) => {
  const id = parseInt(req.params.id);
  const { status, catatan } = req.body;
  const statusValid = ['pending', 'diverifikasi', 'diterima', 'ditolak'];
  if (!statusValid.includes(status))
    return res.status(400).json({ berhasil: false, pesan: 'Status tidak valid!' });
  daftarPendaftar = bacaData();
  const idx = daftarPendaftar.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ berhasil: false, pesan: 'Data tidak ditemukan!' });
  daftarPendaftar[idx].status  = status;
  daftarPendaftar[idx].catatan = catatan || '';
  simpanData(daftarPendaftar);
  res.json({ berhasil: true, pesan: 'Status berhasil diperbarui.', data: daftarPendaftar[idx] });
});

// ===== DELETE /api/pendaftar/:id =====
app.delete('/api/pendaftar/:id', cekLogin, (req, res) => {
  const id = parseInt(req.params.id);
  daftarPendaftar = bacaData();
  const idx = daftarPendaftar.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ berhasil: false, pesan: 'Data tidak ditemukan!' });
  const p = daftarPendaftar[idx];

  // Hapus semua file dokumen dari disk
  ['foto', 'ijazah', 'akta', 'kk'].forEach(field => {
    if (p[field]) {
      const filePath = path.join(FOLDER_UPLOAD, p[field]);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  daftarPendaftar.splice(idx, 1);
  simpanData(daftarPendaftar);
  console.log(`[✓] Dihapus: ${p.nama} (ID: ${id})`);
  res.json({ berhasil: true, pesan: `Data ${p.nama} berhasil dihapus.` });
});

// ===== GET /api/status/:nisn (publik) =====
app.get('/api/status/:nisn', (req, res) => {
  daftarPendaftar = bacaData();
  const p = daftarPendaftar.find(p => p.nisn === req.params.nisn);
  if (!p) return res.status(404).json({ berhasil: false, pesan: 'NISN tidak ditemukan.' });
  res.json({ berhasil: true, data: {
    nim: p.nim, nama: p.nama, jurusan: p.jurusan,
    status: p.status, catatan: p.catatan,
    // [BARU] Sertakan juga hasil tes untuk siswa
    nilaiTes: p.nilaiTes, hasilTes: p.hasilTes, catatanAdmin: p.catatanAdmin,
    waktuDaftar: p.waktuDaftar
  }});
});

// ===== GET /api/export =====
app.get('/api/export', cekLogin, (req, res) => {
  daftarPendaftar = bacaData();
  // [DIUPDATE] Tambah kolom wali dan hasil tes di CSV
  const header = ['NIM','Nama','NISN','JK','Jurusan','Asal Sekolah','No HP',
                  'Nama Wali','Pekerjaan Wali','No HP Wali',
                  'Status','Hasil Tes','Nilai Tes','Catatan Admin','Waktu Daftar'];
  const escapeCSV = v => {
    const s = String(v ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const baris = daftarPendaftar.map(p =>
    [p.nim, p.nama, p.nisn, p.jenisKelamin, p.jurusan, p.asalSekolah, p.noHP,
     p.namaWali, p.pekerjaanWali, p.noHPWali,
     p.status, p.hasilTes, p.nilaiTes, p.catatanAdmin, p.waktuDaftar].map(escapeCSV).join(',')
  );
  const csv = [header.join(','), ...baris].join('\n');
  const tgl = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pendaftar-ppdb-${tgl}.csv"`);
  res.send('\uFEFF' + csv);
});

// ===== Inisialisasi & Start =====
async function inisialisasi() {
  daftarAdmin = bacaAdmin();
  if (daftarAdmin.length === 0) {
    const hash = await bcrypt.hash('123456', BCRYPT_ROUNDS);
    daftarAdmin.push({ id: 1, email: 'admin@ppdb.com', passwordHash: hash, waktuDaftar: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) });
    simpanAdmin(daftarAdmin);
    console.log('[✓] Akun admin default: admin@ppdb.com / 123456');
  }
  app.listen(PORT, () => {
    console.log('=====================================');
    console.log('🚀 Server SIAP PPDB v7 berjalan!');
    console.log('🌐 http://localhost:' + PORT);
    console.log('=====================================');
  });
}
inisialisasi();
