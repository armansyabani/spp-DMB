import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SystemNotification } from '../../types';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Megaphone,
  AlertCircle,
  Copy,
  Settings,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationModalProps {
  onClose: () => void;
  onOpenPayment?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  onClose,
  onOpenPayment,
}) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'BILL' | 'PAYMENT' | 'ANNOUNCEMENT' | 'REMINDER'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Notification Preferences State
  const [autoReminderAlerts, setAutoReminderAlerts] = useState(true);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  // Filter Logic
  const filteredNotifications = notifications.filter((n) => {
    if (filterUnreadOnly && n.isRead) return false;
    if (activeTab === 'ALL') return true;
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'BILL':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'PAYMENT':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-blue-500" />;
      case 'REMINDER':
        return <FileText className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">Pusat Notifikasi & Info</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Pemberitahuan tagihan, verifikasi & pengumuman pondok</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition ${
                showSettings
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
              }`}
              title="Pengaturan Notifikasi"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customization Settings Bar */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-950/20 dark:bg-emerald-950/40 border-b border-emerald-500/20 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Settings className="w-4 h-4" /> Kustomisasi Pengaturan Notifikasi
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sesuaikan tampilan & filter</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <span className="text-xs font-semibold">Tampilkan Hanya Yang Belum Dibaca</span>
                  <input
                    type="checkbox"
                    checked={filterUnreadOnly}
                    onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <span className="text-xs font-semibold">Saran WhatsApp Pengingat Otomatis</span>
                  <input
                    type="checkbox"
                    checked={autoReminderAlerts}
                    onChange={(e) => setAutoReminderAlerts(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs & Bulk Action */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            {(['ALL', 'BILL', 'PAYMENT', 'ANNOUNCEMENT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {tab === 'ALL' && 'Semua'}
                {tab === 'BILL' && 'Tagihan'}
                {tab === 'PAYMENT' && 'Pembayaran'}
                {tab === 'ANNOUNCEMENT' && 'Pengumuman'}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 text-[11px] font-bold transition flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Tandai Semua Dibaca
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold">Tidak ada notifikasi pada kategori ini.</p>
              <p className="text-[11px]">Semua pesan dan pemberitahuan pondok akan muncul di sini.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isExpanded = expandedId === notif.id;

              return (
                <div
                  key={notif.id}
                  className={`rounded-2xl border transition overflow-hidden ${
                    notif.isRead
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 opacity-90'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-sm'
                  }`}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => {
                      if (!notif.isRead) markNotificationRead(notif.id);
                      setExpandedId(isExpanded ? null : notif.id);
                    }}
                    className="p-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 mt-0.5 shrink-0">
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {new Date(notif.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!notif.isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      )}
                      <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Full Text & Actions */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-slate-100/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700/80 space-y-3"
                      >
                        <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          {notif.fullContent || notif.message}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopy(notif.fullContent || notif.message, notif.id)}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedId === notif.id ? 'Tersalin!' : 'Salin Teks Full'}
                            </button>

                            <button
                              onClick={() => deleteNotification(notif.id)}
                              className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold border border-red-200 dark:border-red-900/40 transition flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>

                          {onOpenPayment && (notif.type === 'BILL' || notif.type === 'REMINDER') && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenPayment();
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold transition shadow flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Lakukan Pembayaran
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-extrabold text-xs rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
