import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, GraduationCap, Plane, ShoppingBag, ArrowRight, ChevronDown, Receipt } from 'lucide-react';
import { PaymentType, PaymentBreakdownItem } from '../../types';

interface PaymentOptionsModalProps {
  paymentTypes: PaymentType[];
  breakdown: PaymentBreakdownItem[];
  onClose: () => void;
  onSelect: (paymentType: PaymentType, suggestedAmount?: number) => void;
}

const OPTION_META: Record<string, { icon: React.ElementType; blurb: string; color: string; badge: string }> = {
  SPP: {
    icon: GraduationCap,
    blurb: 'Pembayaran SPP bulanan rutin santri. Nominal bisa disesuaikan sesuai kemampuan.',
    color: 'from-emerald-500 to-teal-700',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  RIHLAH: {
    icon: Plane,
    blurb: 'Infaq kegiatan rihlah/outbound. Nominal berbeda-beda tiap kegiatan, silakan custom.',
    color: 'from-sky-500 to-indigo-700',
    badge: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
  },
  UANG_JAJAN: {
    icon: ShoppingBag,
    blurb: 'Uang jajan / koperasi santri. Isi sesuai kebutuhan, bebas nominalnya.',
    color: 'from-amber-500 to-orange-700',
    badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
};

export const PaymentOptionsModal: React.FC<PaymentOptionsModalProps> = ({ paymentTypes, breakdown, onClose, onSelect }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const options = ['SPP', 'RIHLAH', 'UANG_JAJAN']
    .map((cat) => paymentTypes.find((pt) => pt.category === cat))
    .filter(Boolean) as PaymentType[];

  const breakdownTotal = breakdown.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Pilih Jenis Pembayaran</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Silakan pilih dulu, mau bayar untuk apa.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {options.map((opt, idx) => {
            const meta = OPTION_META[opt.category] || OPTION_META.SPP;
            const Icon = meta.icon;
            const isSpp = opt.category === 'SPP' && breakdown.length > 0;
            const suggestedAmount = isSpp ? breakdownTotal : opt.defaultAmount;
            return (
              <motion.div
                key={opt.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.25 }}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition"
              >
                <button
                  onClick={() => onSelect(opt, suggestedAmount)}
                  className="w-full flex items-center gap-4 p-4 hover:border-emerald-400 dark:hover:border-emerald-600 transition group text-left"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center shrink-0 shadow`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{opt.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
                        disarankan Rp {suggestedAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{meta.blurb}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition shrink-0" />
                </button>

                {isSpp && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 bg-slate-50 dark:bg-slate-800/50">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBreakdown((v) => !v);
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      <Receipt className="w-3.5 h-3.5" /> Lihat rincian nominal
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showBreakdown && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 pb-1 space-y-1">
                            {breakdown.map((b) => (
                              <div key={b.id} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                                <span>{b.label}</span>
                                <span className="font-semibold">Rp {b.amount.toLocaleString('id-ID')}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-[11px] font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                              <span>Total Disarankan</span>
                              <span>Rp {breakdownTotal.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] text-slate-400 text-center">
            Nominal di atas hanya saran — Bapak/Ibu tetap bebas menyesuaikan sendiri sesuai kemampuan, lalu konfirmasi ke Admin via WhatsApp.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
