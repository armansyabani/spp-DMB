import React, { useState } from 'react';
import { BankAccount } from '../../types';
import { Building2, Copy, Check, MessageCircle, X, ExternalLink, ShieldCheck } from 'lucide-react';

interface BankModalProps {
  bankAccount: BankAccount;
  onClose: () => void;
}

export const BankModal: React.FC<BankModalProps> = ({ bankAccount, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(bankAccount.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cleanWa = bankAccount.whatsappAdmin.replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <Building2 className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Rekening Resmi Pondok</h3>
              <p className="text-xs text-emerald-200">Transfer Pembayaran SPP & Infaq Santri</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Main Account Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden border border-emerald-500/20">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">{bankAccount.bankName}</span>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-400 opacity-80" />
            </div>

            <div className="space-y-1 mb-4">
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Nomor Rekening</span>
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-700/60">
                <span className="font-mono text-2xl font-black text-emerald-400 tracking-wider">
                  {bankAccount.accountNumber}
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    copied
                      ? 'bg-emerald-500 text-white shadow'
                      : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Salin Rekening
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Atas Nama:</span>
              <span className="font-extrabold text-white tracking-wide">{bankAccount.accountHolder}</span>
            </div>
          </div>

          {/* Admin WhatsApp Info */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-xl">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Layanan Konfirmasi Admin WA</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{bankAccount.whatsappAdmin}</span>
              </div>
            </div>
            <a
              href={`https://wa.me/${cleanWa}?text=${encodeURIComponent('Assalamu\'alaikum Admin PondokPay, saya ingin bertanya terkait pembayaran santri.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
            >
              Chat WA <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            *Pastikan transfer ditujukan ke rekening di atas. Bukti pembayaran dapat diunggah melalui formulir pembayaran atau dikirim ke WhatsApp Admin.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
