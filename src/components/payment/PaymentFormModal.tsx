import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useApp } from '../../context/AppContext';
import { Payment, Student, Bill } from '../../types';
import { INITIAL_CLASSES, INITIAL_DORMITORIES } from '../../data/mockData';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Building2,
  CreditCard,
  MessageCircle,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { soundManager } from '../../utils/soundEffects';
import { uploadFile } from '../../lib/upload';
import { MONTHS_LIST } from '../common/SppMonthlyMatrix';

interface PaymentFormModalProps {
  prefilledStudent?: Student | null;
  prefilledBill?: Bill | null;
  prefilledMonth?: string;
  prefilledPaymentTypeId?: string;
  prefilledAmount?: number;
  onClose: () => void;
  onSuccess: (payment: Payment) => void;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  prefilledStudent,
  prefilledBill,
  prefilledMonth,
  prefilledPaymentTypeId,
  prefilledAmount,
  onClose,
  onSuccess,
}) => {
  const { students, createPayment, bankAccount, paymentTypes } = useApp();

  // Search NIS/Student state if not prefilled
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    prefilledStudent?.id || prefilledBill?.studentId || ''
  );
  const [nisSearch, setNisSearch] = useState<string>(
    prefilledStudent?.nis || prefilledBill?.studentNis || ''
  );

  // Form Fields
  const [parentName, setParentName] = useState<string>(prefilledStudent?.parentName || '');
  const [studentName, setStudentName] = useState<string>(prefilledStudent?.name || prefilledBill?.studentName || '');
  const [nis, setNis] = useState<string>(prefilledStudent?.nis || prefilledBill?.studentNis || '');
  const [whatsapp, setWhatsapp] = useState<string>(prefilledStudent?.parentWhatsapp || '');
  const [address, setAddress] = useState<string>(prefilledStudent?.parentAddress || '');
  const [className, setClassName] = useState<string>(
    prefilledStudent?.className || prefilledBill?.className || INITIAL_CLASSES[0].name
  );
  const [dormitoryName, setDormitoryName] = useState<string>(
    prefilledStudent?.dormitoryName || prefilledBill?.dormitoryName || INITIAL_DORMITORIES[0].name
  );

  const [paymentTypeId, setPaymentTypeId] = useState<string>(
    prefilledBill?.paymentTypeId || prefilledPaymentTypeId || paymentTypes[0].id
  );
  const [monthYear, setMonthYear] = useState<string>(prefilledMonth || prefilledBill?.monthYear || 'Agustus 2026');
  const [amount, setAmount] = useState<number>(
    prefilledBill?.amount ||
      prefilledAmount ||
      (prefilledPaymentTypeId && paymentTypes.find((pt) => pt.id === prefilledPaymentTypeId)?.defaultAmount) ||
      paymentTypes[0].defaultAmount
  );
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Bayar di muka beberapa bulan sekaligus (khusus SPP) — misalnya wali
  // santri yang mampu ingin langsung melunasi 3-4 bulan ke depan dalam satu
  // kali transfer & satu bukti transfer, bukan submit form berkali-kali.
  const [monthsAheadCount, setMonthsAheadCount] = useState<number>(1);
  const monthStartIndex = MONTHS_LIST.findIndex((m) => m.name === monthYear);
  const advanceMonthNames = monthStartIndex >= 0
    ? MONTHS_LIST.slice(monthStartIndex, monthStartIndex + monthsAheadCount).map((m) => m.name)
    : [monthYear];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');

  // Handle student select / lookup
  useEffect(() => {
    if (selectedStudentId) {
      const st = students.find((s) => s.id === selectedStudentId);
      if (st) {
        setStudentName(st.name);
        setNis(st.nis);
        setParentName(st.parentName);
        setWhatsapp(st.parentWhatsapp);
        setAddress(st.parentAddress);
        setClassName(st.className);
        setDormitoryName(st.dormitoryName);
      }
    }
  }, [selectedStudentId, students]);

  const handleNisLookup = (query: string) => {
    setNisSearch(query);
    const found = students.find(
      (s) => !s.isDeleted && (s.nis === query.trim() || s.name.toLowerCase().includes(query.toLowerCase()))
    );
    if (found) {
      setSelectedStudentId(found.id);
    }
  };

  // Change payment type default amount
  const handlePaymentTypeChange = (typeId: string) => {
    setPaymentTypeId(typeId);
    const selected = paymentTypes.find((pt) => pt.id === typeId);
    if (selected) {
      setAmount(selected.defaultAmount);
    }
  };

  const [isUploadingProof, setIsUploadingProof] = useState(false);

  // Image Upload Handler — uploads to Firebase Storage when configured,
  // otherwise falls back to a local base64 preview so it still works.
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }
    setIsUploadingProof(true);
    try {
      const { url } = await uploadFile(file, 'bukti-transfer');
      setProofUrl(url);
    } catch (err) {
      toast.error('Gagal mengunggah bukti transfer, silakan coba lagi.');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !nis || !parentName || !amount) {
      toast.error('Mohon lengkapi seluruh field wajib');
      return;
    }

    if (paymentMethod === 'TRANSFER' && !proofUrl) {
      toast.error('Harap unggah bukti transfer untuk metode pembayaran Transfer');
      return;
    }

    setIsSubmitting(true);

    const selectedPType = paymentTypes.find((pt) => pt.id === paymentTypeId) || paymentTypes[0];
    const isMultiMonth = selectedPType.category === 'SPP' && monthsAheadCount > 1;
    const monthsToCharge = isMultiMonth ? advanceMonthNames : [monthYear];

    let lastResult: { payment: Payment; whatsappUrl: string } | null = null;
    monthsToCharge.forEach((m) => {
      lastResult = createPayment({
        studentId: selectedStudentId || `s_temp_${Date.now()}`,
        studentNis: nis,
        studentName,
        parentName,
        parentWhatsapp: whatsapp,
        parentAddress: address,
        className,
        dormitoryName,
        paymentTypeId,
        paymentTypeName: selectedPType.name,
        category: selectedPType.category,
        monthYear: selectedPType.category === 'SPP' ? m : undefined,
        amount: Number(amount),
        paymentMethod,
        proofUrl,
        billId: monthsToCharge.length === 1 ? prefilledBill?.id : undefined,
        note: isMultiMonth ? `${note ? note + ' — ' : ''}Bayar di muka ${monthsToCharge.length} bulan sekaligus (${monthsToCharge.join(', ')})`.trim() : note,
      });
    });

    // Trigger celebration confetti & sound effect
    soundManager.playPaymentNotification();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    if (lastResult) {
      setCreatedPayment((lastResult as { payment: Payment; whatsappUrl: string }).payment);
      setWhatsappUrl((lastResult as { payment: Payment; whatsappUrl: string }).whatsappUrl);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <CreditCard className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-wide">Formulir Pembayaran PondokPay</h3>
              <p className="text-xs text-emerald-200">Konfirmasi SPP, Uang Jajan, Rihlah & Infaq Santri</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body or Success Screen */}
        {!createdPayment ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            
            {/* Quick Student Finder */}
            {!prefilledStudent && (
              <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4">
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1.5">
                  Cari Data Santri (NIS / Nama)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Masukkan NIS (contoh: 2024001) atau nama..."
                    value={nisSearch}
                    onChange={(e) => handleNisLookup(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                  />
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">-- Pilih dari Daftar --</option>
                    {students.filter(s => !s.isDeleted).map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                        {s.nis} - {s.name} ({s.className})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Section 1: Data Wali & Santri */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Data Orang Tua & Santri
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Orang Tua / Wali *</label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="H. Bambang Sugianto"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Santri *</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ahmad Fauzi"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIS (Nomor Induk Santri) *</label>
                  <input
                    type="text"
                    required
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="2024001"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">No. WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kelas *</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    {INITIAL_CLASSES.map((c) => (
                      <option key={c.id} value={c.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Asrama *</label>
                  <select
                    value={dormitoryName}
                    onChange={(e) => setDormitoryName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    {INITIAL_DORMITORIES.map((d) => (
                      <option key={d.id} value={d.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat Orang Tua</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Merdeka No. 45, Surabaya"
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* Section 2: Rincian Pembayaran */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Rincian Tagihan & Pembayaran
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Pembayaran *</label>
                  <select
                    value={paymentTypeId}
                    onChange={(e) => handlePaymentTypeChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                  >
                    {paymentTypes.map((pt) => (
                      <option key={pt.id} value={pt.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                        {pt.name} (Rp {pt.defaultAmount.toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                {paymentTypes.find((pt) => pt.id === paymentTypeId)?.category === 'SPP' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bulan Pembayaran SPP *</label>
                    <select
                      value={monthYear}
                      onChange={(e) => setMonthYear(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                    >
                      <option value="Juli 2026" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Juli 2026 (Bulan ke-1)</option>
                      <option value="Agustus 2026" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Agustus 2026 (Bulan ke-2 - Bulan Ini)</option>
                      <option value="September 2026" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">September 2026 (Bulan ke-3)</option>
                      <option value="Oktober 2026" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Oktober 2026 (Bulan ke-4)</option>
                      <option value="November 2026" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">November 2026 (Bulan ke-5)</option>
                      <option value="Desember 2026" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Desember 2026 (Bulan ke-6)</option>
                      <option value="Januari 2027" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Januari 2027 (Bulan ke-7)</option>
                      <option value="Februari 2027" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Februari 2027 (Bulan ke-8)</option>
                      <option value="Maret 2027" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Maret 2027 (Bulan ke-9)</option>
                      <option value="April 2027" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">April 2027 (Bulan ke-10)</option>
                      <option value="Mei 2027" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Mei 2027 (Bulan ke-11)</option>
                      <option value="Juni 2027" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Juni 2027 (Bulan ke-12)</option>
                    </select>
                  </div>
                )}

                {paymentTypes.find((pt) => pt.id === paymentTypeId)?.category === 'SPP' && (
                  <div className="md:col-span-2 p-3.5 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 rounded-xl">
                    <label className="block text-xs font-bold text-violet-900 dark:text-violet-300 mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Bayar di Muka Beberapa Bulan Sekaligus (Opsional)
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={monthsAheadCount}
                        onChange={(e) => setMonthsAheadCount(Number(e.target.value))}
                        className="px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-violet-300 dark:border-violet-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-bold"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>{n} Bulan{n > 1 ? ` (sampai ${advanceMonthNames.length === n || monthStartIndex < 0 ? '' : MONTHS_LIST[Math.min(monthStartIndex + n - 1, MONTHS_LIST.length - 1)].name})` : ''}</option>
                        ))}
                      </select>
                      <span className="text-[11px] text-violet-800 dark:text-violet-300 font-semibold">
                        {monthsAheadCount > 1
                          ? `Total ${monthsAheadCount} bulan × Rp ${Number(amount).toLocaleString('id-ID')} = Rp ${(Number(amount) * monthsAheadCount).toLocaleString('id-ID')}`
                          : 'Default 1 bulan (seperti biasa)'}
                      </span>
                    </div>
                    {monthsAheadCount > 1 && (
                      <p className="text-[10px] text-violet-700 dark:text-violet-400 mt-1.5">
                        Akan tercatat lunas untuk: <strong>{advanceMonthNames.join(', ')}</strong>. Cukup unggah satu bukti transfer untuk totalnya.
                      </p>
                    )}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nominal Pembayaran (Rp) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-500 dark:text-slate-400 text-xs">Rp</span>
                    <input
                      type="number"
                      required
                      min={10000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 text-base font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  {/* Preset Nominal Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[150000, 250000, 350000, 450000, 500000, 650000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(preset)}
                        className={`relative px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          amount === preset
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        Rp {preset.toLocaleString('id-ID')}
                        {preset === 500000 && (
                          <span className={`ml-1 text-[9px] font-black ${amount === preset ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            (Standar SPP)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                    Standar SPP Bulanan Rp 500.000/santri — nominal dapat disesuaikan (custom) sesuai kebijakan pondok.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* Section 3: Metode & Upload Bukti */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Metode & Bukti Pembayaran
              </h4>

              {/* Bank BSI Banner info */}
              <div className="bg-slate-900 text-white rounded-xl p-3.5 mb-4 flex items-center justify-between border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider block">{bankAccount.bankName}</span>
                    <span className="font-mono text-base font-bold text-white">{bankAccount.accountNumber}</span>
                    <span className="text-xs text-slate-300 block">a.n {bankAccount.accountHolder}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bankAccount.accountNumber);
                    toast.success('Nomor Rekening Tersalin: ' + bankAccount.accountNumber);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                >
                  Salin Rekening
                </button>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <label
                  className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                    paymentMethod === 'TRANSFER'
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    value="TRANSFER"
                    checked={paymentMethod === 'TRANSFER'}
                    onChange={() => setPaymentMethod('TRANSFER')}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Transfer Bank</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Upload bukti transfer</span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                    paymentMethod === 'CASH'
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    value="CASH"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Cash / Tunai</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Bayar langsung di kantor</span>
                  </div>
                </label>
              </div>

              {/* Upload Proof */}
              {paymentMethod === 'TRANSFER' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Upload Bukti Transfer (JPG, PNG, WEBP) *
                  </label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4 text-center cursor-pointer transition relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {isUploadingProof ? (
                      <div className="space-y-1.5 py-4">
                        <div className="w-6 h-6 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Mengunggah bukti transfer...</p>
                      </div>
                    ) : proofUrl ? (
                      <div className="space-y-2">
                        <img
                          src={proofUrl}
                          alt="Preview Bukti"
                          className="h-32 mx-auto object-contain rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                        />
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">✓ Gambar Bukti Berhasil Dimuat (Klik untuk ganti)</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-2">
                        <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Klik atau tarik file gambar ke sini</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Maksimal 5MB (Format JPG, PNG, WEBP)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Titip uang jajan untuk minggu ini"
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingProof}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? 'Memproses...' : 'Kirim Pembayaran & Buka WhatsApp Admin'}
              </button>
            </div>
          </form>
        ) : (
          /* SUCCESS SCREEN AFTER SUBMISSION */
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Pembayaran Berhasil Dikirim!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Nomor Invoice: <span className="font-mono font-bold text-slate-800">{createdPayment.invoiceNumber}</span>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Langkah Selanjutnya (Sangat Penting):</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Silakan klik tombol di bawah ini untuk mengirimkan pesan konfirmasi beserta bukti transfer secara langsung ke <strong>WhatsApp Admin Pondok ({bankAccount.whatsappAdmin})</strong>.
              </p>
            </div>

            {/* Direct WhatsApp Trigger Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold rounded-xl shadow-xl hover:shadow-emerald-600/30 transition transform active:scale-95"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              Kirim Konfirmasi ke WA Admin ({bankAccount.whatsappAdmin})
            </a>

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => onSuccess(createdPayment)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
              >
                <FileText className="w-4 h-4" />
                Lihat Struk & Kwitansi PDF
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
