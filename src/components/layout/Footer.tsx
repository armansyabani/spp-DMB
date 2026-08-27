import React, { useState } from 'react';
import { 
  Building2, 
  MessageCircle, 
  MapPin, 
  Mail, 
  ShieldCheck, 
  Heart, 
  Copy, 
  Check, 
  Github, 
  Radio, 
  ExternalLink 
} from 'lucide-react';
import { BankAccount } from '../../types';

interface FooterProps {
  bankAccount: BankAccount;
  onOpenBank: () => void;
  onOpenLogin: (tab?: 'WALI' | 'ADMIN') => void;
}

export const Footer: React.FC<FooterProps> = ({ bankAccount, onOpenBank, onOpenLogin }) => {
  const [copied, setCopied] = useState(false);
  const cleanWa = bankAccount.whatsappAdmin.replace(/[^0-9]/g, '');

  const handleCopy = () => {
    if (!bankAccount?.accountNumber) return;
    navigator.clipboard.writeText(bankAccount.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs border-t border-slate-200/80 dark:border-slate-800/80 pt-16 pb-8 transition-colors duration-200 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Column 1: Brand Info & Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 dark:text-white block tracking-tight leading-tight">
                  PondokPay
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase tracking-wider">
                  Sistem Terpadu
                </span>
              </div>
            </div>
            
            <p className="leading-relaxed text-xs font-normal text-slate-500 dark:text-slate-400">
              Sistem informasi keuangan SPP, uang saku, dan infaq santri secara instan, transparan, dan terpercaya.
            </p>

            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 inline-flex">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>BSI: {bankAccount.accountNumber}</span>
            </div>
          </div>

          {/* Column 2: Tautan Cepat */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Tautan Cepat
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={onOpenBank}
                  className="font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 group text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-500 transition-colors"></span>
                  Informasi Rekening
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLogin('WALI')}
                  className="font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 group text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-500 transition-colors"></span>
                  Portal Wali Santri
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLogin('ADMIN')}
                  className="font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 group text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-500 transition-colors"></span>
                  Dasbor Administrator
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Rekening Card - BSI Resmi & Fitur Salin */}
          <div className="relative group rounded-2xl p-5 bg-gradient-to-br from-[#00A39E] via-[#008985] to-[#00605D] text-white shadow-xl shadow-[#00A39E]/20 overflow-hidden border border-[#00C2BC]/30 transition-all duration-300 hover:shadow-2xl hover:shadow-[#00A39E]/30">
            
            {/* Watermark Logo & Ambient Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none select-none">
              <svg className="w-36 h-36 text-white fill-current" viewBox="0 0 100 100">
                <path d="M50 10 L62 38 L92 38 L68 56 L77 84 L50 66 L23 84 L32 56 L8 38 L38 38 Z" />
              </svg>
            </div>

            {/* Header Card: Logo BSI SVG & Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-white/20 relative z-10">
              <svg className="h-6 w-auto" viewBox="0 0 180 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 5L22.5 15.5L33 17L25.5 24.5L27.5 35L18 30L8.5 35L10.5 24.5L3 17L13.5 15.5L18 5Z" fill="#F3A813"/>
                <circle cx="25" cy="11" r="3" fill="#FFFFFF"/>
                <text x="42" y="30" fontFamily="'Plus Jakarta Sans', 'Arial Black', sans-serif" fontWeight="900" fontSize="26" fill="#FFFFFF" letterSpacing="-0.5">BSI</text>
                <text x="43" y="41" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" fontSize="7.5" fill="#E0F7F6" letterSpacing="0.8">BANK SYARIAH INDONESIA</text>
              </svg>

              <span className="text-[9px] font-black tracking-widest uppercase bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-full text-emerald-100 border border-white/20">
                Resmi
              </span>
            </div>

            {/* Body Card: Nomor Rekening + Tombol Salin */}
            <div className="pt-3 pb-2 space-y-1 relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F3A813]"></span>
                {bankAccount.bankName}
              </div>

              <div className="flex items-center justify-between gap-2 py-0.5">
                <span className="font-mono font-black text-white text-lg tracking-wider drop-shadow-sm">
                  {bankAccount.accountNumber}
                </span>

                <button
                  onClick={handleCopy}
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200 active:scale-95 ${
                    copied
                      ? 'bg-[#F3A813] text-slate-950 shadow-md shadow-[#F3A813]/30 scale-105'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm'
                  }`}
                  title="Salin Nomor Rekening"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] font-medium text-emerald-100/90">
                a.n <span className="text-white font-bold">{bankAccount.accountHolder}</span>
              </div>
            </div>

            {/* CTA Button */}
            <a
              href={`https://wa.me/${cleanWa}?text=${encodeURIComponent('Assalamu\'alaikum Admin PondokPay, saya ingin melakukan konfirmasi pembayaran.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 py-2 px-3 bg-[#F3A813] hover:bg-[#e0980f] text-slate-950 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all duration-200 shadow-md shadow-black/20 active:scale-95 relative z-10"
            >
              <MessageCircle className="w-3.5 h-3.5 text-slate-950" />
              <span>Konfirmasi via WA</span>
            </a>
          </div>

          {/* Column 4: Kontak & Komunitas (Saluran / Sosmed Ikon Only) */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Kontak & Komunitas
            </h4>

            <div className="space-y-2 text-[11px]">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Jl. Pesantren Darul Mukhlasin, Dusun sirempu, Semampir, Kec. Banjarnegara, Kab. Banjarnegara, Jawa Tengah 53471')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors leading-relaxed"
              >
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Banjarnegara, Jawa Tengah 53471</span>
              </a>

              <a
                href="mailto:admindarulmukhlasin@gmail.com"
                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>admindarulmukhlasin@gmail.com</span>
              </a>
            </div>

            {/* Social & Channel Icon Buttons */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                Saluran Resmi
              </span>
              <div className="flex items-center gap-2">
                {/* Saluran WhatsApp */}
                <a
                  href="https://whatsapp.com/channel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white text-slate-600 dark:text-slate-400 flex items-center justify-center transition-all duration-200 border border-slate-200/80 dark:border-slate-800 shadow-sm group"
                  title="Saluran WhatsApp"
                >
                  <Radio className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>

                {/* WhatsApp Admin */}
                <a
                  href={`https://wa.me/${cleanWa}?text=${encodeURIComponent('Assalamu\'alaikum Admin PondokPay, saya ingin bertanya.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white text-slate-600 dark:text-slate-400 flex items-center justify-center transition-all duration-200 border border-slate-200/80 dark:border-slate-800 shadow-sm group"
                  title="WhatsApp CS Admin"
                >
                  <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>

                {/* GitHub Repo */}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 text-slate-600 dark:text-slate-400 flex items-center justify-center transition-all duration-200 border border-slate-200/80 dark:border-slate-800 shadow-sm group"
                  title="GitHub Repository"
                >
                  <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>

                {/* Direct Map Icon */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Jl. Pesantren Darul Mukhlasin, Dusun sirempu, Semampir, Kec. Banjarnegara, Kab. Banjarnegara, Jawa Tengah 53471')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 dark:hover:text-white text-slate-600 dark:text-slate-400 flex items-center justify-center transition-all duration-200 border border-slate-200/80 dark:border-slate-800 shadow-sm group"
                  title="Lokasi Google Maps"
                >
                  <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-medium">
          <div className="text-slate-500 dark:text-slate-400 text-center md:text-left">
            &copy; {new Date().getFullYear()} <strong className="text-slate-700 dark:text-slate-300 font-semibold">PondokPay</strong> oleh Pesantren Darul Mukhlasin.
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-800/80">
            <span>Dibuat dengan</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
            <span>untuk Santri</span>
          </div>
        </div>

      </div>
    </footer>
  );
};