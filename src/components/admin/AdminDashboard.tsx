import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Bill, Payment, Announcement, BankAccount, PaymentBreakdownItem } from '../../types';
import { INITIAL_CLASSES, INITIAL_DORMITORIES } from '../../data/mockData';
import { StudentAvatar } from '../common/StudentAvatar';
import { MediaPicker } from '../common/MediaPicker';
import { uploadFile } from '../../lib/upload';
import { StatCard } from '../ui/StatCard';
import { getMonthlyStatus, CURRENT_ACTIVE_MONTH } from '../../utils/paymentStatus';
import {
  getUnpaidSantri,
  sendPaymentReminderWA,
  buildPaymentReminderTemplate,
  formatWhatsAppNumber,
} from '../../utils/reminderHelper';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Bell,
  BarChart3,
  Building2,
  History,
  AlertTriangle,
  Plus,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Undo2,
  Pencil,
  BookOpen,
  Palette,
  RotateCcw,
  Edit2,
  Printer,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  X,
  Send,
  Wallet,
  DollarSign,
  UserCheck,
  UserX,
  MessageSquare,
  Sparkles,
  Upload,
  Image,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Landmark,
  Clock,
  Menu,
  Calendar,
  Globe,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SppMonthlyMatrix, MONTHS_LIST } from '../common/SppMonthlyMatrix';
import { downloadStrukPDF, downloadTransactionsPDF } from '../../utils/pdfExport';

interface AdminDashboardProps {
  onViewStruk: (payment: Payment) => void;
  onOpenPayment?: (bill?: Bill, month?: string) => void;
}

type AdminTab =
  | 'OVERVIEW'
  | 'SANTRI'
  | 'TUNGGAKAN'
  | 'VERIFIKASI'
  | 'TAGIHAN'
  | 'KAS'
  | 'LAPORAN'
  | 'PENGUMUMAN'
  | 'PENGATURAN'
  | 'AUDIT_LOG'
  | 'DANGER_ZONE';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onViewStruk, onOpenPayment }) => {
  const {
    students,
    bills,
    payments,
    paymentTypes,
    announcements,
    bankAccount,
    auditLogs,
    userSession,
    verifyPayment,
    cancelVerifiedPayment,
    updatePaymentAmount,
    manualSettlePayment,
    createStudent,
    updateStudent,
    deleteStudent,
    restoreStudent,
    importStudents,
    topUpStudentBalance,
    generateBills,
    createAnnouncement,
    deleteAnnouncement,
    updateBankAccount,
    backupData,
    restoreData,
    deleteAllPayments,
    resetSystem,
    startCleanForProduction,
    isFirebaseConfigured,
    cashflow,
    addCashflowEntry,
    deleteCashflowEntry,
    updateDefaultPaymentBreakdown,
    updateStudentBreakdown,
  } = useApp();

  // Manual Settle (Lunaskan Manual / Cash) Modal State
  const [settleStudent, setSettleStudent] = useState<Student | null>(null);
  const [settleCategory, setSettleCategory] = useState<'SPP' | 'RIHLAH' | 'UANG_JAJAN'>('SPP');
  const [settleAmount, setSettleAmount] = useState<number | ''>(500000);
  const [settleNote, setSettleNote] = useState('');
  const [settleMonth, setSettleMonth] = useState(CURRENT_ACTIVE_MONTH);

  const [activeTab, setActiveTab] = useState<AdminTab>('SANTRI');
  // Sub-tab di dalam "Tunggakan" — SPP dan Rihlah ditampilkan & dikirim
  // pengingatnya secara TERPISAH (daftar, total, dan tombol kirim WA masing-
  // masing sendiri), bukan digabung jadi satu daftar.
  const [tunggakanView, setTunggakanView] = useState<'SPP' | 'RIHLAH'>('SPP');

  // Status koneksi Fonnte (WA auto-kirim) — dicek sekali saat dashboard admin
  // dibuka, dipakai untuk badge indikator di Pengaturan Sistem.
  const [fonnteConfigured, setFonnteConfigured] = useState<boolean | null>(null);
  React.useEffect(() => {
    fetch('/api/send-wa')
      .then((r) => (r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
      .then((data) => setFonnteConfigured(Boolean(data?.configured)))
      .catch(() => setFonnteConfigured(false));
  }, []);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [viewingStudentMatrix, setViewingStudentMatrix] = useState<Student | null>(null);

  // Santri Management States
  const [santriSearch, setSantriSearch] = useState('');
  const [santriFilterClass, setSantriFilterClass] = useState('ALL');
  const [showDeletedSantri, setShowDeletedSantri] = useState(false);

  // Student Form Modal State
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    nis: '',
    entryDate: '27 Juli 2026',
    classId: INITIAL_CLASSES[0].id,
    className: INITIAL_CLASSES[0].name,
    dormitoryId: INITIAL_DORMITORIES[0].id,
    dormitoryName: INITIAL_DORMITORIES[0].name,
    parentName: '',
    parentWhatsapp: '',
    parentAddress: '',
    photoUrl: '',
  });

  // TopUp Modal State
  const [topUpStudent, setTopUpStudent] = useState<Student | null>(null);
  const [topUpAmountInput, setTopUpAmountInput] = useState<number | ''>(50000);
  const [topUpNoteInput, setTopUpNoteInput] = useState('TopUp Uang Jajan Kasir Pondok');

  // Rejection Reason Modal State
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Bill Generation State
  const [billTargetType, setBillTargetType] = useState<'ALL' | 'CLASS' | 'DORM' | 'STUDENT'>('ALL');
  const [billTargetId, setBillTargetId] = useState(INITIAL_CLASSES[0].id);
  const [billPaymentTypeId, setBillPaymentTypeId] = useState('pt1');
  const [billMonthYear, setBillMonthYear] = useState('Agustus 2026');
  const [billDueDate, setBillDueDate] = useState('2026-08-10');
  const [billCustomAmount, setBillCustomAmount] = useState<number | ''>('');

  // Announcement Form State
  const [annoTitle, setAnnoTitle] = useState('');
  const [annoCategory, setAnnoCategory] = useState<'PENTING' | 'KEUANGAN' | 'KEGIATAN' | 'UMUM'>('PENTING');
  const [annoContent, setAnnoContent] = useState('');
  const [annoPinned, setAnnoPinned] = useState(false);
  const [annoTargetType, setAnnoTargetType] = useState<'ALL' | 'CLASS' | 'STUDENT'>('ALL');
  const [annoTargetClass, setAnnoTargetClass] = useState('');
  const [annoTargetStudentId, setAnnoTargetStudentId] = useState('');

  // Kas Pondok (Cashflow) State
  const [cfType, setCfType] = useState<'PEMASUKAN' | 'PENGELUARAN'>('PENGELUARAN');
  const [cfCategory, setCfCategory] = useState('');
  const [cfAmount, setCfAmount] = useState<number | ''>('');
  const [cfDescription, setCfDescription] = useState('');
  const [cfDate, setCfDate] = useState(new Date().toISOString().slice(0, 10));
  const [statsPeriod, setStatsPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('MONTH');

  // Bank Form State
  const [bankForm, setBankForm] = useState<BankAccount>(bankAccount);
  const [webForm, setWebForm] = useState({
    pesantrenName: bankAccount.pesantrenName || '',
    heroImages: bankAccount.heroImages || [],
  });
  const [breakdownForm, setBreakdownForm] = useState<PaymentBreakdownItem[]>(
    bankAccount.defaultPaymentBreakdown && bankAccount.defaultPaymentBreakdown.length > 0
      ? bankAccount.defaultPaymentBreakdown
      : [{ id: `bd_${Date.now()}`, label: 'SPP Bulanan', amount: 500000 }]
  );

  // Kustomisasi rincian pembayaran per santri (dibuka dari tabel Data Santri)
  const [breakdownStudent, setBreakdownStudent] = useState<Student | null>(null);
  const [studentBreakdownForm, setStudentBreakdownForm] = useState<PaymentBreakdownItem[]>([]);

  // Danger Zone Confirmation Input
  const [dangerAction, setDangerAction] = useState<'WIPE_PAYMENTS' | 'RESET_SYSTEM' | 'CLEAN_PRODUCTION' | null>(null);
  // Koreksi nominal pembayaran per baris di tabel Laporan
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<string>('');
  const [dangerConfirmInput, setDangerConfirmInput] = useState('');

  // Laporan Export Filter State
  const [reportFilterType, setReportFilterType] = useState<'ALL' | 'MONTH' | 'CLASS' | 'STUDENT' | 'CUSTOM'>('ALL');
  const [reportMonthValue, setReportMonthValue] = useState('Agustus 2026');
  const [reportClassValue, setReportClassValue] = useState(INITIAL_CLASSES[0].name);
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportSearchName, setReportSearchName] = useState('');

  // Proof Image Preview Modal
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // WhatsApp Payment Reminder Modal State
  const [reminderModalStudent, setReminderModalStudent] = useState<Student | null>(null);
  const [reminderCustomAmount, setReminderCustomAmount] = useState<number | ''>(500000);
  const [reminderCustomText, setReminderCustomText] = useState<string>('');

  // File Input Ref for Excel Import & Restore
  const excelInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Stats Calculations
  const activeStudents = students.filter((s) => !s.isDeleted);
  const verifiedPayments = payments.filter((p) => p.status === 'DIVERIFIKASI');
  const pendingPayments = payments.filter((p) => p.status === 'MENUNGGU_VERIFIKASI');

  const todayStr = new Date().toISOString().slice(0, 10);
  const totalHariIni = verifiedPayments
    .filter((p) => p.createdAt.startsWith(todayStr))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthStr = new Date().toISOString().slice(0, 7);
  const totalBulanIni = verifiedPayments
    .filter((p) => p.createdAt.startsWith(monthStr))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalTahunIni = verifiedPayments.reduce((acc, curr) => acc + curr.amount, 0);

  // Unique Transacting People Count
  const transactingStudentsCount = new Set(payments.map((p) => p.studentId)).size;
  const totalTransactionCount = payments.length;

  // Bulan lalu, untuk indikator tren (dibanding bulan lalu) — dihitung dari data asli, bukan dummy.
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);
  const totalBulanLalu = verifiedPayments
    .filter((p) => p.createdAt.startsWith(lastMonthStr))
    .reduce((acc, curr) => acc + curr.amount, 0);
  const pemasukanTrendPercent = totalBulanLalu > 0 ? ((totalBulanIni - totalBulanLalu) / totalBulanLalu) * 100 : totalBulanIni > 0 ? 100 : 0;

  const totalPengeluaranBulanIni = cashflow
    .filter((c) => c.type === 'PENGELUARAN' && c.date.startsWith(monthStr))
    .reduce((acc, c) => acc + c.amount, 0);
  const totalPengeluaranBulanLalu = cashflow
    .filter((c) => c.type === 'PENGELUARAN' && c.date.startsWith(lastMonthStr))
    .reduce((acc, c) => acc + c.amount, 0);
  const pengeluaranTrendPercent = totalPengeluaranBulanLalu > 0 ? ((totalPengeluaranBulanIni - totalPengeluaranBulanLalu) / totalPengeluaranBulanLalu) * 100 : totalPengeluaranBulanIni > 0 ? 100 : 0;

  const totalPemasukanManual = cashflow.filter((c) => c.type === 'PEMASUKAN').reduce((acc, c) => acc + c.amount, 0);
  const totalPengeluaranSemua = cashflow.filter((c) => c.type === 'PENGELUARAN').reduce((acc, c) => acc + c.amount, 0);
  const saldoKasPondok = totalTahunIni + totalPemasukanManual - totalPengeluaranSemua;
  const netCashFlowBulanIni = totalBulanIni - totalPengeluaranBulanIni;

  // Data arus kas 30 hari terakhir — dibangun dari payment & cashflow ASLI (bukan random/dummy).
  const cashFlowChartData = useMemo(() => {
    const days: { key: string; label: string; pemasukan: number; pengeluaran: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), pemasukan: 0, pengeluaran: 0 });
    }
    const dayMap = new Map(days.map((d) => [d.key, d]));
    verifiedPayments.forEach((p) => {
      const key = p.createdAt.slice(0, 10);
      const day = dayMap.get(key);
      if (day) day.pemasukan += p.amount;
    });
    cashflow.forEach((c) => {
      const day = dayMap.get(c.date);
      if (day && c.type === 'PENGELUARAN') day.pengeluaran += c.amount;
      if (day && c.type === 'PEMASUKAN') day.pemasukan += c.amount;
    });
    return days;
  }, [verifiedPayments, cashflow]);

  // Sparkline ringkas (7 hari terakhir) untuk StatCard
  const last7DaysSparkline = cashFlowChartData.slice(-7).map((d) => d.pemasukan);

  // Distribusi pemasukan per kategori (untuk donut chart)
  const categoryDistribution = useMemo(() => {
    const catLabels: Record<string, string> = {
      SPP: 'SPP Bulanan',
      UANG_JAJAN: 'Uang Jajan',
      RIHLAH: 'Infaq Rihlah',
      SERAGAM: 'Seragam',
      KITAB: 'Kitab',
      UJIAN: 'Ujian',
      LAINNYA: 'Lainnya',
    };
    const colorMap: Record<string, string> = {
      SPP: '#10b981',
      UANG_JAJAN: '#14b8a6',
      RIHLAH: '#6366f1',
      SERAGAM: '#f59e0b',
      KITAB: '#0ea5e9',
      UJIAN: '#ec4899',
      LAINNYA: '#94a3b8',
    };
    const totals = new Map<string, number>();
    verifiedPayments.forEach((p) => {
      totals.set(p.category, (totals.get(p.category) || 0) + p.amount);
    });
    return Array.from(totals.entries())
      .filter(([, amount]) => amount > 0)
      .map(([cat, amount]) => ({ name: catLabels[cat] || cat, value: amount, color: colorMap[cat] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [verifiedPayments]);

  // SPP & Debt status untuk BULAN AKTIF (Agustus 2026) — dihitung dari
  // payment.monthYear yang sebenarnya, bukan flag global `student.sppStatus`.
  // Ini penting: kalau dulu pakai flag global, santri yang sudah bayar Juli
  // akan ikut ke-hitung "lunas" walau Agustus belum dibayar sama sekali.
  const sppTargetAmountForDashboard = paymentTypes.find((pt) => pt.category === 'SPP')?.defaultAmount || 500000;
  const sppLunasList = activeStudents.filter(
    (s) => getMonthlyStatus(payments, s.id, s.nis, CURRENT_ACTIVE_MONTH, 'SPP', sppTargetAmountForDashboard).status === 'LUNAS'
  );
  const sppBelumLunasList = getUnpaidSantri(students, bills);
  const sppLunasCount = sppLunasList.length;
  const sppBelumLunasCount = sppBelumLunasList.length;

  // Total Outstanding Estimate (SPP sesuai target nominal aktif, bukan hardcode)
  const totalOutstandingEstimate = sppBelumLunasCount * sppTargetAmountForDashboard;

  // Perkiraan tagihan per-santri untuk SPP: pakai rincian custom milik santri
  // (suggestedBreakdown) kalau admin sudah menyetelnya, kalau tidak fallback
  // ke target nominal SPP aktif — TIDAK PERNAH hardcode angka tetap.
  const getSppEstimateForStudent = (s: Student): number => {
    if (s.suggestedBreakdown && s.suggestedBreakdown.length > 0) {
      return s.suggestedBreakdown.reduce((sum, item) => sum + item.amount, 0);
    }
    return sppTargetAmountForDashboard;
  };

  // Rihlah ditagihkan & diingatkan TERPISAH dari SPP (modul sendiri, sesuai
  // permintaan) — hanya aktif kalau admin menyalakan rihlahModuleEnabled di
  // Pengaturan. Wali santri yang statusnya belum lunas Rihlah dikumpulkan
  // di sini, independen dari daftar tunggakan SPP di atas.
  const rihlahTargetAmount = paymentTypes.find((pt) => pt.category === 'RIHLAH')?.defaultAmount || 350000;
  const rihlahBelumLunasList = bankAccount.rihlahModuleEnabled
    ? activeStudents.filter((s) => s.rihlahStatus !== 'LUNAS')
    : [];
  const rihlahBelumLunasCount = rihlahBelumLunasList.length;
  const totalRihlahOutstandingEstimate = rihlahBelumLunasCount * rihlahTargetAmount;

  // Filtered Santri List
  const filteredStudents = students.filter((s) => {
    if (!showDeletedSantri && s.isDeleted) return false;
    if (showDeletedSantri && !s.isDeleted) return false;

    const matchesSearch =
      s.name.toLowerCase().includes(santriSearch.toLowerCase()) ||
      s.nis.toLowerCase().includes(santriSearch.toLowerCase()) ||
      s.parentName.toLowerCase().includes(santriSearch.toLowerCase());

    const matchesClass = santriFilterClass === 'ALL' || s.className === santriFilterClass;

    return matchesSearch && matchesClass;
  });

  // Handle Excel Import
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const mapped = data.map((row) => ({
          nis: String(row.NIS || row.nis || Math.floor(100000 + Math.random() * 900000)),
          name: row.Nama || row.name || 'Santri Baru',
          entryDate: row.Masuk || row.entryDate || '27 Juli 2026',
          className: row.Kelas || row.className || 'Kelas 1 SMP',
          dormitoryName: row.Asrama || row.dormitoryName || 'Asrama Bawah',
          parentName: row.Wali || row.parentName || 'Orang Tua',
          parentWhatsapp: String(row.Whatsapp || row.parentWhatsapp || '081234567890'),
          parentAddress: row.Alamat || row.parentAddress || 'Indonesia',
        }));

        const count = importStudents(mapped);
        toast.success(`Berhasil mengimpor ${count} data santri dari file Excel!`);
      } catch (err: any) {
        toast.error('Gagal membaca file Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export Santri to Excel
  const handleExportSantriExcel = () => {
    const exportData = activeStudents.map((s) => ({
      NIS: s.nis,
      Nama_Santri: s.name,
      Tanggal_Masuk: s.entryDate || '27 Juli 2026',
      Kelas: s.className,
      Asrama: s.dormitoryName,
      Nama_Wali: s.parentName,
      WhatsApp: s.parentWhatsapp,
      Alamat: s.parentAddress,
      [`Status_SPP_${CURRENT_ACTIVE_MONTH.replace(' ', '_')}`]: getMonthlyStatus(payments, s.id, s.nis, CURRENT_ACTIVE_MONTH, 'SPP', sppTargetAmountForDashboard).status,
      Saldo_Uang_Jajan: s.uangJajanBalance,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Santri_PondokPay');
    XLSX.writeFile(wb, `PondokPay_DataSantri_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export Reports to Excel
  const handleExportReportsExcel = () => {
    const exportData = verifiedPayments.map((p) => ({
      Invoice: p.invoiceNumber,
      Transaksi: p.transactionNumber,
      NIS: p.studentNis,
      Santri: p.studentName,
      Kelas: p.className,
      Wali: p.parentName,
      Jenis_Pembayaran: p.paymentTypeName,
      Bulan: p.monthYear || '-',
      Nominal: p.amount,
      Metode: p.paymentMethod,
      Waktu: new Date(p.createdAt).toLocaleString('id-ID'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan_Pembayaran');
    XLSX.writeFile(wb, `Laporan_Pembayaran_PondokPay_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Open Edit Student Modal
  const handleEditStudentModal = (s: Student) => {
    setEditingStudent(s);
    setStudentForm({
      name: s.name,
      nis: s.nis,
      entryDate: s.entryDate || '27 Juli 2026',
      classId: s.classId,
      className: s.className,
      dormitoryId: s.dormitoryId,
      dormitoryName: s.dormitoryName,
      parentName: s.parentName,
      parentWhatsapp: s.parentWhatsapp,
      parentAddress: s.parentAddress,
      photoUrl: s.photoUrl || '',
    });
    setShowStudentModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateStudent(editingStudent.id, studentForm);
    } else {
      createStudent(studentForm);
    }
    setShowStudentModal(false);
    setEditingStudent(null);
  };

  // Process TopUp
  const handleExecuteTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpStudent || !topUpAmountInput || topUpAmountInput <= 0) return;
    topUpStudentBalance(topUpStudent.id, Number(topUpAmountInput), topUpNoteInput);
    toast.success(`TopUp Berhasil! Saldo ${topUpStudent.name} bertambah Rp ${Number(topUpAmountInput).toLocaleString('id-ID')}`);
    setTopUpStudent(null);
  };

  // Send WhatsApp Reminder to Unpaid Parent — auto-kirim lewat Fonnte kalau
  // sudah dikonfigurasi (FONNTE_TOKEN di Vercel), fallback ke wa.me manual
  // kalau belum. Toast menunjukkan mana yang benar-benar terjadi.
  const handleSendWaReminder = async (st: Student, customAmt: number = 500000) => {
    const result = await sendPaymentReminderWA(st, bankAccount, customAmt);
    if (result.mode === 'AUTO_SENT') {
      toast.success(`Pengingat WA terkirim otomatis ke ${st.parentName}.`);
    } else {
      toast(`WhatsApp dibuka manual untuk ${st.parentName} — tinggal tekan Kirim.`, { icon: '📲' });
    }
    return result;
  };

  // Kirim pengingat massal, lalu tampilkan ringkasan berapa yang otomatis
  // terkirim vs berapa yang perlu dikirim manual (mis. Fonnte belum aktif).
  const handleSendWaReminderBulk = async (list: Student[], amountFor: (st: Student) => number) => {
    if (list.length === 0) return;
    let autoSent = 0;
    let manual = 0;
    for (const st of list) {
      const result = await sendPaymentReminderWA(st, bankAccount, amountFor(st));
      if (result.mode === 'AUTO_SENT') autoSent += 1;
      else manual += 1;
    }
    if (manual === 0) {
      toast.success(`${autoSent} pengingat WA terkirim otomatis.`);
    } else if (autoSent === 0) {
      toast(`${manual} tab WhatsApp dibuka — Fonnte belum aktif, kirim manual satu-satu.`, { icon: '📲' });
    } else {
      toast.success(`${autoSent} terkirim otomatis, ${manual} perlu dikirim manual (tab WA sudah dibuka).`);
    }
  };

  const handleOpenReminderModal = (st: Student) => {
    setReminderModalStudent(st);
    setReminderCustomAmount(500000);
    setReminderCustomText(buildPaymentReminderTemplate(st, bankAccount, 500000));
  };

  const navItems = [
    { id: 'OVERVIEW', label: 'Ringkasan & Stats', icon: LayoutDashboard },
    { id: 'SANTRI', label: `Data Santri (${activeStudents.length})`, icon: Users },
    { id: 'TUNGGAKAN', label: `Tunggakan (${sppBelumLunasCount})`, icon: AlertTriangle, badge: sppBelumLunasCount > 0 ? sppBelumLunasCount : undefined, alert: true },
    { id: 'VERIFIKASI', label: `Verifikasi (${pendingPayments.length})`, icon: CreditCard, badge: pendingPayments.length },
    { id: 'TAGIHAN', label: 'Buat Tagihan', icon: FileText },
    { id: 'KAS', label: 'Kas Pondok', icon: Wallet },
    { id: 'LAPORAN', label: 'Laporan Keuangan', icon: BarChart3 },
    { id: 'PENGUMUMAN', label: 'Pengumuman', icon: Bell },
    { id: 'PENGATURAN', label: 'Pengaturan Sistem', icon: Globe },
    { id: 'AUDIT_LOG', label: 'Audit Log', icon: History },
    { id: 'DANGER_ZONE', label: 'Zona Bahaya', icon: ShieldCheck, danger: true },
  ];

  const currentTabLabel = navItems.find((n) => n.id === activeTab)?.label || 'Overview';

  return (
    <div className="flex flex-col gap-6 pb-24 lg:pb-10">

      {/* Desktop Tab Navigation (Horizontal, no more duplicate sidebar) —
          nempel PERSIS di atas area scroll (top-0), bukan top-20. Sebelumnya
          top-20 bikin nav ini "ngambang nanggung" dengan jarak kosong aneh
          pas di-scroll karena tidak ada elemen lain yang perlu dilewati. */}
      <div className="hidden lg:block sticky top-0 z-30 -mt-6 md:-mt-8 pt-6 md:pt-8 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-lg overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1.5 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : item.danger
                      ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.danger ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${item.alert ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'} ${isActive ? '' : 'animate-pulse'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Visible only on small screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 px-1 py-2 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex overflow-x-auto gap-2 no-scrollbar items-center px-2 pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`flex flex-col items-center justify-center shrink-0 min-w-[72px] p-2 rounded-xl transition ${
                  isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                } ${item.danger && !isActive ? 'text-red-400' : ''}`}
              >
                <div className="relative mb-1">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${item.alert ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                  )}
                </div>
                <span className="text-[9px] font-bold tracking-tight truncate w-full text-center">
                  {item.label.split(' ')[0] === 'Data' || item.label.split(' ')[0] === 'Buat' || item.label.split(' ')[0] === 'Pengaturan' ? item.label.split(' ')[1] : item.label.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main key={activeTab} className="flex-1 space-y-8 min-w-0 animate-page-in">

        {/* Page Header — ringkas, sesuai design system (bukan hero card besar berulang) */}
        {activeTab === 'OVERVIEW' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-emerald-600 dark:text-emerald-400 mb-1" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', serif" }}>
                <span className="text-lg font-bold tracking-wide">أَهْلًا وَسَهْلًا</span>
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ini ringkasan keuangan pondok hari ini.</p>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            
            {/* PRIMARY METRIC — Saldo Kas Pondok (hero card, paling dominan) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <StatCard
                size="lg"
                label="Saldo Kas Pondok"
                value={`Rp ${saldoKasPondok.toLocaleString('id-ID')}`}
                icon={Landmark}
                tone="primary"
                trendLabel="Akumulasi pemasukan − pengeluaran"
                sparkline={last7DaysSparkline}
                className="lg:col-span-1"
              />
              <StatCard
                label="Pemasukan Bulan Ini"
                value={`Rp ${totalBulanIni.toLocaleString('id-ID')}`}
                icon={TrendingUp}
                tone="success"
                trendPercent={pemasukanTrendPercent}
                trendLabel="vs bulan lalu"
              />
              <StatCard
                label="Pengeluaran Bulan Ini"
                value={`Rp ${totalPengeluaranBulanIni.toLocaleString('id-ID')}`}
                icon={TrendingDown}
                tone="danger"
                trendPercent={pengeluaranTrendPercent}
                trendLabel="vs bulan lalu"
              />
            </div>

            {/* SECONDARY METRICS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Net Cash Flow" value={`${netCashFlowBulanIni >= 0 ? '+' : '-'}Rp ${Math.abs(netCashFlowBulanIni).toLocaleString('id-ID')}`} icon={Wallet} tone={netCashFlowBulanIni >= 0 ? 'success' : 'danger'} caption="Bulan ini" />
              <StatCard label="Santri Aktif" value={`${activeStudents.length}`} icon={Users} tone="neutral" caption="Terdaftar sistem" />
              <StatCard label="Transaksi" value={`${totalTransactionCount}`} icon={CreditCard} tone="neutral" caption={`${transactingStudentsCount} santri aktif`} />
              <StatCard label="Tunggakan SPP" value={`${sppBelumLunasCount} Santri`} icon={AlertTriangle} tone="warning" caption={`Est. Rp ${totalOutstandingEstimate.toLocaleString('id-ID')}`} />
            </div>

            {/* VISUAL METRICS: Cash Flow Chart + Distribusi Kategori (donut) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-white text-sm">Arus Kas 30 Hari Terakhir</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Pemasukan terverifikasi vs pengeluaran kas pondok</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Pemasukan</span>
                    <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Pengeluaran</span>
                  </div>
                </div>
                <div className="h-56 w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowChartData}>
                      <defs>
                        <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" hide />
                      <YAxis hide />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: 4 }}
                        formatter={(val: number, name: string) => [`Rp ${val.toLocaleString('id-ID')}`, name === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran']}
                      />
                      <Area type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPemasukan)" />
                      <Area type="monotone" dataKey="pengeluaran" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPengeluaran)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Distribusi Pemasukan</h3>
                {categoryDistribution.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-2">
                    <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-semibold text-slate-400">Belum ada pemasukan terverifikasi.</p>
                  </div>
                ) : (
                  <>
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={3} strokeWidth={0} animationDuration={600}>
                            {categoryDistribution.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {categoryDistribution.slice(0, 5).map((c) => (
                        <div key={c.name} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300 truncate">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white shrink-0 ml-2">Rp {c.value.toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status Pembayaran SPP — progress bar besar seperti fintech */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Status Pembayaran SPP Bulan Ini</h3>
                <span className="text-[11px] font-bold text-slate-400">{activeStudents.length > 0 ? Math.round((sppLunasCount / activeStudents.length) * 100) : 0}% Terbayar</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: activeStudents.length > 0 ? `${(sppLunasCount / activeStudents.length) * 100}%` : '0%' }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Lunas — {sppLunasCount} Santri</span>
                <span className="text-red-500 dark:text-red-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Belum Lunas — {sppBelumLunasCount} Santri</span>
              </div>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="bg-emerald-900 dark:bg-emerald-950 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-800/80">
              <div className="space-y-1">
                <h4 className="font-extrabold text-base flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> Aksi Cepat Pengurus Pondok
                </h4>
                <p className="text-xs text-emerald-200">Akses cepat manajemen santri, topup uang jajan, atau deteksi tunggakan wali santri.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('SANTRI')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <Users className="w-4 h-4" /> Kelola Santri & TopUp
                </button>
                <button
                  onClick={() => setActiveTab('TUNGGAKAN')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <AlertTriangle className="w-4 h-4" /> Cek Belum Bayar ({sppBelumLunasCount})
                </button>
                <button
                  onClick={() => setActiveTab('VERIFIKASI')}
                  className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <CreditCard className="w-4 h-4 text-emerald-700" /> Verifikasi ({pendingPayments.length})
                </button>
              </div>
            </div>

            {/* Verification Alert Banner */}
            {pendingPayments.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-3xl p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base">Ada {pendingPayments.length} Pembayaran Menunggu Verifikasi</h4>
                    <p className="text-xs text-amber-100">Segera periksa bukti transfer dan lakukan verifikasi agar santri menerima struk.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('VERIFIKASI')}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition shrink-0"
                >
                  Verifikasi Sekarang
                </button>
              </div>
            )}

            {/* Recent Transactions — desain "fintech": icon bulat, warna semantik, nominal ditonjolkan */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Transaksi Terbaru</h3>
                <button onClick={() => setActiveTab('LAPORAN')} className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Lihat Semua
                </button>
              </div>

              {verifiedPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <CreditCard className="w-9 h-9 text-slate-300 dark:text-slate-700" />
                  <h4 className="text-sm font-extrabold text-slate-600 dark:text-slate-300">Belum Ada Transaksi</h4>
                  <p className="text-xs text-slate-400 max-w-xs">Transaksi yang sudah diverifikasi akan langsung muncul di sini.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {verifiedPayments.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{p.paymentTypeName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{p.studentName} • {new Date(p.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">+Rp {p.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: MANAJEMEN SANTRI (EXACT COLUMNS REQUESTED BY USER) */}
        {activeTab === 'SANTRI' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Data Santri Pondok ({filteredStudents.length})</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Daftar lengkap santri, saldo uang jajan, dan aksi cepat TopUp.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  ref={excelInputRef}
                  onChange={handleExcelImport}
                  className="hidden"
                />
                <button
                  onClick={() => excelInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Import Excel
                </button>

                <button
                  onClick={handleExportSantriExcel}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Export Excel
                </button>

                <button
                  onClick={() => { setEditingStudent(null); setStudentForm({ name: '', nis: '', entryDate: '27 Juli 2026', classId: INITIAL_CLASSES[0].id, className: INITIAL_CLASSES[0].name, dormitoryId: INITIAL_DORMITORIES[0].id, dormitoryName: INITIAL_DORMITORIES[0].name, parentName: '', parentWhatsapp: '', parentAddress: '', photoUrl: '' }); setShowStudentModal(true); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Tambah Santri
                </button>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari Santri, NIS, atau Nama Orang Tua..."
                  value={santriSearch}
                  onChange={(e) => setSantriSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              <select
                value={santriFilterClass}
                onChange={(e) => setSantriFilterClass(e.target.value)}
                className="px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Semua Kelas</option>
                {INITIAL_CLASSES.map((c) => (
                  <option key={c.id} value={c.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>
                ))}
              </select>

              <button
                onClick={() => setShowDeletedSantri(!showDeletedSantri)}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                  showDeletedSantri
                    ? 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                {showDeletedSantri ? 'Tampilkan Santri Aktif' : 'Sampah / Terhapus'}
              </button>
            </div>

            {/* Santri Table matching user's requested layout */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-slate-800 dark:bg-slate-950 text-slate-200 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Santri</th>
                    <th className="p-3">NIS</th>
                    <th className="p-3">Kelas / Asrama</th>
                    <th className="p-3">Orang Tua / HP</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            photoUrl={st.photoUrl}
                            name={st.name}
                            nis={st.nis}
                            size="sm"
                          />
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs">{st.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">Masuk: {st.entryDate || '27 Juli 2026'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{st.nis}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                        <span className="block font-semibold">{st.className}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{st.dormitoryName}</span>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        <span className="block font-semibold">{st.parentName}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{st.parentWhatsapp}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold rounded-full">
                          Aktif
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {!st.isDeleted ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewingStudentMatrix(st)}
                              className="p-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-xl shadow-sm transition"
                              title="Matriks Status SPP 12 Bulan"
                            >
                              <Calendar className="w-4 h-4 text-emerald-400" />
                            </button>
                            {getMonthlyStatus(payments, st.id, st.nis, CURRENT_ACTIVE_MONTH, 'SPP', sppTargetAmountForDashboard).status !== 'LUNAS' && (
                              <button
                                onClick={() => handleOpenReminderModal(st)}
                                className="p-2 bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-500 text-slate-950 dark:text-white rounded-xl shadow-sm transition"
                                title="Send Payment Reminder via WhatsApp"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSettleStudent(st);
                                setSettleCategory('SPP');
                                setSettleAmount(500000);
                                setSettleNote('');
                              }}
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition"
                              title="Lunaskan Pembayaran Manual (Bayar Cash/Tunai)"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setBreakdownStudent(st);
                                setStudentBreakdownForm(
                                  st.suggestedBreakdown && st.suggestedBreakdown.length > 0
                                    ? st.suggestedBreakdown
                                    : (bankAccount.defaultPaymentBreakdown || []).map((i) => ({ ...i }))
                                );
                              }}
                              className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm transition"
                              title="Kustomisasi Rincian Pembayaran Santri Ini"
                            >
                              <Wallet className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditStudentModal(st)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteStudent(st.id, true)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-red-600 dark:text-red-400 transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => restoreStudent(st.id)}
                              className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition"
                            >
                              <RotateCcw className="w-3 h-3 inline mr-1" /> Pulihkan
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Hapus PERMANEN data ${st.name}? Tindakan ini tidak bisa dibatalkan.`)) {
                                  deleteStudent(st.id, false);
                                  toast.success(`${st.name} dihapus permanen dari database.`);
                                }
                              }}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                              title="Hapus Permanen dari Database"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus Permanen
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 3: DETEKSI TUNGGAKAN / BELUM BAYAR */}
        {activeTab === 'TUNGGAKAN' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Deteksi Belum Bayar
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Mendeteksi otomatis wali santri yang belum melunasi kewajibannya — SPP dan Rihlah ditampilkan terpisah.</p>
              </div>
            </div>

            {/* Sub-tab SPP vs Rihlah — dua daftar & dua tombol kirim yang benar-benar terpisah */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <button
                onClick={() => setTunggakanView('SPP')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  tunggakanView === 'SPP'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Tunggakan SPP ({sppBelumLunasCount})
              </button>
              {bankAccount.rihlahModuleEnabled && (
                <button
                  onClick={() => setTunggakanView('RIHLAH')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    tunggakanView === 'RIHLAH'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Tunggakan Rihlah ({rihlahBelumLunasCount})
                </button>
              )}
              {!bankAccount.rihlahModuleEnabled && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-2">
                  Modul Rihlah nonaktif — aktifkan di Pengaturan Sistem untuk melihat tunggakan Rihlah terpisah.
                </span>
              )}
            </div>

            {tunggakanView === 'SPP' ? (
              <>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">Total Perkiraan Tunggakan SPP Bulan Ini</span>
                    <span className="text-2xl font-black text-red-700 dark:text-red-400">Rp {totalOutstandingEstimate.toLocaleString('id-ID')}</span>
                  </div>
                  <button
                    onClick={() => handleSendWaReminderBulk(sppBelumLunasList, getSppEstimateForStudent)}
                    disabled={sppBelumLunasList.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" /> Kirim Pengingat Massal WA
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Santri & NIS</th>
                        <th className="p-3">Kelas & Asrama</th>
                        <th className="p-3">Wali Santri & WA</th>
                        <th className="p-3">Status SPP</th>
                        <th className="p-3 text-right">Perkiraan Biaya</th>
                        <th className="p-3 text-center">Aksi Pengingat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sppBelumLunasList.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Semua santri sudah lunas SPP bulan ini. 🎉</td></tr>
                      ) : sppBelumLunasList.map((st) => (
                        <tr key={st.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {st.name}
                            <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">{st.nis}</span>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {st.className} • {st.dormitoryName}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            <span className="font-semibold block">{st.parentName}</span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{st.parentWhatsapp}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300">
                              BELUM LUNAS
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-red-700 dark:text-red-400">
                            Rp {getSppEstimateForStudent(st).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSendWaReminder(st, getSppEstimateForStudent(st))}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                                title="Kirim pengingat WhatsApp"
                              >
                                <Send className="w-4 h-4" /> Kirim WA
                              </button>
                              <button
                                onClick={() => handleOpenReminderModal(st)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
                                title="Pratinjau / Custom Pesan WA"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 block">Total Perkiraan Tunggakan Rihlah</span>
                    <span className="text-2xl font-black text-red-700 dark:text-red-400">Rp {totalRihlahOutstandingEstimate.toLocaleString('id-ID')}</span>
                  </div>
                  <button
                    onClick={() => handleSendWaReminderBulk(rihlahBelumLunasList, () => rihlahTargetAmount)}
                    disabled={rihlahBelumLunasList.length === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" /> Kirim Pengingat Massal WA (Rihlah)
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Santri & NIS</th>
                        <th className="p-3">Kelas & Asrama</th>
                        <th className="p-3">Wali Santri & WA</th>
                        <th className="p-3">Status Rihlah</th>
                        <th className="p-3 text-right">Perkiraan Biaya</th>
                        <th className="p-3 text-center">Aksi Pengingat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rihlahBelumLunasList.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Semua santri sudah lunas Rihlah. 🎉</td></tr>
                      ) : rihlahBelumLunasList.map((st) => (
                        <tr key={st.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {st.name}
                            <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">{st.nis}</span>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {st.className} • {st.dormitoryName}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            <span className="font-semibold block">{st.parentName}</span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{st.parentWhatsapp}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300">
                              BELUM LUNAS
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-red-700 dark:text-red-400">
                            Rp {rihlahTargetAmount.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleSendWaReminder(st, rihlahTargetAmount)}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center justify-center gap-2 shadow-sm"
                              title="Kirim pengingat WhatsApp Rihlah"
                            >
                              <Send className="w-4 h-4" /> Kirim WA
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: VERIFIKASI PEMBAYARAN */}
        {activeTab === 'VERIFIKASI' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Verifikasi Pembayaran Santri</h3>
                <p className="text-xs text-slate-500">Periksa bukti transfer dan setujui atau tolak pembayaran.</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                {pendingPayments.length} Menunggu
              </span>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Pembayaran Yang Menunggu Verifikasi</h4>
                <p className="text-xs text-slate-500">Seluruh konfirmasi dari wali santri telah diproses.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-slate-900">{p.invoiceNumber}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                          {p.paymentMethod}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base">
                        {p.studentName} ({p.studentNis}) • {p.className}
                      </h4>
                      <p className="text-xs text-slate-600">
                        Wali: <strong>{p.parentName}</strong> ({p.parentWhatsapp}) • Jenis: <strong>{p.paymentTypeName} {p.monthYear ? `(${p.monthYear})` : ''}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Waktu Submit: {new Date(p.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                      <div className="text-right mr-2">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">TOTAL</span>
                        <span className="text-lg font-black text-emerald-700">Rp {p.amount.toLocaleString('id-ID')}</span>
                      </div>

                      {p.proofUrl && (
                        <button
                          onClick={() => setPreviewProofUrl(p.proofUrl!)}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Bukti
                        </button>
                      )}

                      <button
                        onClick={() => {
                          verifyPayment(p.id, true);
                          toast.success(`Pembayaran ${p.studentName} (${p.invoiceNumber}) berhasil diverifikasi LUNAS!`);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1 active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Setujui Lunas
                      </button>

                      <button
                        onClick={() => { setRejectingPayment(p); setRejectionReasonInput(''); }}
                        className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-xl transition flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" /> Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: BUAT TAGIHAN */}
        {activeTab === 'TAGIHAN' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Buat Tagihan Baru</h3>
              <p className="text-xs text-slate-500">
                Terbitkan tagihan masal untuk Seluruh Santri, Per Kelas, Per Asrama, atau Per Santri.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Tagihan *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['ALL', 'CLASS', 'DORM', 'STUDENT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBillTargetType(t)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        billTargetType === t
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'ALL' && 'Semua'}
                      {t === 'CLASS' && 'Per Kelas'}
                      {t === 'DORM' && 'Per Asrama'}
                      {t === 'STUDENT' && 'Per Santri'}
                    </button>
                  ))}
                </div>
              </div>

              {billTargetType === 'CLASS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Kelas</label>
                  <select
                    value={billTargetId}
                    onChange={(e) => setBillTargetId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                  >
                    {INITIAL_CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {billTargetType === 'DORM' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Asrama</label>
                  <select
                    value={billTargetId}
                    onChange={(e) => setBillTargetId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                  >
                    {INITIAL_DORMITORIES.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {billTargetType === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Santri</label>
                  <select
                    value={billTargetId}
                    onChange={(e) => setBillTargetId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                  >
                    {activeStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.nis} - {s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bulan & Tahun (SPP)</label>
                <input
                  type="text"
                  value={billMonthYear}
                  onChange={(e) => setBillMonthYear(e.target.value)}
                  placeholder="Contoh: Agustus 2026"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jatuh Tempo</label>
                <input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <button
                onClick={() => {
                  const count = generateBills(
                    billTargetType,
                    billTargetId,
                    billPaymentTypeId,
                    billMonthYear,
                    billDueDate,
                    billCustomAmount ? Number(billCustomAmount) : undefined
                  );
                  toast.success(`Berhasil menerbitkan ${count} tagihan baru!`);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Terbitkan Tagihan
              </button>
            </div>
          </div>
        )}

        {/* TAB: KAS PONDOK (Pemasukan & Pengeluaran) */}
        {activeTab === 'KAS' && (() => {
          const totalPemasukanManual = cashflow.filter((c) => c.type === 'PEMASUKAN').reduce((s, c) => s + c.amount, 0);
          const totalPengeluaran = cashflow.filter((c) => c.type === 'PENGELUARAN').reduce((s, c) => s + c.amount, 0);
          const totalPembayaranVerified = payments.filter((p) => p.status === 'DIVERIFIKASI').reduce((s, p) => s + p.amount, 0);
          const totalPemasukan = totalPemasukanManual + totalPembayaranVerified;
          const saldoKas = totalPemasukan - totalPengeluaran;

          // Build period-based stats (last 8 weeks / 6 months / 5 years)
          const now = new Date();
          let statsData: { label: string; pemasukan: number; pengeluaran: number }[] = [];

          const allIncomeEvents = [
            ...cashflow.filter((c) => c.type === 'PEMASUKAN').map((c) => ({ date: c.date, amount: c.amount })),
            ...payments.filter((p) => p.status === 'DIVERIFIKASI').map((p) => ({ date: (p.verifiedAt || p.createdAt).slice(0, 10), amount: p.amount })),
          ];
          const allExpenseEvents = cashflow.filter((c) => c.type === 'PENGELUARAN').map((c) => ({ date: c.date, amount: c.amount }));

          if (statsPeriod === 'WEEK') {
            for (let i = 7; i >= 0; i--) {
              const d = new Date(now);
              d.setDate(d.getDate() - i * 7);
              const weekStart = new Date(d);
              weekStart.setDate(d.getDate() - d.getDay());
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
              const inRange = (ev: { date: string }) => {
                const ed = new Date(ev.date);
                return ed >= weekStart && ed <= weekEnd;
              };
              statsData.push({
                label,
                pemasukan: allIncomeEvents.filter(inRange).reduce((s, e) => s + e.amount, 0),
                pengeluaran: allExpenseEvents.filter(inRange).reduce((s, e) => s + e.amount, 0),
              });
            }
          } else if (statsPeriod === 'MONTH') {
            for (let i = 5; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
              const inRange = (ev: { date: string }) => {
                const ed = new Date(ev.date);
                return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
              };
              statsData.push({
                label,
                pemasukan: allIncomeEvents.filter(inRange).reduce((s, e) => s + e.amount, 0),
                pengeluaran: allExpenseEvents.filter(inRange).reduce((s, e) => s + e.amount, 0),
              });
            }
          } else {
            for (let i = 4; i >= 0; i--) {
              const year = now.getFullYear() - i;
              const inRange = (ev: { date: string }) => new Date(ev.date).getFullYear() === year;
              statsData.push({
                label: String(year),
                pemasukan: allIncomeEvents.filter(inRange).reduce((s, e) => s + e.amount, 0),
                pengeluaran: allExpenseEvents.filter(inRange).reduce((s, e) => s + e.amount, 0),
              });
            }
          }

          return (
            <div className="space-y-6">
              {/* Saldo Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div whileHover={{ y: -3 }} className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <PiggyBank className="w-20 h-20 absolute -right-3 -bottom-3 text-white/10" />
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark className="w-4 h-4 text-violet-200" />
                    <span className="text-[11px] font-bold text-violet-200 uppercase tracking-wider">Total Saldo Kas</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight">Rp {saldoKas.toLocaleString('id-ID')}</div>
                  <p className="text-[11px] text-violet-200/90 mt-1">Pemasukan − Pengeluaran (real-time)</p>
                </motion.div>

                <motion.div whileHover={{ y: -3 }} className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <TrendingUp className="w-20 h-20 absolute -right-3 -bottom-3 text-white/10" />
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-100" />
                    <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Total Pemasukan</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight">Rp {totalPemasukan.toLocaleString('id-ID')}</div>
                  <p className="text-[11px] text-emerald-100/90 mt-1">Termasuk {payments.filter(p=>p.status==='DIVERIFIKASI').length} pembayaran terverifikasi</p>
                </motion.div>

                <motion.div whileHover={{ y: -3 }} className="bg-gradient-to-br from-rose-500 to-red-700 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <TrendingDown className="w-20 h-20 absolute -right-3 -bottom-3 text-white/10" />
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-rose-100" />
                    <span className="text-[11px] font-bold text-rose-100 uppercase tracking-wider">Total Pengeluaran</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight">Rp {totalPengeluaran.toLocaleString('id-ID')}</div>
                  <p className="text-[11px] text-rose-100/90 mt-1">{cashflow.filter(c=>c.type==='PENGELUARAN').length} catatan pengeluaran</p>
                </motion.div>
              </div>

              {/* Statistik Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-600" /> Statistik Arus Kas
                  </h3>
                  <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {([
                      { id: 'WEEK', label: 'Mingguan' },
                      { id: 'MONTH', label: 'Bulanan' },
                      { id: 'YEAR', label: 'Tahunan' },
                    ] as const).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setStatsPeriod(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                          statsPeriod === p.id ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={statsData}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(v: number) => `Rp ${v.toLocaleString('id-ID')}`} />
                    <Area type="monotone" dataKey="pemasukan" stroke="#10b981" fill="url(#colorIn)" strokeWidth={2} name="Pemasukan" />
                    <Area type="monotone" dataKey="pengeluaran" stroke="#f43f5e" fill="url(#colorOut)" strokeWidth={2} name="Pengeluaran" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Form Tambah Transaksi */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-violet-600" /> Catat Transaksi Kas Baru
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCfType('PEMASUKAN')}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition flex items-center justify-center gap-1.5 ${
                      cfType === 'PEMASUKAN' ? 'bg-emerald-600 border-emerald-600 text-white shadow' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Pemasukan
                  </button>
                  <button
                    onClick={() => setCfType('PENGELUARAN')}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition flex items-center justify-center gap-1.5 ${
                      cfType === 'PENGELUARAN' ? 'bg-rose-600 border-rose-600 text-white shadow' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" /> Pengeluaran
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                    <input
                      type="text"
                      value={cfCategory}
                      onChange={(e) => setCfCategory(e.target.value)}
                      placeholder={cfType === 'PEMASUKAN' ? 'Contoh: Donasi, Infaq' : 'Contoh: Listrik, Konsumsi, Perbaikan'}
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={cfDate}
                      onChange={(e) => setCfDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={cfAmount}
                    onChange={(e) => setCfAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan (dipakai untuk apa)</label>
                  <input
                    type="text"
                    value={cfDescription}
                    onChange={(e) => setCfDescription(e.target.value)}
                    placeholder="Contoh: Beli galon air minum 10 buah"
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!cfCategory || !cfAmount || Number(cfAmount) <= 0 || !cfDescription) {
                      toast.error('Lengkapi semua field transaksi');
                      return;
                    }
                    addCashflowEntry({ type: cfType, category: cfCategory, amount: Number(cfAmount), description: cfDescription, date: cfDate });
                    setCfCategory('');
                    setCfAmount('');
                    setCfDescription('');
                    toast.success('Transaksi kas berhasil dicatat!');
                  }}
                  className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow transition ${
                    cfType === 'PEMASUKAN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Simpan Transaksi
                </button>
              </div>

              {/* Riwayat Transaksi Manual */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Riwayat Transaksi Kas Manual ({cashflow.length})</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                  {cashflow.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">Belum ada catatan transaksi manual.</p>
                  )}
                  {cashflow.map((c) => (
                    <div key={c.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.type === 'PEMASUKAN' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-rose-100 dark:bg-rose-950 text-rose-600'}`}>
                          {c.type === 'PEMASUKAN' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.category}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{c.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(c.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • {c.createdBy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-black ${c.type === 'PEMASUKAN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {c.type === 'PEMASUKAN' ? '+' : '-'}Rp {c.amount.toLocaleString('id-ID')}
                        </span>
                        <button onClick={() => { deleteCashflowEntry(c.id); toast.success('Catatan dihapus'); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 6: LAPORAN KEUANGAN */}
        {activeTab === 'LAPORAN' && (() => {
          const reportPayments = payments.filter((p) => {
            if (reportFilterType === 'MONTH') {
              return (
                p.monthYear === reportMonthValue ||
                (p.createdAt &&
                  new Date(p.createdAt)
                    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                    .toLowerCase()
                    .includes(reportMonthValue.toLowerCase()))
              );
            }
            if (reportFilterType === 'CLASS') {
              return p.className.toLowerCase() === reportClassValue.toLowerCase();
            }
            if (reportFilterType === 'STUDENT') {
              return p.studentId === reportStudentId || p.studentNis === reportStudentId;
            }
            if (reportFilterType === 'CUSTOM') {
              let matchName = true;
              let matchDate = true;
              if (reportSearchName.trim()) {
                const term = reportSearchName.toLowerCase();
                matchName = p.studentName.toLowerCase().includes(term) || p.studentNis.toLowerCase().includes(term);
              }
              if (reportStartDate || reportEndDate) {
                const pDate = new Date(p.createdAt);
                if (reportStartDate) {
                  matchDate = matchDate && pDate >= new Date(reportStartDate);
                }
                if (reportEndDate) {
                  const end = new Date(reportEndDate);
                  end.setHours(23, 59, 59, 999);
                  matchDate = matchDate && pDate <= end;
                }
              }
              return matchName && matchDate;
            }
            return true;
          });

          const handleExportPDF = () => {
            let filterLabel = 'Semua Transaksi Keuangan';
            if (reportFilterType === 'MONTH') filterLabel = `Periode Bulan: ${reportMonthValue}`;
            if (reportFilterType === 'CLASS') filterLabel = `Kelas: ${reportClassValue}`;
            if (reportFilterType === 'STUDENT') {
              const s = activeStudents.find((st) => st.id === reportStudentId || st.nis === reportStudentId);
              filterLabel = s ? `Santri: ${s.name} (${s.nis})` : 'Per Santri';
            }
            if (reportFilterType === 'CUSTOM') {
              filterLabel = 'Pencarian Khusus';
              if (reportStartDate && reportEndDate) {
                filterLabel += ` (${reportStartDate} s/d ${reportEndDate})`;
              }
            }

            downloadTransactionsPDF(reportPayments, {
              title: filterLabel,
              filterTypeLabel: filterLabel,
              pesantrenName: bankAccount.pesantrenName,
              whatsappAdmin: bankAccount.whatsappAdmin,
            });
          };

          return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" /> Laporan Keuangan & Rekap Pemasukan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Unduh rekap transaksi laporan keuangan versi PDF atau Excel (Semua, Per Bulan, Per Kelas, Per Santri).</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportPDF}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Download Laporan PDF
                  </button>

                  <button
                    onClick={handleExportReportsExcel}
                    className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel
                  </button>
                </div>
              </div>

              {/* Filter Controls for Reports */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">Filter Laporan:</span>
                  {(['ALL', 'MONTH', 'CLASS', 'STUDENT', 'CUSTOM'] as const).map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setReportFilterType(ft)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        reportFilterType === ft
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {ft === 'ALL' && 'Semua Transaksi'}
                      {ft === 'MONTH' && 'Per Bulan'}
                      {ft === 'CLASS' && 'Per Kelas'}
                      {ft === 'STUDENT' && 'Per Santri'}
                      {ft === 'CUSTOM' && 'Pencarian Khusus'}
                    </button>
                  ))}
                  <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const day = now.getDay(); // 0 = Minggu
                      const diffToMonday = day === 0 ? 6 : day - 1;
                      const monday = new Date(now);
                      monday.setDate(now.getDate() - diffToMonday);
                      setReportFilterType('CUSTOM');
                      setReportSearchName('');
                      setReportStartDate(monday.toISOString().slice(0, 10));
                      setReportEndDate(now.toISOString().slice(0, 10));
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Rekap Minggu Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                      setReportFilterType('CUSTOM');
                      setReportSearchName('');
                      setReportStartDate(firstOfMonth.toISOString().slice(0, 10));
                      setReportEndDate(now.toISOString().slice(0, 10));
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-100 dark:hover:bg-teal-900/40 flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Rekap Bulan Ini
                  </button>
                </div>

                {/* Sub-filter Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {reportFilterType === 'CUSTOM' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cari Nama/NIS</label>
                        <input
                          type="text"
                          placeholder="Ketik nama atau NIS..."
                          value={reportSearchName}
                          onChange={(e) => setReportSearchName(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Mulai</label>
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Akhir</label>
                        <input
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  )}

                  {reportFilterType === 'MONTH' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Bulan & Tahun</label>
                      <select
                        value={reportMonthValue}
                        onChange={(e) => setReportMonthValue(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Juli 2026">Juli 2026</option>
                        <option value="Agustus 2026">Agustus 2026</option>
                        <option value="September 2026">September 2026</option>
                        <option value="Oktober 2026">Oktober 2026</option>
                        <option value="November 2026">November 2026</option>
                        <option value="Desember 2026">Desember 2026</option>
                        <option value="Januari 2027">Januari 2027</option>
                        <option value="Februari 2027">Februari 2027</option>
                        <option value="Maret 2027">Maret 2027</option>
                        <option value="April 2027">April 2027</option>
                        <option value="Mei 2027">Mei 2027</option>
                        <option value="Juni 2027">Juni 2027</option>
                      </select>
                    </div>
                  )}

                  {reportFilterType === 'CLASS' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Kelas</label>
                      <select
                        value={reportClassValue}
                        onChange={(e) => setReportClassValue(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      >
                        {INITIAL_CLASSES.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {reportFilterType === 'STUDENT' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Santri</label>
                      <select
                        value={reportStudentId}
                        onChange={(e) => setReportStudentId(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Semua Santri --</option>
                        {activeStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nis} - {s.name} ({s.className})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* KPI summary based on filtered report */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300">Total SPP Terkumpul</span>
                  <div className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                    Rp {reportPayments.filter(p => p.category === 'SPP').reduce((a,b) => a + b.amount, 0).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase text-teal-800 dark:text-teal-300">Total Uang Jajan Deposit</span>
                  <div className="text-xl font-black text-teal-900 dark:text-teal-200">
                    Rp {reportPayments.filter(p => p.category === 'UANG_JAJAN').reduce((a,b) => a + b.amount, 0).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-800 dark:text-indigo-300">Lainnya (Rihlah/Kitab)</span>
                  <div className="text-xl font-black text-indigo-900 dark:text-indigo-200">
                    Rp {reportPayments.filter(p => !['SPP', 'UANG_JAJAN'].includes(p.category)).reduce((a,b) => a + b.amount, 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Table of Filtered Payments */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Santri</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Metode</th>
                      <th className="p-3 text-right">Nominal</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Aksi Struk PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                          Tidak ditemukan data transaksi untuk filter ini.
                        </td>
                      </tr>
                    ) : (
                      reportPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{p.invoiceNumber}</td>
                          <td className="p-3 text-slate-900 dark:text-slate-200 font-medium">
                            {p.studentName} <span className="text-[11px] text-slate-500">({p.studentNis})</span>
                          </td>
                          <td className="p-3 text-slate-800 dark:text-slate-300">{p.paymentTypeName}</td>
                          <td className="p-3 text-slate-800 dark:text-slate-300">{p.paymentMethod}</td>
                          <td className="p-3 text-right font-black text-emerald-700 dark:text-emerald-400">
                            {editingPaymentId === p.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-[11px]">Rp</span>
                                <input
                                  type="number"
                                  autoFocus
                                  value={editAmountValue}
                                  onChange={(e) => setEditAmountValue(e.target.value)}
                                  className="w-24 p-1 text-right text-xs font-bold border border-emerald-400 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                />
                              </div>
                            ) : (
                              <>Rp {p.amount.toLocaleString('id-ID')}</>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.status === 'DIVERIFIKASI'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : p.status === 'MENUNGGU_VERIFIKASI'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : p.status === 'DIBATALKAN'
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            }`}>
                              {p.status === 'DIVERIFIKASI' ? 'PAID' : p.status === 'MENUNGGU_VERIFIKASI' ? 'PENDING' : p.status === 'DIBATALKAN' ? 'DIBATALKAN' : 'REJECTED'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button
                                onClick={() => downloadStrukPDF(p, bankAccount)}
                                disabled={p.status !== 'DIVERIFIKASI'}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] flex items-center gap-1 transition shadow-sm disabled:opacity-50"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </button>
                              <button
                                onClick={() => onViewStruk(p)}
                                disabled={p.status !== 'DIVERIFIKASI'}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-bold text-[11px] transition disabled:opacity-50"
                              >
                                Cetak
                              </button>
                              {editingPaymentId === p.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      const newAmount = Number(editAmountValue);
                                      if (!newAmount || newAmount <= 0) {
                                        toast.error('Nominal tidak valid.');
                                        return;
                                      }
                                      updatePaymentAmount(p.id, newAmount);
                                      toast.success('Nominal pembayaran berhasil dikoreksi.');
                                      setEditingPaymentId(null);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] flex items-center gap-1 transition shadow-sm"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    onClick={() => setEditingPaymentId(null)}
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-bold text-[11px] transition"
                                  >
                                    Batal
                                  </button>
                                </>
                              ) : (
                                (p.status === 'DIVERIFIKASI' || p.status === 'MENUNGGU_VERIFIKASI') && (
                                  <button
                                    onClick={() => {
                                      setEditingPaymentId(p.id);
                                      setEditAmountValue(String(p.amount));
                                    }}
                                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded font-bold text-[11px] transition"
                                    title="Koreksi nominal pembayaran ini"
                                  >
                                    <Pencil className="w-3 h-3 inline" /> Edit
                                  </button>
                                )
                              )}
                              {p.status === 'DIVERIFIKASI' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Batalkan verifikasi pembayaran ${p.invoiceNumber} (${p.studentName})? Status akan dikembalikan ke Belum Lunas.`)) {
                                      cancelVerifiedPayment(p.id);
                                      toast.success('Verifikasi pembayaran berhasil dibatalkan.');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded font-bold text-[11px] transition"
                                  title="Batalkan verifikasi (jika salah ACC)"
                                >
                                  <Undo2 className="w-3 h-3 inline" /> Batalkan
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          );
        })()}

        {/* TAB 7: PENGUMUMAN */}
        {activeTab === 'PENGUMUMAN' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" /> Kelola Pengumuman Pondok
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Kirim pengumuman umum untuk semua wali santri, khusus 1 kelas, atau khusus 1 santri (misalnya peringatan belum bayar SPP).
              </p>
            </div>

            <div className="space-y-4 max-w-2xl p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Target Penerima *</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'ALL', label: 'Semua Wali Santri' },
                    { id: 'CLASS', label: 'Per Kelas' },
                    { id: 'STUDENT', label: 'Per Santri' },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAnnoTargetType(t.id)}
                      className={`py-2.5 rounded-xl text-[11px] font-bold border-2 transition ${
                        annoTargetType === t.id
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {annoTargetType === 'CLASS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Kelas</label>
                  <select
                    value={annoTargetClass}
                    onChange={(e) => setAnnoTargetClass(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {Array.from(new Set(activeStudents.map((s) => s.className))).map((cn) => (
                      <option key={cn} value={cn}>{cn}</option>
                    ))}
                  </select>
                </div>
              )}

              {annoTargetType === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Santri</label>
                  <select
                    value={annoTargetStudentId}
                    onChange={(e) => setAnnoTargetStudentId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="">-- Pilih Santri --</option>
                    {activeStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.nis} ({s.className})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                  <select
                    value={annoCategory}
                    onChange={(e) => setAnnoCategory(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="PENTING">Penting</option>
                    <option value="KEUANGAN">Keuangan</option>
                    <option value="KEGIATAN">Kegiatan</option>
                    <option value="UMUM">Umum</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={annoPinned} onChange={(e) => setAnnoPinned(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                    Sematkan (Pin) di atas
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  value={annoTitle}
                  onChange={(e) => setAnnoTitle(e.target.value)}
                  placeholder="Contoh: Jadwal Libur Semester Ganjil"
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Isi Pesan</label>
                <textarea
                  rows={3}
                  value={annoContent}
                  onChange={(e) => setAnnoContent(e.target.value)}
                  placeholder="Tulis detail pengumuman..."
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <button
                onClick={() => {
                  if (!annoTitle || !annoContent) {
                    toast.error('Judul dan isi pesan wajib diisi');
                    return;
                  }
                  if (annoTargetType === 'CLASS' && !annoTargetClass) {
                    toast.error('Pilih kelas tujuan dulu');
                    return;
                  }
                  if (annoTargetType === 'STUDENT' && !annoTargetStudentId) {
                    toast.error('Pilih santri tujuan dulu');
                    return;
                  }
                  const targetStudent = activeStudents.find((s) => s.id === annoTargetStudentId);
                  createAnnouncement({
                    title: annoTitle,
                    category: annoCategory,
                    content: annoContent,
                    isPinned: annoPinned,
                    author: userSession.adminName || 'Admin',
                    targetType: annoTargetType,
                    targetClassName: annoTargetType === 'CLASS' ? annoTargetClass : undefined,
                    targetStudentId: annoTargetType === 'STUDENT' ? annoTargetStudentId : undefined,
                    targetStudentName: annoTargetType === 'STUDENT' ? targetStudent?.name : undefined,
                  });
                  setAnnoTitle('');
                  setAnnoContent('');
                  setAnnoTargetType('ALL');
                  setAnnoTargetClass('');
                  setAnnoTargetStudentId('');
                  toast.success('Pengumuman berhasil dipublikasi!');
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-2"
              >
                <Bell className="w-4 h-4" /> Publikasikan Pengumuman
              </button>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Riwayat Pengumuman ({announcements.length})</h4>
              {announcements.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada pengumuman yang dipublikasikan.</p>
              )}
              {announcements.map((a) => (
                <div key={a.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">{a.category}</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                        {a.targetType === 'ALL' ? 'Semua' : a.targetType === 'CLASS' ? `Kelas ${a.targetClassName}` : `Santri: ${a.targetStudentName}`}
                      </span>
                      {a.isPinned && <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">📌 Pinned</span>}
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{a.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{a.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">{new Date(a.createdAt).toLocaleString('id-ID')} • {a.author}</p>
                  </div>
                  <button onClick={() => { deleteAnnouncement(a.id); toast.success('Pengumuman dihapus'); }} className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-xl shrink-0" title="Hapus">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: PENGATURAN SISTEM (MERGED) */}
        {activeTab === 'PENGATURAN' && (() => {
          const handleSaveAllSettings = () => {
            updateBankAccount({
              ...bankForm,
              pesantrenName: webForm.pesantrenName,
              heroImages: webForm.heroImages,
              defaultPaymentBreakdown: breakdownForm,
            });
            toast.success('Pengaturan Sistem berhasil disimpan secara batch!');
          };

          const setHeroImageAt = (index: number, url: string) => {
            const updated = [...webForm.heroImages];
            if (url) {
              updated[index] = url;
            } else {
              updated.splice(index, 1);
            }
            setWebForm({ ...webForm, heroImages: updated });
          };

          const addHeroSlot = () => {
            if (webForm.heroImages.length >= 5) return;
            setWebForm({ ...webForm, heroImages: [...webForm.heroImages, ''] });
          };

          return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-6 h-6 text-emerald-600" /> Pengaturan Sistem & Lembaga
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Atur identitas pondok, rekening bank, logo, dan landing page dalam satu klik simpan batch. Foto/video bisa diambil dari URL, upload perangkat, atau galeri.</p>
              </div>

              {!isFirebaseConfigured && (
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                  Mode Lokal: Firebase belum dikonfigurasi, data tersimpan di browser ini saja. Hubungi developer untuk mengaktifkan database online agar data tersimpan permanen &amp; bisa diakses banyak orang.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bagian Identitas & Rekening */}
                <div className="space-y-6">
                  {/* Identitas Lembaga & Logo */}
                  <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 border-b border-emerald-100 dark:border-emerald-900 pb-2">
                      <Building2 className="w-4 h-4" /> Identitas & Logo Lembaga
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Pondok Pesantren</label>
                      <input
                        type="text"
                        value={webForm.pesantrenName}
                        onChange={(e) => {
                          setWebForm({ ...webForm, pesantrenName: e.target.value });
                          setBankForm({ ...bankForm, pesantrenName: e.target.value });
                        }}
                        placeholder="Contoh: Pondok Pesantren Darul Mukhlasin"
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Yayasan Pengayom</label>
                      <input
                        type="text"
                        value={bankForm.foundationName || ''}
                        onChange={(e) => setBankForm({ ...bankForm, foundationName: e.target.value })}
                        placeholder="Contoh: Yayasan Pendidikan Islam Darul MUkhlasin"
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <MediaPicker
                        label="Logo Pondok"
                        value={bankForm.pesantrenLogoUrl || ''}
                        onChange={(url) => setBankForm({ ...bankForm, pesantrenLogoUrl: url })}
                        aspect="square"
                      />
                      <MediaPicker
                        label="Logo Yayasan"
                        value={bankForm.foundationLogoUrl || ''}
                        onChange={(url) => setBankForm({ ...bankForm, foundationLogoUrl: url })}
                        aspect="square"
                      />
                      <MediaPicker
                        label="Foto Profil Admin"
                        value={bankForm.adminPhotoUrl || ''}
                        onChange={(url) => setBankForm({ ...bankForm, adminPhotoUrl: url })}
                        aspect="square"
                      />
                    </div>
                  </div>

                  {/* Pengaturan Rekening */}
                  <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 border-b border-emerald-100 dark:border-emerald-900 pb-2">
                      <CreditCard className="w-4 h-4" /> Informasi Rekening Pembayaran
                    </h4>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Bank</label>
                      <input
                        type="text"
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nomor Rekening</label>
                      <input
                        type="text"
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Atas Nama (A.N)</label>
                      <input
                        type="text"
                        value={bankForm.accountHolder}
                        onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">WhatsApp Admin CS (Format: 628...)</label>
                      <input
                        type="text"
                        value={bankForm.whatsappAdmin}
                        onChange={(e) => setBankForm({ ...bankForm, whatsappAdmin: e.target.value })}
                        className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Rincian Pembayaran Default yang Disarankan */}
                <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-violet-800 dark:text-violet-400 flex items-center gap-1.5 border-b border-violet-100 dark:border-violet-900 pb-2">
                    <Wallet className="w-4 h-4" /> Rincian Pembayaran Default (Disarankan)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ini rincian nominal SPP yang disarankan ke semua wali santri (mis. SPP + Infaq Pondok + Infaq Sekolah + Laundry). Wali santri tetap bisa bayar custom sesuai kemampuan sendiri saat mengisi form.
                  </p>
                  <div className="space-y-2">
                    {breakdownForm.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const updated = [...breakdownForm];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            setBreakdownForm(updated);
                          }}
                          placeholder="Label (mis. SPP Bulanan)"
                          className="flex-1 p-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => {
                            const updated = [...breakdownForm];
                            updated[idx] = { ...updated[idx], amount: Number(e.target.value) || 0 };
                            setBreakdownForm(updated);
                          }}
                          placeholder="0"
                          className="w-28 p-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={() => setBreakdownForm(breakdownForm.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setBreakdownForm([...breakdownForm, { id: `bd_${Date.now()}`, label: '', amount: 0 }])}
                      className="px-3 py-1.5 bg-violet-100 hover:bg-violet-200 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 text-violet-800 dark:text-violet-300 font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Komponen
                    </button>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Total Disarankan</span>
                      <span className="font-black text-sm text-violet-700 dark:text-violet-400">
                        Rp {breakdownForm.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modul Rihlah — nonaktif secara default, admin harus sengaja menyalakan */}
                <div className="space-y-3 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 border-b border-emerald-100 dark:border-emerald-900 pb-2">
                    <BookOpen className="w-4 h-4" /> Modul Infaq Rihlah
                  </h4>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Aktifkan tagihan & notifikasi Rihlah</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Kalau nonaktif, wali santri TIDAK akan melihat badge/tunggakan Rihlah sama sekali. Aktifkan hanya saat memang ada program rihlah yang perlu ditagihkan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBankForm({ ...bankForm, rihlahModuleEnabled: !bankForm.rihlahModuleEnabled })}
                      className={`shrink-0 w-12 h-7 rounded-full transition-colors relative ${bankForm.rihlahModuleEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${bankForm.rihlahModuleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                {/* Status WhatsApp Auto-Kirim (Fonnte) */}
                <div className="space-y-3 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 border-b border-emerald-100 dark:border-emerald-900 pb-2">
                    <MessageSquare className="w-4 h-4" /> WhatsApp Auto-Kirim (Fonnte)
                  </h4>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Status: {fonnteConfigured === null ? 'Mengecek...' : fonnteConfigured ? 'Aktif — pengingat WA terkirim otomatis' : 'Belum Aktif — masih pakai wa.me manual'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Untuk mengaktifkan: daftar gratis di fonnte.com, scan QR dengan nomor pondok, lalu tambahkan environment variable <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">FONNTE_TOKEN</code> di Project Settings Vercel (bukan .env biasa), lalu Redeploy.
                      </p>
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold ${
                      fonnteConfigured ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                    }`}>
                      {fonnteConfigured === null ? '...' : fonnteConfigured ? 'AKTIF' : 'MANUAL'}
                    </span>
                  </div>
                </div>

                {/* Pemilih Tema Warna Brand */}
                <div className="space-y-3 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 border-b border-emerald-100 dark:border-emerald-900 pb-2">
                    <Palette className="w-4 h-4" /> Tema Warna Brand
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ganti warna aksen utama aplikasi (sidebar, tombol, badge). Berlaku untuk semua pengguna secara instan.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { id: 'emerald', label: 'Hijau Islami', swatch: '#059669' },
                      { id: 'royal-blue', label: 'Biru Elegan', swatch: '#2563eb' },
                      { id: 'maroon', label: 'Merah Marun', swatch: '#b91c1c' },
                      { id: 'ocean-teal', label: 'Teal Laut', swatch: '#0d9488' },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBankForm({ ...bankForm, themeAccent: t.id })}
                        className={`p-3 rounded-2xl border-2 transition flex flex-col items-center gap-2 ${
                          (bankForm.themeAccent || 'emerald') === t.id
                            ? 'border-slate-900 dark:border-white shadow-md'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: t.swatch }} />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bagian Landing Page & Foto Slider */}
                <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 h-fit">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 border-b border-emerald-100 dark:border-emerald-900 pb-2">
                    <Globe className="w-4 h-4" /> Landing Page Slider (Visual Pondok)
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Foto Hero Slider (Maks 5)
                      </label>
                      <button
                        onClick={addHeroSlot}
                        disabled={webForm.heroImages.length >= 5}
                        className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] rounded-lg transition disabled:opacity-40 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Slot
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {webForm.heroImages.map((img, idx) => (
                        <MediaPicker
                          key={idx}
                          label={`Slide ${idx + 1}`}
                          value={img}
                          onChange={(url) => setHeroImageAt(idx, url)}
                        />
                      ))}
                    </div>
                    {webForm.heroImages.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">Belum ada foto slide. Klik "Tambah Slot" untuk menambahkan.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTION SAVE */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 flex justify-end">
                <button
                  onClick={handleSaveAllSettings}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-xl transition flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Check className="w-5 h-5" /> Simpan Semua Pengaturan
                </button>
              </div>
            </div>
          );
        })()}
        {/* TAB 9: AUDIT LOG */}
        {activeTab === 'AUDIT_LOG' && (
          <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-50"></div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <History className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">System Audit Log</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Monitoring aktivitas dan rekam jejak sistem secara real-time</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {auditLogs.length > 0 ? auditLogs.map((log) => (
                <div key={log.id} className="p-4 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 rounded-2xl text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition group">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0"></div>
                    <div>
                      <span className="font-bold text-emerald-300 block text-[13px]">{log.action}</span>
                      <span className="text-slate-300 font-medium leading-relaxed mt-1 block">{log.details}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-[10px] text-slate-500 font-mono shrink-0 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-emerald-500/70">{log.user}</div>
                    <div className="text-slate-400">{new Date(log.timestamp).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                  <span className="text-slate-500 text-xs font-medium">Belum ada riwayat aktivitas sistem.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 10: ZONA BAHAYA */}
        {activeTab === 'DANGER_ZONE' && (
          <div className="bg-red-50 dark:bg-red-950/20 rounded-3xl p-6 border border-red-200 dark:border-red-900/50 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-extrabold">Zona Bahaya & Backup System</h3>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-200 dark:border-red-900/50 space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Backup & Restore Data</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simpan seluruh data ke dalam file JSON, atau pulihkan dari file backup sebelumnya.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const data = backupData();
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Backup_PondokPay_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Download Backup JSON
                </button>
                <button
                  onClick={() => restoreInputRef.current?.click()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Restore Data (JSON)
                </button>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={restoreInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const text = evt.target?.result;
                      if (typeof text === 'string') {
                        const res = restoreData(text);
                        if (res.success) toast.success(res.message);
                        else toast.error(res.message);
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-200 dark:border-red-900/50 space-y-4">
              <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">Hapus Semua Riwayat Pembayaran</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menghapus SELURUH data transaksi/riwayat pembayaran dan mengembalikan status SPP & Rihlah semua santri ke "Belum Lunas". Data santri tetap aman, tidak terhapus.
              </p>
              {dangerAction !== 'WIPE_PAYMENTS' ? (
                <button
                  onClick={() => setDangerAction('WIPE_PAYMENTS')}
                  className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition shadow"
                >
                  Hapus Semua Pembayaran
                </button>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">
                    Ketik "SAYA YAKIN" untuk menghapus seluruh riwayat pembayaran.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={dangerConfirmInput}
                      onChange={(e) => setDangerConfirmInput(e.target.value)}
                      placeholder="SAYA YAKIN"
                      className="flex-1 p-2 text-xs border border-red-300 dark:border-red-800 rounded-lg outline-none focus:border-red-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={() => {
                        if (dangerConfirmInput === 'SAYA YAKIN') {
                          deleteAllPayments();
                          toast.success('Seluruh riwayat pembayaran berhasil dihapus.');
                          setDangerAction(null);
                          setDangerConfirmInput('');
                        } else {
                          toast.error('Kata sandi konfirmasi salah.');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition shadow"
                    >
                      Konfirmasi
                    </button>
                    <button
                      onClick={() => {
                        setDangerAction(null);
                        setDangerConfirmInput('');
                      }}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-200 dark:border-red-900/50 space-y-4">
              <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">Mulai Bersih untuk Produksi</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menghapus SELURUH data contoh/dummy (santri, tagihan, pembayaran, pengumuman) menjadi benar-benar kosong, supaya Anda bisa mulai input data santri asli dari nol. Pengaturan lembaga (nama pondok, logo, rekening) tetap aman. Gunakan ini sekali saja sebelum sistem mulai dipakai wali santri sungguhan.
              </p>
              {dangerAction !== 'CLEAN_PRODUCTION' ? (
                <button
                  onClick={() => setDangerAction('CLEAN_PRODUCTION')}
                  className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition shadow"
                >
                  Kosongkan Semua Data Dummy
                </button>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">
                    Ketik "SAYA YAKIN" untuk mengosongkan seluruh data santri, tagihan, pembayaran & pengumuman.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={dangerConfirmInput}
                      onChange={(e) => setDangerConfirmInput(e.target.value)}
                      placeholder="SAYA YAKIN"
                      className="flex-1 p-2 text-xs border border-red-300 dark:border-red-800 rounded-lg outline-none focus:border-red-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={() => {
                        if (dangerConfirmInput === 'SAYA YAKIN') {
                          startCleanForProduction();
                          toast.success('Sistem dikosongkan. Silakan mulai input data santri asli.');
                          setDangerAction(null);
                          setDangerConfirmInput('');
                        } else {
                          toast.error('Kata sandi konfirmasi salah.');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition shadow"
                    >
                      Konfirmasi
                    </button>
                    <button
                      onClick={() => {
                        setDangerAction(null);
                        setDangerConfirmInput('');
                      }}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-200 dark:border-red-900/50 space-y-4">
              <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">Reset Sistem ke Initial State</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aksi ini akan menghapus seluruh transaksi dan mengembalikan data santri ke awal.
              </p>
              {dangerAction !== 'RESET_SYSTEM' ? (
                <button
                  onClick={() => setDangerAction('RESET_SYSTEM')}
                  className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition shadow"
                >
                  Reset Seluruh Database
                </button>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">
                    Ketik "SAYA YAKIN" untuk melanjutkan reset.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={dangerConfirmInput}
                      onChange={(e) => setDangerConfirmInput(e.target.value)}
                      placeholder="SAYA YAKIN"
                      className="flex-1 p-2 text-xs border border-red-300 dark:border-red-800 rounded-lg outline-none focus:border-red-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={() => {
                        if (dangerConfirmInput === 'SAYA YAKIN') {
                          resetSystem();
                          toast.success('Sistem berhasil direset.');
                          setDangerAction(null);
                          setDangerConfirmInput('');
                        } else {
                          toast.error('Kata sandi konfirmasi salah.');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition shadow"
                    >
                      Konfirmasi
                    </button>
                    <button
                      onClick={() => {
                        setDangerAction(null);
                        setDangerConfirmInput('');
                      }}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* MODAL: LUNASKAN PEMBAYARAN MANUAL (CASH) */}
      {settleStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Lunaskan Pembayaran Manual</h3>
              </div>
              <button onClick={() => setSettleStudent(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gunakan ini jika wali santri sudah bayar tunai/cash langsung ke pondok (bukan via transfer/upload bukti), sehingga statusnya bisa langsung ditandai LUNAS oleh Admin.
            </p>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">{settleStudent.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">NIS: <span className="font-mono font-bold">{settleStudent.nis}</span> • Kelas: {settleStudent.className}</div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!settleAmount || Number(settleAmount) <= 0) {
                  toast.error('Nominal wajib diisi');
                  return;
                }
                manualSettlePayment(settleStudent.id, settleCategory, Number(settleAmount), settleNote, settleCategory === 'SPP' ? settleMonth : undefined);
                toast.success(`Berhasil dilunaskan untuk ${settleStudent.name}!`);
                setSettleStudent(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Jenis Pembayaran *</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'SPP', label: 'SPP Bulanan', amt: 500000 },
                    { id: 'RIHLAH', label: 'Rihlah', amt: 100000 },
                    { id: 'UANG_JAJAN', label: 'Koperasi/Jajan', amt: 200000 },
                  ] as const).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSettleCategory(c.id);
                        setSettleAmount(c.amt);
                      }}
                      className={`py-2.5 rounded-xl text-[11px] font-bold border-2 transition ${
                        settleCategory === c.id
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nominal (Rp) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Nominal bisa disesuaikan (custom), tidak wajib sama dengan nominal default.</p>
              </div>
              {settleCategory === 'SPP' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Untuk Bulan *</label>
                  <select
                    value={settleMonth}
                    onChange={(e) => setSettleMonth(e.target.value)}
                    className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Wajib pilih bulan yang benar, supaya status lunas tercatat untuk bulan yang tepat (tidak otomatis melunasi bulan lain).</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Catatan (opsional)</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="Contoh: Bayar tunai di kantor tanggal 5 Agustus"
                  className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleStudent(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Tandai LUNAS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KUSTOMISASI RINCIAN PEMBAYARAN PER SANTRI */}
      {breakdownStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-violet-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Rincian Pembayaran Santri</h3>
              </div>
              <button onClick={() => setBreakdownStudent(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-violet-50 dark:bg-violet-500/10 rounded-2xl border border-violet-200 dark:border-violet-800">
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">{breakdownStudent.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">NIS: <span className="font-mono font-bold">{breakdownStudent.nis}</span></div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sesuaikan rincian nominal yang disarankan khusus untuk santri ini (misal karena orang tua kurang mampu). Wali santri tetap bisa bayar custom sendiri saat mengisi form.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {studentBreakdownForm.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const updated = [...studentBreakdownForm];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setStudentBreakdownForm(updated);
                    }}
                    className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => {
                      const updated = [...studentBreakdownForm];
                      updated[idx] = { ...updated[idx], amount: Number(e.target.value) || 0 };
                      setStudentBreakdownForm(updated);
                    }}
                    className="w-24 p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={() => setStudentBreakdownForm(studentBreakdownForm.filter((_, i) => i !== idx))}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStudentBreakdownForm([...studentBreakdownForm, { id: `bd_${Date.now()}`, label: '', amount: 0 }])}
                className="px-3 py-1.5 bg-violet-100 hover:bg-violet-200 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 text-violet-800 dark:text-violet-300 font-bold text-[11px] rounded-lg transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Total</span>
                <span className="font-black text-sm text-violet-700 dark:text-violet-400">
                  Rp {studentBreakdownForm.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  updateStudentBreakdown(breakdownStudent.id, undefined);
                  toast.success('Rincian dikembalikan ke default pondok');
                  setBreakdownStudent(null);
                }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Pakai Default Pondok
              </button>
              <button
                onClick={() => {
                  updateStudentBreakdown(breakdownStudent.id, studentBreakdownForm);
                  toast.success(`Rincian pembayaran ${breakdownStudent.name} berhasil disimpan!`);
                  setBreakdownStudent(null);
                }}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Simpan Kustom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TOPUP SALDO UANG JAJAN */}
      {topUpStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">TopUp Tabungan Uang Jajan</h3>
              </div>
              <button onClick={() => setTopUpStudent(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
              <div className="font-extrabold text-slate-900 text-sm">{topUpStudent.name}</div>
              <div className="text-xs text-slate-600">NIS: <span className="font-mono font-bold">{topUpStudent.nis}</span> • Kelas: {topUpStudent.className}</div>
              <div className="text-xs text-emerald-800 font-bold pt-1">Saldo Saat Ini: Rp {topUpStudent.uangJajanBalance.toLocaleString('id-ID')}</div>
            </div>

            <form onSubmit={handleExecuteTopUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nominal TopUp (Rp) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={topUpAmountInput}
                  onChange={(e) => setTopUpAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Masukkan nominal, misal: 50000"
                  className="w-full p-3 text-sm font-extrabold text-emerald-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quick Nominal Presets */}
              <div className="grid grid-cols-4 gap-2">
                {[20000, 50000, 100000, 200000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmountInput(amt)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                      topUpAmountInput === amt
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    +{(amt / 1000)}rb
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={topUpNoteInput}
                  onChange={(e) => setTopUpNoteInput(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTopUpStudent(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Proses TopUp Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / TAMBAH SANTRI */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {editingStudent ? 'Edit Data Santri & Wali' : 'Tambah Santri Baru'}
              </h3>
              <button onClick={() => setShowStudentModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3">
              {/* Foto Santri Upload / Custom URL */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Foto Resmi Santri (HD, Tidak Blur)
                </label>
                <div className="flex items-center gap-3">
                  <StudentAvatar
                    photoUrl={studentForm.photoUrl}
                    name={studentForm.name || 'Santri'}
                    nis={studentForm.nis || '2026'}
                    size="lg"
                  />
                  <div className="flex-1 space-y-1.5">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow">
                      <Upload className="w-3.5 h-3.5" /> Upload Foto
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const { url } = await uploadFile(file, 'foto-santri');
                            setStudentForm({ ...studentForm, photoUrl: url });
                          } catch (err) {
                            toast.error('Gagal mengunggah foto santri');
                          }
                        }}
                      />
                    </label>
                    {studentForm.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setStudentForm({ ...studentForm, photoUrl: '' })}
                        className="block text-[11px] font-bold text-red-500 hover:underline"
                      >
                        Hapus Foto (Gunakan Avatar Vektor)
                      </button>
                    )}
                    <input
                      type="text"
                      placeholder="Atau tempel Link URL Foto (https://...)"
                      value={studentForm.photoUrl}
                      onChange={(e) => setStudentForm({ ...studentForm, photoUrl: e.target.value })}
                      className="w-full p-2 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Santri *</label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="Masukkan nama lengkap santri"
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">NIS *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.nis}
                    onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                    placeholder="Contoh: 2026001"
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Masuk</label>
                  <input
                    type="text"
                    value={studentForm.entryDate}
                    onChange={(e) => setStudentForm({ ...studentForm, entryDate: e.target.value })}
                    placeholder="Contoh: 27 Juli 2026"
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kelas *</label>
                  <select
                    value={studentForm.className}
                    onChange={(e) => {
                      const selClass = INITIAL_CLASSES.find(c => c.name === e.target.value);
                      setStudentForm({ ...studentForm, className: e.target.value, classId: selClass ? selClass.id : 'c1' });
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    {INITIAL_CLASSES.map((c) => (
                      <option key={c.id} value={c.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Asrama *</label>
                  <select
                    value={studentForm.dormitoryName}
                    onChange={(e) => {
                      const selDorm = INITIAL_DORMITORIES.find(d => d.name === e.target.value);
                      setStudentForm({ ...studentForm, dormitoryName: e.target.value, dormitoryId: selDorm ? selDorm.id : 'd1' });
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    {INITIAL_DORMITORIES.map((d) => (
                      <option key={d.id} value={d.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Orang Tua / Wali Santri */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Data Orang Tua / Wali Santri
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Orang Tua / Wali *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.parentName}
                      onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                      placeholder="Nama Wali Santri"
                      className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">No. HP / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.parentWhatsapp}
                      onChange={(e) => setStudentForm({ ...studentForm, parentWhatsapp: e.target.value })}
                      placeholder="08123456789"
                      className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={studentForm.parentAddress || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, parentAddress: e.target.value })}
                    placeholder="Jl. Merdeka No. 45, Surabaya"
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECTION REASON */}
      {rejectingPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Alasan Penolakan Pembayaran</h3>
            <textarea
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="Contoh: Bukti transfer buram / nominal tidak sesuai"
              className="w-full p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectingPayment(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl">
                Batal
              </button>
              <button
                onClick={() => {
                  verifyPayment(rejectingPayment.id, false, rejectionReasonInput || 'Bukti transfer tidak valid');
                  toast.error(`Pembayaran ${rejectingPayment.studentName} (${rejectingPayment.invoiceNumber}) ditolak.`);
                  setRejectingPayment(null);
                }}
                className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROOF PREVIEW */}
      {previewProofUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 max-w-lg w-full space-y-4 relative border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setPreviewProofUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Pratinjau Bukti Transfer</h4>
            <img src={previewProofUrl} alt="Bukti Transfer" className="max-h-96 w-full object-contain rounded-2xl border dark:border-slate-800" />
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP PAYMENT REMINDER */}
      {reminderModalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Send Payment Reminder (WhatsApp)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Kirim pengingat tagihan ke WhatsApp Wali Santri</p>
                </div>
              </div>
              <button
                onClick={() => setReminderModalStudent(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs space-y-1">
              <div className="font-extrabold text-slate-900 dark:text-amber-200">{reminderModalStudent.name} (NIS: {reminderModalStudent.nis})</div>
              <div className="text-slate-600 dark:text-slate-300">
                Wali: <strong>{reminderModalStudent.parentName}</strong> • WA: <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{reminderModalStudent.parentWhatsapp}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Kelas: {reminderModalStudent.className} • Asrama: {reminderModalStudent.dormitoryName}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal Tagihan (Rp)</label>
                <input
                  type="number"
                  value={reminderCustomAmount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setReminderCustomAmount(val);
                    if (val !== '') {
                      setReminderCustomText(buildPaymentReminderTemplate(reminderModalStudent, bankAccount, Number(val)));
                    }
                  }}
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-emerald-800 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pratinjau Pesan WhatsApp Pre-filled</label>
                <textarea
                  rows={8}
                  value={reminderCustomText}
                  onChange={(e) => setReminderCustomText(e.target.value)}
                  className="w-full p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl font-sans focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(reminderCustomText);
                  toast.success('Pesan template pengingat berhasil disalin ke clipboard!');
                }}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
              >
                Salin Teks Pesan
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReminderModalStudent(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const st = reminderModalStudent;
                    setReminderModalStudent(null);
                    const result = await sendPaymentReminderWA(st, bankAccount, Number(reminderCustomAmount) || 0, reminderCustomText);
                    if (result.mode === 'AUTO_SENT') {
                      toast.success(`Pesan terkirim otomatis ke ${st.parentName}.`);
                    } else {
                      toast(`WhatsApp dibuka manual untuk ${st.parentName} — tinggal tekan Kirim.`, { icon: '📲' });
                    }
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Kirim Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student SPP Matrix Modal for Admin */}
      {viewingStudentMatrix && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" /> Detail Matriks SPP Santri
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Histori & status pembayaran per bulan untuk <strong>{viewingStudentMatrix.name}</strong> (NIS: {viewingStudentMatrix.nis})
                </p>
              </div>
              <button
                onClick={() => setViewingStudentMatrix(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <SppMonthlyMatrix
              student={viewingStudentMatrix}
              onPayForMonth={(month) => {
                setViewingStudentMatrix(null);
                onOpenPayment?.(undefined, month);
              }}
              onViewStruk={onViewStruk}
            />

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setViewingStudentMatrix(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
