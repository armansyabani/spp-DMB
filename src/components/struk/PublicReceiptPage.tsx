import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Clock, AlertTriangle, Shield, ArrowLeft } from 'lucide-react';

interface PublicReceiptPageProps {
  paymentId: string;
  onClose: () => void;
}

/**
 * Halaman publik yang dibuka lewat scan QR pada kuitansi/struk.
 * Sengaja dibuat READ-ONLY dan ringkas — hanya menampilkan konfirmasi
 * pembayaran (bukan seluruh profil santri, saldo, atau data sensitif lain),
 * supaya tautan yang tersebar (misal lewat foto struk) tidak membocorkan
 * lebih dari yang perlu.
 */
export const PublicReceiptPage: React.FC<PublicReceiptPageProps> = ({ paymentId, onClose }) => {
  const { payments, bankAccount } = useApp();
  const payment = payments.find((p) => p.id === paymentId);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <button
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Ke Beranda PondokPay
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-6">
          {!payment ? (
            <div className="text-center py-10 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <h2 className="font-extrabold text-slate-900 dark:text-white">Struk Tidak Ditemukan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tautan ini mungkin sudah tidak berlaku, atau data belum termuat. Coba muat ulang halaman.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 mb-2">
                  {payment.status === 'DIVERIFIKASI' ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : payment.status === 'MENUNGGU_VERIFIKASI' ? (
                    <Clock className="w-7 h-7 text-amber-600" />
                  ) : (
                    <AlertTriangle className="w-7 h-7 text-red-600" />
                  )}
                </div>
                <h1 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">
                  {bankAccount.pesantrenName || 'PondokPay'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Konfirmasi Pembayaran</p>
                <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800">
                  {payment.status === 'DIVERIFIKASI' && <span className="text-emerald-700 dark:text-emerald-400">✓ Lunas Terverifikasi</span>}
                  {payment.status === 'MENUNGGU_VERIFIKASI' && <span className="text-amber-700 dark:text-amber-400">⏳ Menunggu Verifikasi</span>}
                  {payment.status === 'DITOLAK' && <span className="text-red-700 dark:text-red-400">✕ Ditolak</span>}
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>No. Invoice:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{payment.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Nama Santri:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{payment.studentName}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Jenis Pembayaran:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {payment.paymentTypeName}{payment.monthYear ? ` (${payment.monthYear})` : ''}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tanggal:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(payment.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-center shadow-sm">
                  <span className="text-[10px] font-semibold tracking-wider uppercase opacity-90 block">Total Dibayarkan</span>
                  <span className="text-2xl font-black tracking-tight">Rp {payment.amount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                <Shield className="w-3 h-3" /> Halaman verifikasi resmi PondokPay — data ditampilkan terbatas untuk menjaga privasi santri.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
