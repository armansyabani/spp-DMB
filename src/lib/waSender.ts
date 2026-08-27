import { formatWhatsAppNumber } from '../utils/reminderHelper';

export type WaSendResult =
  | { mode: 'AUTO_SENT' }
  | { mode: 'FALLBACK_MANUAL'; reason: string };

/**
 * Attempts to send a WhatsApp message automatically via the /api/send-wa
 * serverless proxy (Fonnte). If the server isn't configured yet (no
 * FONNTE_TOKEN set in Vercel) or the request fails for any reason (offline,
 * dev environment without the API route, Fonnte quota habis, dsb), it falls
 * back to opening wa.me with the message pre-filled so the admin can still
 * send manually with one tap — the reminder flow never breaks entirely.
 */
export const sendWhatsAppMessage = async (
  rawPhone: string,
  message: string
): Promise<WaSendResult> => {
  const target = formatWhatsAppNumber(rawPhone);

  try {
    const res = await fetch('/api/send-wa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, message }),
    });

    // If the route doesn't exist (e.g. local `npm run dev` without `vercel dev`),
    // Vite returns the index.html fallback (200 + text/html) instead of JSON.
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return openManualFallback(target, message, 'API_ROUTE_UNAVAILABLE');
    }

    const data = await res.json();
    if (data?.ok) {
      return { mode: 'AUTO_SENT' };
    }
    return openManualFallback(target, message, data?.reason || 'UNKNOWN');
  } catch (err) {
    return openManualFallback(target, message, 'NETWORK_ERROR');
  }
};

const openManualFallback = (target: string, message: string, reason: string): WaSendResult => {
  const waUrl = `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  return { mode: 'FALLBACK_MANUAL', reason };
};
