import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, UserCheck, Shield, KeyRound, Search, ArrowRight, ChevronRight, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentAvatar } from '../common/StudentAvatar';
import { toast } from 'react-hot-toast';

interface LoginModalProps {
  initialTab?: 'WALI' | 'ADMIN';
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  initialTab = 'WALI',
  onClose,
  onSuccess,
}) => {
  const { loginAsWali, loginAsAdmin, students, bankAccount } = useApp();
  const logoUrl = bankAccount.pesantrenLogoUrl || bankAccount.foundationLogoUrl;
  const [activeTab, setActiveTab] = useState<'WALI' | 'ADMIN'>(initialTab);

  // Wali Login Input — Step 1: cari & pilih nama. Step 2: wajib masukkan NIS
  // anak sendiri untuk konfirmasi (mencegah wali/orang lain login sebagai
  // santri lain hanya dengan mengetuk nama dari daftar).
  const [waliQuery, setWaliQuery] = useState('');
  const [waliError, setWaliError] = useState('');
  const [loggingInNis, setLoggingInNis] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [nisConfirm, setNisConfirm] = useState('');
  const nisInputRef = React.useRef<HTMLInputElement>(null);

  // Admin Login Input
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');

  const activeStudents = useMemo(() => students.filter((s) => !s.isDeleted), [students]);

  const filteredStudents = useMemo(() => {
    const q = waliQuery.trim().toLowerCase();
    if (!q) return activeStudents;
    // Hanya cocokkan berdasarkan NAMA. Pencarian lewat NIS sengaja tidak
    // ditampilkan sebagai daftar agar NIS santri lain tidak bisa "ditemukan"
    // lewat kolom pencarian ini — NIS hanya boleh diketik di langkah konfirmasi.
    return activeStudents.filter((s) => s.name.toLowerCase().includes(q));
  }, [activeStudents, waliQuery]);

  const selectedStudent = useMemo(
    () => activeStudents.find((s) => s.id === selectedStudentId) || null,
    [activeStudents, selectedStudentId]
  );

  const pickStudent = (id: string) => {
    setWaliError('');
    setNisConfirm('');
    setSelectedStudentId(id);
    // Fokuskan input NIS begitu langkah konfirmasi muncul.
    setTimeout(() => nisInputRef.current?.focus(), 150);
  };

  const backToSearch = () => {
    setSelectedStudentId(null);
    setNisConfirm('');
    setWaliError('');
  };

  const doWaliLogin = (nis: string) => {
    setWaliError('');
    setLoggingInNis(nis);
    const res = loginAsWali(nis);
    // Small delay so the tap/selection animation is visible before we switch views.
    setTimeout(() => {
      if (res.success) {
        toast.success(res.message, { icon: '🕌', duration: 4000 });
        onSuccess();
        onClose();
      } else {
        setLoggingInNis(null);
        setWaliError(res.message);
      }
    }, 220);
  };

  const handleNisConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    const typed = nisConfirm.trim().toLowerCase();
    if (!typed) {
      setWaliError('Masukkan NIS santri untuk konfirmasi');
      return;
    }
    // Verifikasi tambahan di sisi klien: NIS yang diketik harus persis cocok
    // dengan santri yang dipilih, supaya tidak asal tebak/coba-coba NIS lain.
    if (typed !== selectedStudent.nis.toLowerCase()) {
      setWaliError('NIS tidak sesuai dengan santri yang dipilih. Periksa kembali.');
      return;
    }
    doWaliLogin(selectedStudent.nis);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (!adminPin.trim()) {
      setAdminError('Masukkan PIN / Password Admin');
      return;
    }

    const res = loginAsAdmin(adminPin);
    if (res.success) {
      toast.success(res.message, { icon: '🕌', duration: 4000 });
      onSuccess();
      onClose();
    } else {
      setAdminError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white dark:bg-slate-950 rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200/50 dark:border-slate-800 relative"
      >
        {/* Close Button Absolute */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="pt-10 pb-6 px-8 text-center bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-950">
           {logoUrl ? (
             <img
               src={logoUrl}
               alt="Logo Pesantren"
               className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-lg shadow-emerald-500/25 mb-4 ring-2 ring-emerald-500/40"
             />
           ) : (
             <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4 transform -rotate-3 hover:rotate-0 transition">
               <Shield className="w-8 h-8 text-white" />
             </div>
           )}
           <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
             {bankAccount.pesantrenName || 'PondokPay'} <span className="block sm:inline text-emerald-600 dark:text-emerald-400 text-base sm:text-xl">Pro</span>
           </h2>
           <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Sistem Informasi Keuangan Santri</p>
        </div>

        {/* Header Tabs */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-6 gap-4">
          <button
            type="button"
            onClick={() => { setActiveTab('WALI'); setWaliError(''); setSelectedStudentId(null); setNisConfirm(''); }}
            className={`flex-1 py-4 text-xs font-bold transition flex items-center justify-center gap-2 relative ${
              activeTab === 'WALI'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Wali Santri
            {activeTab === 'WALI' && (
              <motion.div layoutId="loginTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('ADMIN'); setAdminError(''); setSelectedStudentId(null); setNisConfirm(''); }}
            className={`flex-1 py-4 text-xs font-bold transition flex items-center justify-center gap-2 relative ${
              activeTab === 'ADMIN'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            Administrator
            {activeTab === 'ADMIN' && (
              <motion.div layoutId="loginTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'WALI' ? (
            <AnimatePresence mode="wait" initial={false}>
              {!selectedStudent ? (
                /* ---------- STEP 1: cari & pilih nama (tanpa NIS/kelas terlihat) ---------- */
                <motion.div
                  key="step-search"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      <Users className="w-3.5 h-3.5 text-emerald-500" /> Cari Nama Anak Anda
                    </label>
                    <div className="relative group">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition" />
                      <input
                        type="text"
                        placeholder="Ketik nama santri..."
                        value={waliQuery}
                        onChange={(e) => setWaliQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:outline-none font-bold text-slate-900 dark:text-white transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                      Cari nama anak Anda, lalu ketuk namanya — Anda akan diminta memasukkan NIS untuk konfirmasi sebelum masuk.
                    </p>
                  </div>

                  {/* Nama-only picker — NIS & kelas sengaja disembunyikan di sini */}
                  <div className="max-h-56 overflow-y-auto pr-1 -mr-1 space-y-1.5 scroll-smooth">
                    <AnimatePresence initial={false} mode="popLayout">
                      {filteredStudents.length === 0 ? (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center py-6 text-xs font-bold text-slate-400"
                        >
                          Santri tidak ditemukan.
                        </motion.div>
                      ) : (
                        filteredStudents.map((st, idx) => (
                          <motion.button
                            key={st.id}
                            type="button"
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18, delay: Math.min(idx, 8) * 0.02 }}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => pickStudent(st.id)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl border transition text-left bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-800"
                          >
                            <StudentAvatar
                              photoUrl={st.photoUrl}
                              name={st.name}
                              nis={st.nis}
                              size="sm"
                              className="pointer-events-none shrink-0"
                            />
                            <div className="text-left min-w-0 flex-1">
                              <div className="text-[12px] font-extrabold truncate">{st.name}</div>
                              <div className="text-[10px] font-medium text-slate-400">Ketuk untuk konfirmasi NIS</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                          </motion.button>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                /* ---------- STEP 2: konfirmasi NIS sebelum benar-benar login ---------- */
                <motion.form
                  key="step-confirm"
                  onSubmit={handleNisConfirmSubmit}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={backToSearch}
                    className="text-[11px] font-bold text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 -mb-1"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Ganti nama
                  </button>

                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                    <StudentAvatar
                      photoUrl={selectedStudent.photoUrl}
                      name={selectedStudent.name}
                      nis={selectedStudent.nis}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{selectedStudent.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Masukkan NIS santri ini untuk masuk</div>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-500" /> NIS Santri
                    </label>
                    <input
                      ref={nisInputRef}
                      type="text"
                      placeholder="Masukkan NIS anak Anda"
                      value={nisConfirm}
                      onChange={(e) => setNisConfirm(e.target.value)}
                      disabled={loggingInNis !== null}
                      className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:outline-none font-bold text-slate-900 dark:text-white transition"
                    />
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                      Langkah ini menjaga privasi data — hanya wali yang mengetahui NIS santri yang bisa masuk ke akunnya.
                    </p>
                  </div>

                  {waliError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/40 flex items-center gap-2"
                    >
                      <X className="w-4 h-4 shrink-0" /> {waliError}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loggingInNis !== null}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    {loggingInNis !== null ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full shrink-0"
                      />
                    ) : (
                      <>Masuk ke Akun <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Kredensial Admin
                </label>
                <div className="relative group">
                  <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700 dark:group-focus-within:text-white transition" />
                  <input
                    type="password"
                    required
                    placeholder="Masukkan PIN atau Password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white focus:outline-none font-bold text-slate-900 dark:text-white transition"
                  />
                </div>
              </div>

              {adminError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/40 flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" /> {adminError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                Akses Panel Admin <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
