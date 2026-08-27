# MASTER PROMPT — PRE-LAUNCH BUG FIX & UI/UX FINAL POLISH

## Sistem Manajemen Pembayaran Pondok Pesantren (PondokPay)

Project ini **akan segera dipublish/live** dan dipakai wali santri & admin sungguhan. Fokus utama sekarang adalah **memastikan tidak ada bug data, memperbaiki navbar yang rusak saat scroll, dan menyempurnakan UI/UX + animasi** di seluruh aplikasi (desktop & mobile), sebelum go-live.

**Jangan membuat ulang sistem dari nol. Jangan mengubah struktur database yang sudah berjalan.** Ini murni sesi perbaikan bug + polish, bukan redesign besar-besaran.

---

## 1. BUG KRITIS — DATA SANTRI HILANG/TERTIMPA SAAT VERIFIKASI

Ini prioritas nomor satu, karena menyangkut kehilangan data sungguhan.

### Gejala yang dilaporkan

Dari 51 data santri asli yang sudah diinput, salah satu santri (misalnya "Fatin Mahajarah") **tiba-tiba hilang/tertimpa** oleh data santri lain yang tidak dikenali (misalnya "Rizki Pratama") — terjadi di sekitar proses verifikasi pembayaran.

### Yang harus dilakukan

1. **Audit SEMUA fungsi yang membuat ID data baru** (santri, pembayaran, tagihan, pengumuman, entri kas, notifikasi, dan tipe data lain apapun). Cari pola pembuatan ID yang **hanya mengandalkan timestamp** (misal `` `prefix_${Date.now()}` ``) **tanpa** komponen acak tambahan.
2. Pola seperti itu punya risiko **collision**: kalau dua data dibuat dalam milidetik yang sama (klik ganda, submit form dua kali karena tombol tidak ter-disable saat proses simpan, race condition jaringan), keduanya bisa mendapat ID yang **identik**. Karena penyimpanan ke database pakai `setDoc`/`overwrite` berdasarkan ID tersebut, data yang lebih baru akan **menimpa total** data yang lebih lama tanpa peringatan atau konfirmasi apapun.
3. **Perbaiki semua ID generator yang rawan itu** supaya selalu unik — kombinasikan timestamp dengan suffix acak (contoh: `` `s_${Date.now()}_${Math.random().toString(36).slice(2,8)}` ``), bukan timestamp saja.
4. Setelah ID diperbaiki, **audit ulang semua tombol "Simpan"/"Tambah"** di seluruh form (tambah santri, tambah pembayaran, dll) — pastikan tombolnya otomatis ter-disable / berubah jadi status "Menyimpan..." begitu diklik, supaya submit ganda karena klik cepat tidak mungkin terjadi lagi dari sisi UI juga (pertahanan berlapis, bukan cuma andalkan ID unik).
5. Cek juga apakah proses **verifikasi pembayaran** (approve/reject) memakai data santri yang sudah usang (stale state) saat menyimpan — pastikan proses ini selalu ambil data terbaru sebelum menyimpan perubahan balik ke database, supaya tidak ada field lain yang ikut tertimpa dengan data lama secara tidak sengaja.
6. Jangan menghapus data santri manapun sebagai bagian dari perbaikan ini — ini murni perbaikan bug ke depan, bukan migrasi data.

---

## 2. NAVBAR / TAB NAVIGASI ADMIN — PERBAIKI PERILAKU SAAT SCROLL

### Masalah

Di halaman dashboard admin (desktop), navbar/tab navigasi (Dashboard, Santri, Pembayaran, dst) **terlihat rusak saat di-scroll** — seperti "nyatu"/ikut turun dengan konten, posisinya aneh, terkesan setengah-nempel-setengah-enggak. Terlihat tidak profesional.

### Yang diinginkan

Pilih salah satu pendekatan berikut, mana yang paling rapi secara visual:

- **Opsi A (disarankan):** Navbar/tab navigasi menempel penuh di posisi paling atas area konten begitu mulai discroll (`sticky` tepat di batas atas, tanpa jarak kosong aneh), dengan latar belakang solid/blur supaya konten di baliknya tidak "tembus" terlihat.
- **Opsi B:** Navbar hilang (fade/slide out) saat scroll ke bawah, dan muncul kembali saat scroll ke atas — pola umum di aplikasi mobile modern.

Yang PALING PENTING: jangan sampai posisinya "nanggung" — baik nempel maupun hilang, transisinya harus terlihat sengaja dan halus, bukan seperti bug.

Audit juga apakah ada elemen sticky/fixed lain di halaman lain (dashboard wali santri, halaman publik) yang punya masalah serupa (offset yang salah, tidak sinkron dengan container scroll-nya).

---

## 3. UI/UX POLISH MENYELURUH — DESKTOP & MOBILE

Setelah dua hal di atas selesai (karena itu prioritas), lanjutkan ke polish visual umum:

- Audit semua halaman di mode **desktop (1280–1920px)** dan **mobile (360–430px)** — pastikan tidak ada elemen yang terpotong, overflow horizontal, tombol kekecilan di mobile, atau spacing yang tidak konsisten.
- Pastikan **konsistensi visual** antar halaman (dashboard, santri, pembayaran, SPP, transaksi, profil, pengaturan) — semua harus terasa satu produk, bukan potongan-potongan berbeda gaya.
- Perbaiki detail kecil yang menurunkan kesan "premium": alignment, ukuran font yang konsisten, warna status yang jelas (lunas/hijau, belum lunas/merah, menunggu/kuning), radius & shadow yang seragam.

---

## 4. HALAMAN LOGIN & "OPEN HANDLING" (FEEDBACK PROSES)

Perbaiki dan percantik pengalaman dari mulai user membuka aplikasi sampai berhasil masuk & bertransaksi:

- **Halaman login**: pastikan animasi transisi antar step (cari nama → konfirmasi NIS → berhasil masuk) halus, tidak kaku.
- **State error**: kalau NIS salah / login gagal, tampilkan pesan error yang jelas dan manusiawi (bukan pesan teknis), dengan animasi muncul yang halus (bukan tiba-tiba nongol).
- **State sukses/transaksi berhasil**: setelah pembayaran berhasil dikirim atau diverifikasi, tampilkan konfirmasi visual yang jelas (ikon centang, animasi, ringkasan transaksi) sebelum user lanjut ke halaman berikutnya — jangan langsung pindah halaman tanpa jeda konfirmasi.
- **Loading state**: setiap proses yang makan waktu (submit form, verifikasi admin, upload bukti pembayaran) harus punya indikator loading yang jelas, bukan halaman diam tanpa respons.

---

## 5. ANIMATION SYSTEM

Tambahkan animasi yang **halus dan cepat** (durasi sekitar 150–300ms), dipakai konsisten di:

- Transisi antar halaman/tab (fade + sedikit slide)
- Modal & dialog (scale + fade saat buka/tutup)
- Tombol (sedikit scale saat ditekan)
- Notifikasi/toast (slide in, fade out)
- Kartu statistik & chart (muncul dengan animasi ringan saat pertama kali tampil)

**Jangan berlebihan** — animasi harus terasa premium dan mendukung, bukan mengganggu atau memperlambat penggunaan aplikasi.

---

## 6. ATURAN WAJIB SEBELUM DIANGGAP SELESAI

1. **Nol error** — jalankan type-check dan build production, pastikan keduanya lolos tanpa satupun error sebelum menyatakan pekerjaan selesai. Project ini akan segera dipublish, jadi ini bukan opsional.
2. Jangan menghapus atau mengubah fitur yang sudah berjalan.
3. Jangan mengubah struktur database/koleksi Firestore yang sudah ada.
4. Jangan mengorbankan fungsi demi animasi/visual — kalau ada trade-off, fungsi menang.
5. Setelah selesai, jelaskan secara jujur bagian mana yang sudah benar-benar diperbaiki & diuji, dan bagian mana (kalau ada) yang masih perlu pengecekan lebih lanjut — jangan mengklaim "semua sudah sempurna" tanpa bukti nyata (hasil build, penjelasan fix per bug).

---

## PRIORITAS PENGERJAAN

1. Bug kehilangan data santri (Bagian 1) — **paling kritis, kerjakan duluan**
2. Navbar/sticky nav yang rusak (Bagian 2)
3. Zero-error check menyeluruh (Bagian 6.1)
4. UI/UX polish desktop & mobile (Bagian 3)
5. Login page & open handling (Bagian 4)
6. Animation system (Bagian 5)
