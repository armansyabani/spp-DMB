import React from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Payment } from '../../types';
import { Calendar, CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldAlert, CircleDot } from 'lucide-react';
import { getMonthlyStatus } from '../../utils/paymentStatus';

interface SppMonthlyMatrixProps {
  student: Student;
  onPayForMonth: (month: string) => void;
  onViewStruk?: (payment: Payment) => void;
}

// Periode dimulai Juli 2026 (bulan amnesti — otomatis lunas semua),
// perhitungan tunggakan sungguhan dimulai Agustus 2026.
export const MONTHS_LIST = [
  { name: 'Juli 2026', order: 1, isCurrentOrPast: true },
  { name: 'Agustus 2026', order: 2, isCurrentOrPast: true },
  { name: 'September 2026', order: 3, isCurrentOrPast: false },
  { name: 'Oktober 2026', order: 4, isCurrentOrPast: false },
  { name: 'November 2026', order: 5, isCurrentOrPast: false },
  { name: 'Desember 2026', order: 6, isCurrentOrPast: false },
  { name: 'Januari 2027', order: 7, isCurrentOrPast: false },
  { name: 'Februari 2027', order: 8, isCurrentOrPast: false },
  { name: 'Maret 2027', order: 9, isCurrentOrPast: false },
  { name: 'April 2027', order: 10, isCurrentOrPast: false },
  { name: 'Mei 2027', order: 11, isCurrentOrPast: false },
  { name: 'Juni 2027', order: 12, isCurrentOrPast: false },
];

interface MonthStatusItem {
  name: string;
  order: number;
  isCurrentOrPast: boolean;
  status: 'LUNAS' | 'PARTIAL' | 'MENUNGGU' | 'BELUM_LUNAS' | 'BELUM_WAKTUNYA';
  payment?: Payment;
  paidAmount: number;
  targetAmount: number;
  remainingAmount: number;
}

export const SppMonthlyMatrix: React.FC<SppMonthlyMatrixProps> = ({
  student,
  onPayForMonth,
  onViewStruk,
}) => {
  const { payments, paymentTypes } = useApp();

  // Nominal target SPP diambil dari data Jenis Pembayaran asli (bisa di-custom
  // admin di menu Pengaturan), BUKAN angka hardcode.
  const sppTargetAmount = paymentTypes.find((pt) => pt.category === 'SPP')?.defaultAmount || 500000;

  // Status per bulan dihitung MURNI dari record Payment per monthYear —
  // tidak lagi bergantung pada `student.sppStatus` (flag global yang dulunya
  // bisa membuat Agustus ikut "LUNAS" hanya karena Juli sudah dibayar).
  const monthStatuses: MonthStatusItem[] = MONTHS_LIST.map((m) => {
    const result = getMonthlyStatus(payments, student.id, student.nis, m.name, 'SPP', sppTargetAmount);

    if (result.status === 'BELUM_LUNAS' && !m.isCurrentOrPast) {
      return { ...m, status: 'BELUM_WAKTUNYA', payment: undefined, paidAmount: 0, targetAmount: sppTargetAmount, remainingAmount: sppTargetAmount };
    }

    return {
      ...m,
      status: result.status,
      payment: result.verifiedPayment || result.pendingPayment,
      paidAmount: result.paidAmount,
      targetAmount: result.targetAmount,
      remainingAmount: result.remainingAmount,
    };
  });

  const paidCount = monthStatuses.filter((m) => m.status === 'LUNAS').length;
  const partialCount = monthStatuses.filter((m) => m.status === 'PARTIAL').length;
  const pendingCount = monthStatuses.filter((m) => m.status === 'MENUNGGU').length;
  const unpaidCount = monthStatuses.filter((m) => m.status === 'BELUM_LUNAS').length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-4 h-4" /> Matriks Status Pembayaran SPP Bulanan
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
            Tahun Ajaran 2026 / 2027
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Histori lengkap pembayaran SPP per bulan untuk santri <strong className="text-slate-800 dark:text-slate-200">{student.name}</strong> (NIS: {student.nis})
          </p>
        </div>

        {/* Badges Summary */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800">
            ✓ {paidCount} Bulan Lunas
          </span>
          {partialCount > 0 && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800">
              ◐ {partialCount} Sebagian
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800">
              ⏳ {pendingCount} Menunggu
            </span>
          )}
          {unpaidCount > 0 && (
            <span className="px-3 py-1 bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800 animate-pulse">
              ⚠️ {unpaidCount} Tunggakan
            </span>
          )}
        </div>
      </div>

      {/* Grid 12 Months */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {monthStatuses.map((item) => {
          return (
            <div
              key={item.name}
              className={`p-3.5 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                item.status === 'LUNAS'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : item.status === 'PARTIAL'
                  ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60'
                  : item.status === 'MENUNGGU'
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                  : item.status === 'BELUM_LUNAS'
                  ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    Bulan ke-{item.order}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    {item.name}
                  </h4>
                  {item.status === 'PARTIAL' ? (
                    <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 mt-0.5">
                      Rp {item.paidAmount.toLocaleString('id-ID')} / Rp {item.targetAmount.toLocaleString('id-ID')}
                    </p>
                  ) : (
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                      Rp {item.targetAmount.toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                {/* Status Indicator Pill */}
                {item.status === 'LUNAS' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> LUNAS
                  </span>
                )}
                {item.status === 'PARTIAL' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white flex items-center gap-1 shadow-sm">
                    <CircleDot className="w-3 h-3" /> SEBAGIAN
                  </span>
                )}
                {item.status === 'MENUNGGU' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3" /> MENUNGGU
                  </span>
                )}
                {item.status === 'BELUM_LUNAS' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white flex items-center gap-1 shadow-sm animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> TUNGGAKAN
                  </span>
                )}
                {item.status === 'BELUM_WAKTUNYA' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Belum Waktunya
                  </span>
                )}
              </div>

              {/* Progress bar (khusus status PARTIAL, biar sisa kelihatan jelas) */}
              {item.status === 'PARTIAL' && (
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (item.paidAmount / item.targetAmount) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Sisa Rp {item.remainingAmount.toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              {/* Action Button for the Month */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                {item.status === 'LUNAS' ? (
                  item.payment && onViewStruk ? (
                    <button
                      onClick={() => onViewStruk(item.payment!)}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1"
                    >
                      Lihat Struk Digital
                    </button>
                  ) : (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold text-center py-1">
                      ✓ Terverifikasi Lunas
                    </div>
                  )
                ) : item.status === 'PARTIAL' ? (
                  <button
                    onClick={() => onPayForMonth(item.name)}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Lunasi Sisa {item.name.split(' ')[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : item.status === 'MENUNGGU' ? (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold text-center py-1 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi Admin
                  </div>
                ) : item.status === 'BELUM_LUNAS' ? (
                  <button
                    onClick={() => onPayForMonth(item.name)}
                    className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Bayar SPP {item.name.split(' ')[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onPayForMonth(item.name)}
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1"
                  >
                    <span>Bayar Awal ({item.name.split(' ')[0]})</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
