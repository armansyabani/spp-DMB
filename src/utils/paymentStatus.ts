import { Payment, PaymentCategory } from '../types';

/**
 * Bulan/periode yang sedang aktif di sistem saat ini. Dipakai di beberapa
 * tempat (badge status wali, ringkasan admin) supaya "status bulan ini"
 * selalu merujuk ke bulan yang sama, bukan dihardcode berulang-ulang di
 * banyak file.
 */
export const CURRENT_ACTIVE_MONTH = 'Agustus 2026';

/**
 * Periode "amnesti" — bulan yang dianggap LUNAS untuk semua santri secara
 * otomatis (baseline awal sistem mulai dipakai), TANPA perlu ada record
 * pembayaran sungguhan. Perhitungan tunggakan yang sesungguhnya baru mulai
 * dihitung dari CURRENT_ACTIVE_MONTH dan seterusnya.
 */
export const BASELINE_AMNESTY_MONTHS = ['Juli 2026'];

export type MonthlyPaymentStatus = 'LUNAS' | 'PARTIAL' | 'MENUNGGU' | 'BELUM_LUNAS';

export interface MonthlyStatusResult {
  status: MonthlyPaymentStatus;
  /** Total nominal yang sudah terverifikasi untuk bulan ini */
  paidAmount: number;
  /** Nominal target/kewajiban bulan ini */
  targetAmount: number;
  /** Sisa yang masih harus dibayar (0 kalau sudah lunas) */
  remainingAmount: number;
  /** Pembayaran terverifikasi terakhir untuk bulan ini (untuk tombol "Lihat Struk") */
  verifiedPayment?: Payment;
  /** Pembayaran yang masih menunggu verifikasi admin, kalau ada */
  pendingPayment?: Payment;
}

/**
 * Hitung status pembayaran SATU bulan tertentu untuk SATU santri, murni dari
 * data Payment yang sudah benar-benar ada (bukan dari flag global seperti
 * `student.sppStatus`, yang tidak terikat ke bulan manapun).
 *
 * PENTING: ini yang menjaga aturan "bayar Juli tidak boleh otomatis
 * membuat Agustus ikut lunas" — karena setiap bulan dihitung independen
 * berdasarkan `payment.monthYear`, bukan status tunggal per santri.
 */
export function getMonthlyStatus(
  payments: Payment[],
  studentId: string,
  studentNis: string,
  monthYear: string,
  category: PaymentCategory,
  targetAmount: number
): MonthlyStatusResult {
  // Periode amnesti (mis. "Juli 2026") dianggap lunas otomatis untuk semua
  // santri — ini titik awal sistem mulai dipakai, jadi tunggakan bulan
  // sebelum sistem aktif tidak pernah ditagihkan ke wali santri.
  if (BASELINE_AMNESTY_MONTHS.includes(monthYear) && category === 'SPP') {
    return {
      status: 'LUNAS',
      paidAmount: targetAmount,
      targetAmount,
      remainingAmount: 0,
    };
  }

  const relevant = payments.filter(
    (p) =>
      (p.studentId === studentId || p.studentNis === studentNis) &&
      p.category === category &&
      p.monthYear === monthYear &&
      p.status !== 'DITOLAK' &&
      p.status !== 'DIBATALKAN'
  );

  const verified = relevant.filter((p) => p.status === 'DIVERIFIKASI');
  const pending = relevant.filter((p) => p.status === 'MENUNGGU_VERIFIKASI');

  const paidAmount = verified.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = Math.max(0, targetAmount - paidAmount);

  let status: MonthlyPaymentStatus;
  if (targetAmount > 0 && paidAmount >= targetAmount) {
    status = 'LUNAS';
  } else if (paidAmount > 0) {
    status = 'PARTIAL';
  } else if (pending.length > 0) {
    status = 'MENUNGGU';
  } else {
    status = 'BELUM_LUNAS';
  }

  return {
    status,
    paidAmount,
    targetAmount,
    remainingAmount,
    verifiedPayment: verified[verified.length - 1],
    pendingPayment: pending[pending.length - 1],
  };
}
