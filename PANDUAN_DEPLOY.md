# Panduan Setup Database (Firebase) & Deploy ke Vercel

Aplikasi ini sekarang bisa memakai **Firebase (Firestore + Storage)** sebagai
database sungguhan yang gratis, permanen, dan bisa diakses banyak orang
sekaligus (misal 60+ wali santri + admin, semua login dari HP masing-masing
dan datanya tetap sama/real-time). Kalau belum diisi, aplikasi tetap jalan
normal tapi datanya hanya tersimpan di browser masing-masing (localStorage) —
jadi **wajib** disetel dulu sebelum dipakai banyak orang.

## 1. Bikin Project Firebase (gratis)

1. Buka https://console.firebase.google.com, login pakai akun Google.
2. Klik **Add project** → kasih nama (misal `p2m-payment-pp`) → lanjut sampai selesai (boleh matikan Google Analytics, tidak wajib).
3. Di dashboard project, klik ikon **`</>`  (Web)** untuk mendaftarkan Web App → kasih nama app → **Register app**.
4. Firebase akan menampilkan blok config seperti ini — **salin semua nilainya**:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "p2m-payment-pp.firebaseapp.com",
     projectId: "p2m-payment-pp",
     storageBucket: "p2m-payment-pp.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456",
   };
   ```

## 2. Aktifkan Firestore Database

1. Di menu kiri Firebase Console → **Build > Firestore Database** → **Create database**.
2. Pilih lokasi server terdekat (misal `asia-southeast2 (Jakarta)`).
3. Pilih mode **Production mode**.
4. Setelah dibuat, buka tab **Rules**, ganti isinya dengan (untuk mulai cepat — cukup aman untuk skala pondok, karena aplikasi tidak memakai Firebase Auth bawaan):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   > Catatan: rule di atas terbuka (siapapun yang tahu alamat project bisa baca/tulis data lewat API). Ini setara dengan level keamanan aplikasi aslinya (tidak ada login server-side). Untuk keamanan lebih tinggi di kemudian hari, sebaiknya tambahkan Firebase Authentication + rules berbasis role — bisa diminta dikerjakan terpisah.

## 3. Aktifkan Storage (untuk upload logo, foto hero, bukti transfer, foto santri)

1. Menu kiri → **Build > Storage** → **Get started** → pilih lokasi yang sama seperti Firestore → selesai.
2. Buka tab **Rules**, ganti dengan:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }
   ```

## 4. Isi Environment Variable di Project

1. Copy file `.env.example` menjadi `.env` (untuk development lokal).
2. Isi 6 variabel `VITE_FIREBASE_...` dengan nilai dari langkah 1.
3. Jalankan ulang `npm run dev` — aplikasi otomatis pindah ke mode "online" (akan ada indikator di menu Admin > Pengaturan kalau masih mode lokal).

## 5. Deploy ke Vercel

1. Push folder project ini ke GitHub (repo baru).
2. Buka https://vercel.com → **Add New Project** → import repo GitHub tadi.
3. Framework preset: **Vite** (otomatis terdeteksi).
4. Sebelum klik Deploy, buka bagian **Environment Variables**, tambahkan 6 variabel yang sama persis seperti di `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Klik **Deploy**. Setelah selesai, Vercel akan kasih URL publik (misal `p2m-payment-pp.vercel.app`) yang bisa dibuka semua wali santri & admin dari HP masing-masing.
6. Kalau nanti ganti/ubah environment variable di Vercel, jangan lupa klik **Redeploy** supaya perubahan kepakai.

## 5b. Aktifkan WhatsApp Auto-Kirim (Fonnte) — Opsional tapi Direkomendasikan

Tanpa langkah ini, tombol "Kirim WA" tetap jalan tapi cuma membuka WhatsApp
dengan teks siap-kirim (admin harus tap Kirim manual satu-satu). Dengan
Fonnte, pengingat tunggakan (SPP & Rihlah, massal atau satuan) **langsung
terkirim otomatis** tanpa membuka WhatsApp sama sekali.

1. Daftar gratis di https://fonnte.com (ada free trial, lalu berbayar murah
   per bulan tergantung jumlah device — cek harga terbaru di web mereka).
2. Setelah daftar, scan QR code yang muncul di dashboard Fonnte pakai
   WhatsApp nomor admin/pondok (nomor ini yang nanti mengirim semua pesan
   pengingat — pastikan nomor aktif & stabil).
3. Setelah device berstatus "Connected", buka menu **Device** di dashboard
   Fontte, salin nilai **Token**.
4. Di Vercel: buka project → **Settings → Environment Variables** → tambah:
   - Name: `FONNTE_TOKEN`
   - Value: token yang disalin tadi
   - **Jangan** beri prefix `VITE_` (kalau pakai prefix itu, token akan bocor
     ke kode yang dikirim ke browser — siapa saja bisa mencurinya lewat
     DevTools dan memakai kuota WA pondok tanpa izin).
5. Klik **Redeploy**.
6. Cek: buka Dashboard Admin → **Pengaturan Sistem**, cari kartu "WhatsApp
   Auto-Kirim (Fonnte)" — kalau badge-nya "AKTIF" berarti sudah tersambung.
7. Coba kirim satu pengingat dari tab **Tunggakan** → kalau nomor tujuan
   benar-benar menerima pesan tanpa membuka WhatsApp di device admin,
   berarti sudah bekerja penuh.

> Catatan: kalau `FONNTE_TOKEN` belum diisi (atau salah), sistem otomatis
> fallback ke wa.me manual — aplikasi tidak akan error/nge-blank.

## 6. Login Admin

PIN/password admin bawaan (bisa diganti di kode kalau mau, di `src/context/AppContext.tsx` fungsi `loginAsAdmin`):
- `123456`
- `admin`
- `085148199511`
- `109676`

## 7. Testing dengan Banyak Akun

Setelah Firebase aktif, coba buka aplikasi dari 2 device/browser berbeda
(misal HP admin dan HP wali santri tes). Perubahan yang dibuat admin (tambah
santri, pengumuman, verifikasi pembayaran) akan langsung muncul di device
wali santri tanpa perlu refresh manual — karena datanya sudah realtime lewat
Firestore.

## Kapasitas Gratis (Firebase Spark Plan)

Untuk skala ± 60 wali santri, jauh di bawah batas gratis Firebase:
- Firestore: 50.000 baca & 20.000 tulis per hari (gratis).
- Storage: 5GB penyimpanan, 1GB/hari transfer (gratis).

Kalau suatu saat lebih besar dari itu, tinggal upgrade ke paket **Blaze**
(bayar sesuai pemakaian, tetap sangat murah untuk skala ini).
