import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CreditCard,
  Search,
  MessageCircle,
  Banknote,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  Award,
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: (tab?: 'WALI' | 'ADMIN') => void;
  onOpenBank: () => void;
  onOpenPayment: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenBank,
  onOpenPayment,
}) => {
  const { bankAccount, announcements, loginAsWali } = useApp();
  const [nisSearch, setNisSearch] = useState('');
  const [copiedBank, setCopiedBank] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (bankAccount.heroImages && bankAccount.heroImages.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % bankAccount.heroImages!.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [bankAccount.heroImages]);

  const handleCopyBank = () => {
    navigator.clipboard.writeText(bankAccount.accountNumber);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const handleQuickLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisSearch.trim()) return;
    const res = loginAsWali(nisSearch);
    if (!res.success) {
      toast.error(res.message);
    } else {
      toast.success(res.message, { icon: '🕌', duration: 4000 });
    }
  };

  const faqs = [
    {
      q: 'Bagaimana cara melakukan pembayaran SPP via PondokPay?',
      a: `Buka menu Pembayaran di website, pilih/masukkan data santri, tentukan jenis pembayaran & nominal, lalu transfer ke rekening ${bankAccount.bankName} ${bankAccount.accountNumber} a.n ${bankAccount.accountHolder}. Unggah bukti transfer lalu klik konfirmasi ke WhatsApp Admin.`,
    },
    {
      q: 'Apakah pembayaran cash/tunai bisa diinput melalui website?',
      a: 'Bisa. Pada formulir pembayaran, pilih metode Pembayaran Cash. Petugas bendahara pondok akan memverifikasi dan menerbitkan struk/kwitansi digital resmi.',
    },
    {
      q: 'Di mana saya bisa mengunduh kwitansi & struk bukti pembayaran?',
      a: 'Kwitansi digital otomatis tersedia setelah pembayaran diverifikasi oleh Admin. Anda dapat mengunduh format PDF atau mencetak langsung di Portal Wali Santri.',
    },
    {
      q: 'Berapa nomor WhatsApp resmi Admin PondokPay?',
      a: `Nomor WhatsApp resmi konfirmasi keuangan dan admin PondokPay adalah ${bankAccount.whatsappAdmin}.`,
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white pt-12 pb-20 rounded-3xl border border-emerald-500/20 shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Hero Image Slider */}
        {bankAccount.heroImages && bankAccount.heroImages.length > 0 && (
          <div className="absolute inset-0 z-0 opacity-40">
            {bankAccount.heroImages.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="Pondok"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                  idx === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/40"></div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-6 text-center space-y-8 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Sistem Pembayaran Resmi {bankAccount.pesantrenName || 'Pondok Pesantren'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Kemudahan Pembayaran Santri Dalam Satu Genggaman
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Kelola SPP bulanan, tabungan uang jajan, infaq rihlah, dan tagihan santri secara transparan, otomatis, dan terverifikasi dengan struk digital resmi.
          </p>

          {/* Quick NIS Checker Box */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 sm:p-3 rounded-2xl max-w-xl mx-auto shadow-2xl">
            <form onSubmit={handleQuickLookup} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Masukkan NIS Santri (Contoh: SNT-264306)..."
                  value={nisSearch}
                  onChange={(e) => setNisSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white text-slate-900 text-xs rounded-xl font-medium focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-95 shrink-0"
              >
                Cek Tagihan Santri
              </button>
            </form>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={onOpenPayment}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              Bayar SPP & Infaq Sekarang
            </button>
            <button
              onClick={onOpenBank}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-800/90 hover:bg-slate-700 text-white font-extrabold text-xs rounded-2xl border border-slate-700 transition"
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              Info Rekening Resmi
            </button>
          </div>

        </div>
      </section>

      {/* Rekening Pondok Banner Card */}
      <motion.section
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="max-w-5xl mx-auto px-4">
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Rekening Resmi Pondok
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">{bankAccount.bankName}</h3>
            <div className="font-mono text-3xl sm:text-4xl font-extrabold text-emerald-300 tracking-wider">
              {bankAccount.accountNumber}
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Atas Nama: <strong className="text-white font-extrabold">{bankAccount.accountHolder}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleCopyBank}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-extrabold text-xs transition shadow-lg w-full sm:w-auto ${
                copiedBank
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {copiedBank ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedBank ? 'Rekening Tersalin!' : 'Salin Rekening'}
            </button>
            <a
              href={`https://wa.me/${bankAccount.whatsappAdmin.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Assalamu\'alaikum Admin PondokPay, saya ingin bertanya terkait pembayaran.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-2xl border border-slate-700 transition w-full sm:w-auto"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              WA Admin ({bankAccount.whatsappAdmin})
            </a>
          </div>

        </div>
      </motion.section>

      {/* Keunggulan PondokPay Grid */}
      <motion.section
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Keunggulan Utama</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Mengapa Menggunakan PondokPay?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3 hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Transparan & Terpusat</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Seluruh riwayat pembayaran SPP, uang jajan, dan infaq tercatat secara terpusat dengan akses real-time untuk Wali Santri dan Admin.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3 hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Notifikasi WhatsApp Otomatis</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Integrasi konfirmasi via WhatsApp langsung ke Admin Pondok ({bankAccount.whatsappAdmin}) tanpa perlu simpan nomor manual.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3 hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Struk & Kwitansi PDF Sah</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Menerbitkan kwitansi elektronik berkode QR resmi yang dapat diunduh dalam format PDF atau dicetak kapan saja.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Cara Pembayaran Section */}
      <motion.section
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="bg-slate-100 dark:bg-slate-900/60 py-12 rounded-3xl border border-slate-200 dark:border-slate-800 px-6 max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Panduan</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Cara Melakukan Pembayaran</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '01', title: 'Isi Form Pembayaran', desc: 'Masukkan data santri, jenis tagihan, dan nominal pembayaran.' },
            { step: '02', title: 'Transfer Bank', desc: `Transfer ke ${bankAccount.bankName} ${bankAccount.accountNumber} a.n ${bankAccount.accountHolder}.` },
            { step: '03', title: 'Upload Bukti & WA', desc: 'Unggah foto bukti transfer & kirim pesan otomatis ke WA Admin.' },
            { step: '04', title: 'Unduh Struk PDF', desc: 'Setelah diverifikasi admin, kwitansi PDF dapat diunduh.' },
          ].map((item) => (
            <div key={item.step} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-2xl font-mono block">{item.step}</span>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{item.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* FAQ Accordion Section */}
      <motion.section
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Pertanyaan Umum</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Pertanyaan Yang Sering Diajukan (FAQ)</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full p-4 text-left font-bold text-sm text-slate-900 dark:text-white flex justify-between items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition transform ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaqIndex === idx && (
                <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.section>

      {/* Pengumuman Feed */}
      <motion.section
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Informasi Terbaru</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Pengumuman Pondok</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((a) => (
            <div key={a.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {a.category}
                </span>
                <span className="text-[11px] text-slate-400">{new Date(a.createdAt).toLocaleDateString('id-ID')}</span>
              </div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{a.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">{a.content}</p>
            </div>
          ))}
        </div>
      </motion.section>

    </div>
  );
};
