import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  CreditCard,
  LogOut,
  MessageCircle,
  Banknote,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentAvatar } from '../common/StudentAvatar';

interface SidebarProps {
  onOpenLogin: (tab?: 'WALI' | 'ADMIN') => void;
  onOpenBank: () => void;
  onOpenPayment: () => void;
  onOpenNotifications: () => void;
  onNavigateHome: () => void;
  onNavigateLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenLogin,
  onOpenBank,
  onOpenPayment,
  onOpenNotifications,
  onNavigateHome,
  onNavigateLanding,
}) => {
  const {
    userSession,
    activeStudent,
    logout,
    bankAccount,
    notifications,
    theme,
    toggleTheme,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;
  const cleanWa = bankAccount.whatsappAdmin.replace(/[^0-9]/g, '');
  const waHref = `https://wa.me/${cleanWa}?text=${encodeURIComponent("Assalamu'alaikum Admin PondokPay, mohon bantuan.")}`;
  const logoUrl = bankAccount.pesantrenLogoUrl || bankAccount.foundationLogoUrl;

  const displayName =
    userSession.role === 'ADMIN'
      ? 'Administrator'
      : activeStudent?.name || 'Wali Santri';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col w-full h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      {/* Brand & Logo */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/60">
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onNavigateHome();
          }}
          className="flex items-center gap-3 w-full cursor-pointer group select-none text-left"
        >
          <div className="flex items-center shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Pesantren"
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-[var(--accent-500)]/50 shadow-sm group-hover:scale-105 transition"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-500)] via-teal-600 to-[var(--accent-900)] p-2 flex items-center justify-center shadow-sm shadow-[var(--accent-500)]/25 group-hover:scale-105 transition">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                PondokPay
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[var(--accent-100)] dark:bg-[var(--accent-500)]/20 text-[var(--accent-900)] dark:text-[var(--accent-400)] border border-[var(--accent-400)] dark:border-[var(--accent-500)]/40 uppercase tracking-wide">
                Pro
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[150px]">
              {bankAccount.pesantrenName || 'Pesantren Darul Mukhlasin'}
            </div>
          </div>
        </button>
      </div>

      {/* Main Menu Items */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        
        {/* Aksi Utama */}
        <div className="space-y-2">
          <span className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--accent-600)] dark:text-[var(--accent-400)]">
            Aksi Utama
          </span>
          <button
            onClick={() => { setMobileMenuOpen(false); onNavigateHome(); }}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold flex items-center gap-3 transition text-slate-800 dark:text-slate-200"
          >
            <LayoutDashboard className="w-4 h-4 text-[var(--accent-600)] dark:text-[var(--accent-400)] shrink-0" />
            <div>{userSession.role === 'ADMIN' ? 'Dashboard Admin' : 'Dashboard Utama'}</div>
          </button>

          {userSession.role !== 'ADMIN' && (
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenPayment(); }}
              className="w-full text-left px-3 py-2.5 rounded-xl bg-[var(--accent-50)] dark:bg-[var(--accent-500)]/10 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-500)]/20 text-sm font-bold flex items-center gap-3 transition text-[var(--accent-900)] dark:text-[var(--accent-400)]"
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <div>
                <div>Bayar SPP & Tagihan</div>
                <div className="text-[10px] text-[var(--accent-700)]/70 dark:text-[var(--accent-400)]/70 font-normal">Cepat & Instan</div>
              </div>
            </button>
          )}

          <button
            onClick={() => { setMobileMenuOpen(false); onOpenBank(); }}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold flex items-center gap-3 transition text-slate-800 dark:text-slate-200"
          >
            <Banknote className="w-4 h-4 text-[var(--accent-600)] dark:text-[var(--accent-400)] shrink-0" />
            <div>
              <div>Info Rekening</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Rekening Tujuan Transfer</div>
            </div>
          </button>
        </div>

        {/* Alat & Informasi */}
        <div className="space-y-2">
          <span className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Alat & Informasi
          </span>
          <button
            onClick={() => { setMobileMenuOpen(false); onOpenNotifications(); }}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold flex items-center justify-between transition text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <div>
                <div>Pusat Notifikasi</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Pengumuman Terkini</div>
              </div>
            </div>
            {unreadNotifCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--accent-500)] text-slate-950">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {userSession.role !== 'ADMIN' && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold flex items-center justify-between transition text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-[var(--accent-600)] dark:text-[var(--accent-400)] shrink-0" />
                <div>
                  <div>CS Admin Pondok</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{bankAccount.whatsappAdmin}</div>
                </div>
              </div>
            </a>
          )}
          <button
            onClick={toggleTheme}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold flex items-center justify-between transition text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--accent-600)] shrink-0" />
              )}
              <div>
                <div>Tema Tampilan</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  {theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Account Bottom Section */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
        {userSession.role === 'GUEST' ? (
          <div className="space-y-2">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenLogin('WALI'); }}
              className="w-full py-2.5 bg-[var(--accent-600)] hover:bg-[var(--accent-700)] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
            >
              <UserCheck className="w-4 h-4" /> Login Wali Santri
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenLogin('ADMIN'); }}
              className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition"
            >
              <ShieldCheck className="w-4 h-4 text-[var(--accent-600)] dark:text-[var(--accent-400)]" /> Admin
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-1">
              {userSession.role === 'ADMIN' ? (
                bankAccount.adminPhotoUrl ? (
                  <img
                    src={bankAccount.adminPhotoUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--accent-500)]/40 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-500)] to-teal-700 flex items-center justify-center text-white text-sm font-black shrink-0">
                    {initials || <UserCheck className="w-4 h-4" />}
                  </div>
                )
              ) : (
                <StudentAvatar
                  photoUrl={activeStudent?.photoUrl}
                  name={activeStudent?.name || 'Wali Santri'}
                  nis={activeStudent?.nis || ''}
                  size="sm"
                  className="shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{displayName}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  {userSession.role === 'ADMIN' ? 'Administrator' : `NIS: ${userSession.studentNis}`}
                </div>
              </div>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition shrink-0"
                title="Keluar Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenLogin('WALI'); }}
                className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-lg transition"
              >
                Ganti Akun
              </button>
              {onNavigateLanding && (
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigateLanding(); }}
                  className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-lg transition"
                >
                  Beranda Depan
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onNavigateHome();
          }}
          className="flex items-center gap-2 cursor-pointer group select-none text-left"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover ring-2 ring-[var(--accent-500)]/50" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-700)] flex items-center justify-center text-white font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          )}
          <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
            PondokPay
          </span>
        </button>
        <div className="flex items-center gap-2">
          {userSession.role !== 'GUEST' && (
            <button
              onClick={onOpenNotifications}
              className="p-2 relative rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>
          )}
           <button
            onClick={onOpenPayment}
            className="p-2 rounded-xl bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-400)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/50 transition"
          >
            <CreditCard className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:block h-screen w-64 xl:w-72 sticky top-0 shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative w-[280px] max-w-[85%] h-full flex flex-col bg-white dark:bg-slate-950 shadow-2xl"
            >
              {/* Close button lives INSIDE the panel so it's always reachable,
                  regardless of screen width or which page (wali/admin) is active. */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
