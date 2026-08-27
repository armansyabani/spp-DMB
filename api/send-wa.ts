// Vercel Serverless Function — /api/send-wa
//
// Kenapa ini harus lewat server (bukan langsung fetch dari browser ke Fonnte)?
// 1. Keamanan: FONNTE_TOKEN adalah kredensial yang bisa dipakai siapa saja untuk
//    mengirim WA atas nama nomor pondok. Kalau token ditaruh di kode frontend
//    (VITE_...), semua orang yang buka DevTools bisa mencuri & menyalahgunakannya.
//    Menjaganya di environment variable SERVER-SIDE Vercel (tanpa prefix VITE_)
//    berarti token tidak pernah ikut ter-bundle ke JS yang dikirim ke browser.
// 2. Sebagian besar penyedia WA gateway (termasuk Fonnte) memblokir permintaan
//    langsung dari browser (CORS), jadi tetap butuh perantara server.
//
// Setup yang dibutuhkan admin (lihat PANDUAN_DEPLOY.md):
//   1. Daftar & scan QR device di https://fonnte.com, ambil "Token" device.
//   2. Di Vercel: Project Settings > Environment Variables > tambahkan
//      FONNTE_TOKEN = <token dari Fonnte> (JANGAN pakai prefix VITE_).
//   3. Redeploy.
//
// Endpoint ini menerima POST { target: "628xxxx", message: "..." } dan
// meneruskannya ke Fonnte. Kalau FONNTE_TOKEN belum diset, mengembalikan
// { ok: false, reason: 'NOT_CONFIGURED' } supaya frontend bisa otomatis
// fallback ke wa.me (buka WhatsApp manual) tanpa aplikasi jadi error.

export const config = { runtime: 'nodejs' };

interface VercelLikeRequest {
  method?: string;
  body?: any;
}
interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const token = process.env.FONNTE_TOKEN;

  // GET dipakai halaman Pengaturan admin untuk menampilkan status
  // "WA Auto-Kirim: Aktif/Nonaktif" — tidak pernah mengirim pesan apapun.
  if (req.method === 'GET') {
    res.status(200).json({ configured: Boolean(token) });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'METHOD_NOT_ALLOWED' });
    return;
  }

  if (!token) {
    res.status(200).json({ ok: false, reason: 'NOT_CONFIGURED' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const target = String(body?.target || '').replace(/[^0-9]/g, '');
  const message = String(body?.message || '').trim();

  if (!target || !message) {
    res.status(400).json({ ok: false, reason: 'INVALID_PAYLOAD' });
    return;
  }

  try {
    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ target, message, countryCode: '62' }).toString(),
    });

    const data = await fonnteRes.json().catch(() => ({}));

    if (!fonnteRes.ok || data?.status === false) {
      res.status(502).json({ ok: false, reason: 'FONNTE_ERROR', detail: data });
      return;
    }

    res.status(200).json({ ok: true, detail: data });
  } catch (err) {
    res.status(500).json({ ok: false, reason: 'NETWORK_ERROR', detail: String(err) });
  }
}
