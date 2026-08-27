import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Bill, Payment } from '../../types';
import { StudentAvatar } from '../common/StudentAvatar';
import { SppMonthlyMatrix } from '../common/SppMonthlyMatrix';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Wallet,
  BookOpen,
  Bell,
  Printer,
  Download,
} from 'lucide-react';
import { downloadStrukPDF, downloadTransactionsPDF } from '../../utils/pdfExport';
import { getMonthlyStatus, CURRENT_ACTIVE_MONTH } from '../../utils/paymentStatus';

interface WaliDashboardProps {
  student: Student;
  onOpenPayment: (bill?: Bill, month?: string) => void;
  onViewStruk: (payment: Payment) => void;
}

export const WaliDashboard: React.FC<WaliDashboardProps> = ({
  student,
  onOpenPayment,
  onViewStruk,
}) => {
  const { bills, payments, announcements, bankAccount, paymentTypes } = useApp();
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'DIVERIFIKASI' | 'MENUNGGU_VERIFIKASI' | 'DITOLAK'>('ALL');
  const [activeTab, setActiveTab] = useState<'KEUANGAN' | 'PENGUMUMAN'>('KEUANGAN');

  // Status SPP bulan berjalan dihitung dari record pembayaran bulan aktif
  // (bukan flag global `student.sppStatus`), supaya pembayaran bulan lalu
  // tidak pernah membuat bulan ini ikut tertampil "LUNAS".
  const sppTargetAmount = paymentTypes.find((pt) => pt.category === 'SPP')?.defaultAmount || 500000;
  const currentMonthSppStatus = getMonthlyStatus(payments, student.id, student.nis, CURRENT_ACTIVE_MONTH, 'SPP', sppTargetAmount).status;

  // Filter bills for this student
  const studentBills = bills.filter((b) => b.studentNis === student.nis || b.studentId === student.id);
  const activeBills = studentBills.filter((b) => b.status !== 'LUNAS');

  // Filter payments for this student
  const studentPayments = payments.filter((p) => p.studentNis === student.nis || p.studentId === student.id);
  const filteredPayments = studentPayments.filter((p) => {
    if (historyFilter === 'ALL') return true;
    return p.status === historyFilter;
  });

  // Only announcements relevant to THIS student: general (ALL), targeted to
  // their class, or targeted to them individually.
  const myAnnouncements = announcements.filter((a) => {
    if (a.targetType === 'CLASS') return a.targetClassName === student.className;
    if (a.targetType === 'STUDENT') return a.targetStudentId === student.id;
    return true; // ALL
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Welcome Banner & Student Profile Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-emerald-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-5">
            <div className="relative">
              <StudentAvatar
                photoUrl={student.photoUrl}
                name={student.name}
                nis={student.nis}
                size="xl"
                className="ring-4 ring-emerald-400/40 shadow-2xl"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-slate-950 rounded-lg shadow-md" title="Aktif">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>

            <div>
              <p className="text-emerald-300 mb-1.5" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', serif" }}>
                <span className="text-lg sm:text-xl font-bold tracking-wide">أَهْلًا وَسَهْلًا</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  NIS: {student.nis}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200">
                  {student.className}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{student.name}</h2>
              <p className="text-xs text-emerald-200/90 font-medium mt-1">
                {student.dormitoryName} • Wali: <strong className="text-white">{student.parentName}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => onOpenPayment()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/30 transition transform active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              Bayar SPP & Infaq Sekarang
            </button>
          </div>

        </div>

        {/* Financial Status Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
          
          {/* Status SPP */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">Status SPP</span>
              <Calendar className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-white">SPP Bulan Ini</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  currentMonthSppStatus === 'LUNAS'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                    : currentMonthSppStatus === 'PARTIAL'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
                    : currentMonthSppStatus === 'MENUNGGU'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                    : 'bg-red-500/30 text-red-300 border border-red-400/40'
                }`}
              >
                {currentMonthSppStatus === 'LUNAS' && '✓ LUNAS'}
                {currentMonthSppStatus === 'PARTIAL' && '◐ SEBAGIAN'}
                {currentMonthSppStatus === 'MENUNGGU' && '⏳ MENUNGGU'}
                {currentMonthSppStatus === 'BELUM_LUNAS' && '✕ BELUM LUNAS'}
              </span>
            </div>
          </div>

          {/* Status Rihlah — HANYA tampil kalau admin sudah mengaktifkan modul ini
              di Pengaturan. Sebelumnya field rihlahStatus default-nya selalu
              "BELUM_LUNAS" untuk semua santri baru, jadi semua wali santri
              melihat badge tunggakan Rihlah padahal pondok belum pernah
              menagih apa-apa. Sekarang harus admin yang aktifkan dulu. */}
          {bankAccount.rihlahModuleEnabled && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">Status Rihlah</span>
                <BookOpen className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-white">Infaq Rihlah</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    student.rihlahStatus === 'LUNAS'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                      : 'bg-red-500/30 text-red-300 border border-red-400/40'
                  }`}
                >
                  {student.rihlahStatus === 'LUNAS' ? '✓ LUNAS' : '✕ BELUM LUNAS'}
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-full max-w-sm mb-6">
        <button
          onClick={() => setActiveTab('KEUANGAN')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'KEUANGAN'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" /> Keuangan & Tagihan
        </button>
        <button
          onClick={() => setActiveTab('PENGUMUMAN')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'PENGUMUMAN'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" /> Pengumuman Pondok
        </button>
      </div>

      {activeTab === 'KEUANGAN' ? (
        <div className="space-y-8">
          {/* Monthly SPP Status Matrix */}
          <SppMonthlyMatrix
            student={student}
            onPayForMonth={(m) => onOpenPayment(undefined, m)}
            onViewStruk={onViewStruk}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Bills Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" /> Tagihan Aktif
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Daftar kewajiban pembayaran yang perlu diselesaikan.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
                {activeBills.length} Tagihan
              </span>
            </div>

            {activeBills.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Alhamdulillah, Tidak Ada Tagihan Aktif</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Seluruh pembayaran santri telah lunas atau dalam proses verifikasi.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {bill.category}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{bill.billNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          bill.status === 'BELUM_LUNAS' 
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}>
                          {bill.status === 'BELUM_LUNAS' ? 'OVERDUE' : 'PENDING'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {bill.paymentTypeName} {bill.monthYear ? `(${bill.monthYear})` : ''}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Jatuh Tempo: <strong className="text-slate-700 dark:text-slate-300">{bill.dueDate}</strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Nominal</span>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                          Rp {bill.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <button
                        onClick={() => onOpenPayment(bill)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95 shrink-0"
                      >
                        Bayar Sekarang
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment History List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" /> Riwayat Transaksi & Struk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unduh kwitansi & struk resmi pembayaran dalam format PDF.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* PDF Rekap Export for Wali */}
                {studentPayments.length > 0 && (
                  <button
                    onClick={() =>
                      downloadTransactionsPDF(studentPayments, {
                        title: `Rekap Transaksi Santri - ${student.name}`,
                        filterTypeLabel: `Santri: ${student.name} (NIS: ${student.nis})`,
                        pesantrenName: bankAccount.pesantrenName,
                        whatsappAdmin: bankAccount.whatsappAdmin,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Rekap PDF
                  </button>
                )}

                {/* Status Filters */}
                <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['ALL', 'DIVERIFIKASI', 'MENUNGGU_VERIFIKASI', 'DITOLAK'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setHistoryFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                        historyFilter === filter
                          ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {filter === 'ALL' && 'Semua'}
                      {filter === 'DIVERIFIKASI' && 'Lunas'}
                      {filter === 'MENUNGGU_VERIFIKASI' && 'Proses'}
                      {filter === 'DITOLAK' && 'Ditolak'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Belum ada riwayat transaksi pada kategori ini.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 transition shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{payment.invoiceNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            payment.status === 'DIVERIFIKASI'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : payment.status === 'MENUNGGU_VERIFIKASI'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {payment.status === 'DIVERIFIKASI' ? 'PAID' : payment.status === 'MENUNGGU_VERIFIKASI' ? 'PENDING' : 'REJECTED'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {payment.paymentTypeName} {payment.monthYear ? `(${payment.monthYear})` : ''}
                      </h4>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(payment.createdAt).toLocaleString('id-ID')} • Metode: <strong className="text-slate-700 dark:text-slate-300">{payment.paymentMethod}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                      <div className="text-left sm:text-right mr-2">
                        <span className="text-[10px] text-slate-400 font-bold block">TOTAL</span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
                          Rp {payment.amount.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <button
                        onClick={() => downloadStrukPDF(payment, bankAccount)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>

                      <button
                        onClick={() => onViewStruk(payment)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5" /> Struk
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        </div>
      ) : (
        <div className="space-y-8 max-w-3xl mx-auto">
          
          {/* Bank BSI Quick Card */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Rekening BSI Pondok</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">Resmi</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">NOMOR REKENING</span>
              <div className="font-mono text-2xl font-black text-emerald-300">{bankAccount.accountNumber}</div>
              <div className="text-xs text-slate-300 font-medium">a.n {bankAccount.accountHolder}</div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Konfirmasi Admin WA:</span>
              <strong className="text-white">{bankAccount.whatsappAdmin}</strong>
            </div>
          </div>

          {/* Pengumuman Feed */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" /> Pengumuman Pesantren
            </h3>

            <div className="space-y-3">
              {myAnnouncements.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada pengumuman untuk Ananda saat ini.</p>
              )}
              {myAnnouncements.map((a) => (
                <div key={a.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {a.category}
                      </span>
                      {a.targetType !== 'ALL' && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                          {a.targetType === 'CLASS' ? `Khusus Kelas ${a.targetClassName}` : 'Khusus Ananda'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(a.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">{a.title}</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
