// =============================================
// popup-persyaratan.js
// Popup persyaratan PPDB — dimuat di index.html & daftar.html
//
// Cara kerja:
// 1. Cek sessionStorage → jika belum pernah muncul di sesi ini → tampilkan
// 2. Animasi: fade + slide menggunakan CSS class toggle
// 3. Tutup via: tombol X / tombol "Mengerti" / klik overlay / tekan Escape
// 4. Setelah ditutup → simpan flag di sessionStorage (hilang saat tab ditutup)
// =============================================

(function () {
  // sessionStorage: data hilang saat tab/browser ditutup
  // Artinya popup muncul lagi setiap kali buka halaman baru / refresh
  const STORAGE_KEY = 'ppdb_popup_shown';

  // ===== BUAT ELEMEN POPUP =====
  function buatPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'popupOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'popupJudul');

    overlay.innerHTML = `
      <div class="popup-box" id="popupBox">

        <!-- Header: ikon + judul + tombol X -->
        <div class="popup-header">
          <div class="popup-header-left">
            <div class="popup-ikon-wrap">⚠️</div>
            <div>
              <h2 class="popup-judul" id="popupJudul">Perhatian</h2>
              <p class="popup-subjudul">Baca sebelum melanjutkan pendaftaran</p>
            </div>
          </div>
          <button class="popup-btn-close" id="popupBtnClose" aria-label="Tutup">✕</button>
        </div>

        <!-- Body: isi persyaratan -->
        <div class="popup-body">

          <!-- Persyaratan Umum -->
          <div class="popup-section">
            <div class="popup-section-icon">📋</div>
            <div class="popup-section-content">
              <p class="popup-section-title">Persyaratan Umum</p>
              <ul class="popup-list">
                <li>Calon peserta didik <strong>wajib mengisi data dengan benar dan valid</strong></li>
                <li>Pendaftaran hanya berlaku untuk <strong>tahun ajaran berjalan</strong></li>
                <li>Jika terdapat kesalahan data, segera hubungi admin sekolah</li>
                <li>Tes seleksi dilakukan <strong>secara offline</strong> sesuai jadwal sekolah</li>
              </ul>
            </div>
          </div>

          <!-- Dokumen Wajib -->
          <div class="popup-section">
            <div class="popup-section-icon">📁</div>
            <div class="popup-section-content">
              <p class="popup-section-title">Dokumen Wajib Diupload</p>
              <p style="font-size:13px;color:#6b7280;margin-bottom:10px;font-family:'Plus Jakarta Sans',sans-serif;">
                Siapkan semua dokumen sebelum mengisi formulir.
              </p>
              <div class="popup-dok-grid">
                <div class="popup-dok-item">🖼️ Foto Siswa<small>JPG / PNG · Maks 2MB</small></div>
                <div class="popup-dok-item">📜 Ijazah / SKL<small>JPG / PNG / PDF · Maks 2MB</small></div>
                <div class="popup-dok-item">📋 Akta Kelahiran<small>JPG / PNG / PDF · Maks 2MB</small></div>
                <div class="popup-dok-item">🏠 Kartu Keluarga<small>JPG / PNG / PDF · Maks 2MB</small></div>
              </div>
            </div>
          </div>

          <!-- Pilihan Jurusan -->
          <div class="popup-section">
            <div class="popup-section-icon">📚</div>
            <div class="popup-section-content">
              <p class="popup-section-title">Pilihan Jurusan (Kurikulum Merdeka)</p>
              <div class="popup-jurusan-row">
                <span class="popup-badge-ipa">🔬 IPA</span>
                <span class="popup-badge-ips">🌐 IPS</span>
                <span class="popup-badge-bhs">📝 BAHASA</span>
              </div>
            </div>
          </div>

          <!-- Kontak Sekolah -->
          <div class="popup-kontak">
            <p class="popup-section-title" style="margin-bottom:10px;">📞 Informasi & Bantuan</p>
            <div class="popup-kontak-grid">
              <div class="popup-kontak-item">
                <span class="popup-kontak-icon">📍</span>
                <span>Jl. Pendidikan No. 123, Kota Pintar 12345</span>
              </div>
              <div class="popup-kontak-item">
                <span class="popup-kontak-icon">📞</span>
                <span>(021) 1234-5678</span>
              </div>
              <div class="popup-kontak-item">
                <span class="popup-kontak-icon">📧</span>
                <span>info@smaswasta.sch.id</span>
              </div>
            </div>
          </div>

        </div><!-- end .popup-body -->

        <!-- Footer: disclaimer + tombol -->
        <div class="popup-footer">
          <p class="popup-disclaimer">
            Dengan melanjutkan, Anda menyatakan telah membaca dan memahami seluruh persyaratan di atas.
          </p>
          <button class="popup-btn-mengerti" id="popupBtnMengerti">
            ✅ Baik, Saya Mengerti
          </button>
        </div>

      </div>
    `;

    return overlay;
  }

  // ===== TUTUP POPUP =====
  function tutupPopup(overlay) {
    overlay.classList.add('popup-fade-out');
    // Hapus dari DOM setelah animasi selesai
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.style.overflow = ''; // Kembalikan scroll
    }, 300);
    // Tandai sudah ditampilkan di sesi ini
    sessionStorage.setItem(STORAGE_KEY, '1');
  }

  // ===== INISIALISASI =====
  function init() {
    // Jika popup sudah muncul di sesi ini, jangan tampilkan lagi
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const overlay = buatPopup();
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden'; // Kunci scroll halaman

    // Trigger animasi (butuh 2x rAF agar transisi CSS aktif)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('popup-visible');
      });
    });

    // Tombol X
    document.getElementById('popupBtnClose').addEventListener('click', function () {
      tutupPopup(overlay);
    });

    // Tombol "Baik, Saya Mengerti"
    document.getElementById('popupBtnMengerti').addEventListener('click', function () {
      tutupPopup(overlay);
    });

    // Klik di luar popup-box
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) tutupPopup(overlay);
    });

    // Tekan Escape
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        tutupPopup(overlay);
        document.removeEventListener('keydown', onEsc);
      }
    });
  }

  // Jalankan setelah DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(); // IIFE — tidak mencemari scope global
