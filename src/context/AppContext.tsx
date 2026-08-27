import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  Student,
  Bill,
  Payment,
  Announcement,
  BankAccount,
  AuditLog,
  SystemNotification,
  UserSession,
  PaymentType,
  MediaItem,
  PaymentCategory,
  CashflowEntry,
  CashflowType,
  PaymentBreakdownItem,
} from '../types';
import {
  INITIAL_BANK_ACCOUNT,
  INITIAL_STUDENTS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CLASSES,
  INITIAL_DORMITORIES,
  INITIAL_PAYMENT_TYPES,
} from '../data/mockData';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { uploadFile, deleteUploadedFile } from '../lib/upload';
import { CURRENT_ACTIVE_MONTH } from '../utils/paymentStatus';

interface AppContextType {
  students: Student[];
  bills: Bill[];
  payments: Payment[];
  announcements: Announcement[];
  bankAccount: BankAccount;
  auditLogs: AuditLog[];
  notifications: SystemNotification[];
  userSession: UserSession;
  activeStudent: Student | null;
  paymentTypes: PaymentType[];
  mediaGallery: MediaItem[];
  cashflow: CashflowEntry[];
  theme: 'light' | 'dark';
  isFirebaseConfigured: boolean;
  toggleTheme: () => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (notif: Omit<SystemNotification, 'id' | 'createdAt' | 'isRead'>) => void;

  loginAsWali: (nisOrName: string) => { success: boolean; message: string; student?: Student };
  loginAsAdmin: (pin: string) => { success: boolean; message: string };
  logout: () => void;

  createPayment: (data: {
    studentId: string;
    studentNis: string;
    studentName: string;
    parentName: string;
    parentWhatsapp: string;
    parentAddress: string;
    className: string;
    dormitoryName: string;
    paymentTypeId: string;
    paymentTypeName: string;
    category: any;
    monthYear?: string;
    amount: number;
    paymentMethod: 'TRANSFER' | 'CASH';
    proofUrl?: string;
    billId?: string;
    note?: string;
  }) => { payment: Payment; whatsappUrl: string };

  verifyPayment: (paymentId: string, approved: boolean, rejectionReason?: string) => void;
  cancelVerifiedPayment: (paymentId: string, reason?: string) => void;
  updatePaymentAmount: (paymentId: string, newAmount: number, reason?: string) => void;
  manualSettlePayment: (
    studentId: string,
    category: PaymentCategory,
    amount: number,
    note?: string,
    monthYear?: string
  ) => void;

  createStudent: (student: Omit<Student, 'id' | 'createdAt' | 'isDeleted' | 'sppStatus' | 'uangJajanBalance' | 'rihlahStatus'>) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string, soft?: boolean) => void;
  restoreStudent: (id: string) => void;
  importStudents: (newStudents: Partial<Student>[]) => number;
  topUpStudentBalance: (studentId: string, amount: number, note?: string) => void;

  generateBills: (
    targetType: 'ALL' | 'CLASS' | 'DORM' | 'STUDENT',
    targetId: string,
    paymentTypeId: string,
    monthYear: string,
    dueDate: string,
    customAmount?: number
  ) => number;

  createAnnouncement: (anno: {
    title: string;
    category: any;
    content: string;
    isPinned: boolean;
    author: string;
    targetType: 'ALL' | 'CLASS' | 'STUDENT';
    targetClassName?: string;
    targetStudentId?: string;
    targetStudentName?: string;
  }) => void;
  deleteAnnouncement: (id: string) => void;
  updateBankAccount: (bank: BankAccount) => void;

  uploadMediaFile: (file: File) => Promise<MediaItem>;
  addMediaFromUrl: (url: string, name?: string) => MediaItem;
  deleteMediaItem: (id: string) => void;

  addCashflowEntry: (entry: { type: CashflowType; category: string; amount: number; description: string; date: string }) => void;
  deleteCashflowEntry: (id: string) => void;

  updateDefaultPaymentBreakdown: (items: PaymentBreakdownItem[]) => void;
  updateStudentBreakdown: (studentId: string, items: PaymentBreakdownItem[] | undefined) => void;

  backupData: () => string;
  restoreData: (jsonStr: string) => { success: boolean; message: string };
  deleteAllPayments: () => void;
  resetSystem: () => void;
  startCleanForProduction: () => void;
  addAuditLog: (action: string, details: string) => void;
}

const STORAGE_KEYS = {
  STUDENTS: 'pondokpay_students_v1',
  BILLS: 'pondokpay_bills_v1',
  PAYMENTS: 'pondokpay_payments_v1',
  ANNOUNCEMENTS: 'pondokpay_announcements_v1',
  BANK: 'pondokpay_bank_v1',
  LOGS: 'pondokpay_logs_v1',
  SESSION: 'pondokpay_session_v1',
  MEDIA: 'pondokpay_media_v1',
  CASHFLOW: 'pondokpay_cashflow_v1',
};

// Strip `undefined` (Firestore rejects it) and Date-safe clone plain data objects.
function cleanForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BILLS);
    return saved ? JSON.parse(saved) : INITIAL_BILLS;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    return saved ? JSON.parse(saved) : INITIAL_ANNOUNCEMENTS;
  });

  const [bankAccount, setBankAccount] = useState<BankAccount>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BANK);
    return saved ? JSON.parse(saved) : INITIAL_BANK_ACCOUNT;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [mediaGallery, setMediaGallery] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEDIA);
    return saved ? JSON.parse(saved) : [];
  });

  const [cashflow, setCashflow] = useState<CashflowEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASHFLOW);
    return saved ? JSON.parse(saved) : [];
  });

  const [userSession, setUserSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
    return saved ? JSON.parse(saved) : { role: 'GUEST' };
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pondokpay_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem('pondokpay_notifications_v1');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'n1',
        title: 'Batas Tagihan SPP Bulan Agustus',
        message: 'Batas waktu pembayaran SPP Agustus 2026 adalah tanggal 10 Agustus. Harap melakukan transfer tepat waktu.',
        fullContent: 'Assalamu\'alaikum Wr. Wb. Kami mengingatkan seluruh Wali Santri bahwa batas akhir pembayaran kewajiban SPP Bulanan jatuh pada 10 Agustus 2026. Pembayaran dapat dilakukan via transfer Bank BSI atau setor tunai di kantor bendahara.',
        type: 'BILL',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n2',
        title: 'Verifikasi Pembayaran Berhasil',
        message: 'Pembayaran SPP Ananda Muhammad Rizky Pratama telah diverifikasi LUNAS oleh Bendahara.',
        fullContent: 'Invoice INV-20260801-001 sejumlah Rp 450.000 telah terverifikasi LUNAS. Struk digital resmi dapat diunduh melalui menu Riwayat Pembayaran.',
        type: 'PAYMENT',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'n3',
        title: 'Pengumuman Sambangan Wali Santri',
        message: 'Jadwal kunjungan/sambangan wali santri Ahad Pahing 17 Agustus 2026.',
        fullContent: 'Kunjungan Wali Santri dijadwalkan pada Ahad Pahing 17 Agustus 2026. Dimohon para wali santri untuk menjaga ketertiban, membawa kartu identitas wali, dan mematuhi jam kunjung 08:00 - 16:00 WIB.',
        type: 'ANNOUNCEMENT',
        isRead: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  });

  // ---------------------------------------------------------------------
  // FIRESTORE SYNC LAYER
  // When Firebase env vars are configured, all data lives in Firestore and
  // every connected device (admin + all wali santri) sees the same, real,
  // persistent data in real time. When not configured, everything falls
  // back to this browser's localStorage exactly like before, so the app
  // never breaks even without setup.
  // ---------------------------------------------------------------------

  const fsSetDoc = useCallback(async (col: string, id: string, data: any) => {
    if (!db) return;
    try {
      await setDoc(doc(db, col, id), cleanForFirestore(data));
    } catch (err) {
      console.error(`[Firestore] Gagal menyimpan ${col}/${id}`, err);
    }
  }, []);

  const fsDeleteDoc = useCallback(async (col: string, id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, col, id));
    } catch (err) {
      console.error(`[Firestore] Gagal menghapus ${col}/${id}`, err);
    }
  }, []);

  const fsOverwriteCollection = useCallback(async (col: string, items: any[]) => {
    if (!db) return;
    try {
      const existing = await getDocs(collection(db, col));
      const batch = writeBatch(db);
      existing.forEach((d) => batch.delete(d.ref));
      items.forEach((item) => batch.set(doc(db, col, item.id), cleanForFirestore(item)));
      await batch.commit();
    } catch (err) {
      console.error(`[Firestore] Gagal menimpa koleksi ${col}`, err);
    }
  }, []);

  const fsDeleteAllInCollection = useCallback(async (col: string) => {
    if (!db) return;
    try {
      const existing = await getDocs(collection(db, col));
      const batch = writeBatch(db);
      existing.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.error(`[Firestore] Gagal menghapus semua isi koleksi ${col}`, err);
    }
  }, []);

  // One-time seed: if Firestore project is brand new/empty, populate it with
  // the starter demo data so the admin has something to explore immediately.
  useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        const metaRef = doc(db, 'meta', 'seed');
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.exists()) return;

        const batch = writeBatch(db);
        INITIAL_STUDENTS.forEach((s) => batch.set(doc(db, 'students', s.id), cleanForFirestore(s)));
        INITIAL_BILLS.forEach((b) => batch.set(doc(db, 'bills', b.id), cleanForFirestore(b)));
        INITIAL_PAYMENTS.forEach((p) => batch.set(doc(db, 'payments', p.id), cleanForFirestore(p)));
        INITIAL_ANNOUNCEMENTS.forEach((a) => batch.set(doc(db, 'announcements', a.id), cleanForFirestore(a)));
        INITIAL_AUDIT_LOGS.forEach((l) => batch.set(doc(db, 'auditLogs', l.id), cleanForFirestore(l)));
        batch.set(doc(db, 'settings', 'bankAccount'), cleanForFirestore(INITIAL_BANK_ACCOUNT));
        batch.set(metaRef, { seededAt: new Date().toISOString() });
        await batch.commit();
      } catch (err) {
        console.error('[Firestore] Gagal melakukan seeding data awal', err);
      }
    })();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!db) return;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'students'),
        (snap) => {
          const arr = snap.docs.map((d) => ({ ...(d.data() as Student), id: d.id }));
          arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setStudents(arr);
        },
        (err) => console.error('[Firestore] sync students error', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'bills'),
        (snap) => {
          const arr = snap.docs.map((d) => ({ ...(d.data() as Bill), id: d.id }));
          arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setBills(arr);
        },
        (err) => console.error('[Firestore] sync bills error', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'payments'),
        (snap) => {
          const arr = snap.docs.map((d) => ({ ...(d.data() as Payment), id: d.id }));
          arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setPayments(arr);
        },
        (err) => console.error('[Firestore] sync payments error', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'announcements'),
        (snap) => {
          const arr = snap.docs.map((d) => ({ ...(d.data() as Announcement), id: d.id }));
          arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setAnnouncements(arr);
        },
        (err) => console.error('[Firestore] sync announcements error', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'auditLogs'),
        (snap) => {
          const arr = snap.docs.map((d) => ({ ...(d.data() as AuditLog), id: d.id }));
          arr.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          setAuditLogs(arr.slice(0, 500));
        },
        (err) => console.error('[Firestore] sync auditLogs error', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'media'),
        (snap) => {
          const arr = snap.docs.map((d) => ({ ...(d.data() as MediaItem), id: d.id }));
          arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setMediaGallery(arr);
        },
        (err) => console.error('[Firestore] sync media error', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'cashflow'),
        (snap) => {
          const arr = snap.docs.map((d) => ({ ...(d.data() as CashflowEntry), id: d.id }));
          arr.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
          setCashflow(arr);
        },
        (err) => console.error('[Firestore] sync cashflow error', err)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'bankAccount'),
        (snap) => {
          if (snap.exists()) setBankAccount(snap.data() as BankAccount);
        },
        (err) => console.error('[Firestore] sync bankAccount error', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'notifications'),
        (snap) => {
          const arr = snap.docs.map((d) => ({ ...(d.data() as SystemNotification), id: d.id }));
          arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          // Batasi 200 notifikasi terbaru saja supaya tidak membengkak tanpa batas.
          setNotifications(arr.slice(0, 200));
        },
        (err) => console.error('[Firestore] sync notifications error', err)
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  // Toggle Theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    localStorage.setItem('pondokpay_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Terapkan preset warna brand (accent) yang diatur admin ke seluruh
  // dokumen, supaya elemen yang pakai var(--accent-*) di CSS ikut berubah.
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', bankAccount.themeAccent || 'emerald');
  }, [bankAccount.themeAccent]);

  useEffect(() => {
    localStorage.setItem('pondokpay_notifications_v1', JSON.stringify(notifications));
  }, [notifications]);

  const markNotificationRead = (id: string) => {
    if (id.startsWith('ann_')) {
      const annoId = id.slice(4);
      setReadAnnouncementIds((prev) => (prev.includes(annoId) ? prev : [...prev, annoId]));
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    const target = notifications.find((n) => n.id === id);
    if (target) fsSetDoc('notifications', id, { ...target, isRead: true });
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    notifications.forEach((n) => {
      if (!n.isRead) fsSetDoc('notifications', n.id, { ...n, isRead: true });
    });
    setReadAnnouncementIds(relevantAnnouncements.map((a) => a.id));
  };

  const deleteNotification = (id: string) => {
    if (id.startsWith('ann_')) {
      const annoId = id.slice(4);
      setDismissedAnnouncementIds((prev) => (prev.includes(annoId) ? prev : [...prev, annoId]));
      return;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fsDeleteDoc('notifications', id);
  };

  const addNotification = (notif: Omit<SystemNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const newN: SystemNotification = {
      ...notif,
      id: `n_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newN, ...prev]);
    // Simpan ke Firestore supaya notifikasi realtime muncul di SEMUA perangkat
    // yang sedang login (admin & wali santri), bukan cuma di layar pengirim.
    fsSetDoc('notifications', newN.id, newN);
  };

  // Sync local state to localStorage (fallback / offline cache, always kept warm)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(bankAccount));
  }, [bankAccount]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(mediaGallery));
  }, [mediaGallery]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASHFLOW, JSON.stringify(cashflow));
  }, [cashflow]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(userSession));
  }, [userSession]);

  const activeStudent = React.useMemo(() => {
    if (userSession.role === 'WALI' && userSession.studentNis) {
      return students.find((s) => s.nis === userSession.studentNis) || null;
    }
    return null;
  }, [userSession, students]);

  // ---------------------------------------------------------------------
  // Announcements → Notification Bell bridge. Pengumuman yang dibuat admin
  // (tersimpan di Firestore, real-time) otomatis muncul di lonceng notifikasi
  // utama juga, bukan cuma di halaman dashboard wali santri paling bawah.
  // ---------------------------------------------------------------------
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pondokpay_read_anno_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pondokpay_dismissed_anno_v1');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('pondokpay_read_anno_v1', JSON.stringify(readAnnouncementIds));
  }, [readAnnouncementIds]);
  useEffect(() => {
    localStorage.setItem('pondokpay_dismissed_anno_v1', JSON.stringify(dismissedAnnouncementIds));
  }, [dismissedAnnouncementIds]);

  const relevantAnnouncements = React.useMemo(() => {
    return announcements.filter((a) => {
      if (dismissedAnnouncementIds.includes(a.id)) return false;
      if (userSession.role === 'ADMIN') return true;
      if (a.targetType === 'CLASS') return !!activeStudent && a.targetClassName === activeStudent.className;
      if (a.targetType === 'STUDENT') return !!activeStudent && a.targetStudentId === activeStudent.id;
      return true;
    });
  }, [announcements, userSession, activeStudent, dismissedAnnouncementIds]);

  const announcementNotifications: SystemNotification[] = React.useMemo(
    () =>
      relevantAnnouncements.map((a) => ({
        id: `ann_${a.id}`,
        title: (a.isPinned ? '📌 ' : '') + a.title,
        message: a.content.length > 90 ? `${a.content.slice(0, 90)}…` : a.content,
        fullContent: a.content,
        type: 'ANNOUNCEMENT' as const,
        isRead: readAnnouncementIds.includes(a.id),
        createdAt: a.createdAt,
      })),
    [relevantAnnouncements, readAnnouncementIds]
  );

  const combinedNotifications: SystemNotification[] = React.useMemo(() => {
    // PENTING (privasi): notifikasi transaksional (pembayaran/tagihan) yang
    // terikat ke seorang santri (studentNis) HANYA boleh dilihat admin ATAU
    // wali dari santri yang bersangkutan — bukan wali santri lain.
    const visibleTransactional = notifications.filter((n) => {
      if (userSession.role === 'ADMIN') return true;
      if (!n.studentNis) return false; // notifikasi umum tanpa target santri: admin-only
      return n.studentNis === activeStudent?.nis;
    });

    const merged = [...announcementNotifications, ...visibleTransactional];

    if (userSession.role === 'WALI') {
      // Di dashboard/notifikasi wali santri, notifikasi PRIBADI (tagihan,
      // status pembayaran miliknya sendiri) harus muncul di ATAS, baru
      // pengumuman umum pondok di bawahnya — bukan tercampur murni
      // berdasarkan waktu, supaya info yang paling relevan buat dia selalu
      // terlihat duluan.
      const personal = merged.filter((n) => n.type !== 'ANNOUNCEMENT').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      const general = merged.filter((n) => n.type === 'ANNOUNCEMENT').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return [...personal, ...general];
    }

    return merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [announcementNotifications, notifications, userSession, activeStudent]);

  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `l_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      details,
      user: userSession.role === 'ADMIN' ? userSession.adminName || 'Admin' : activeStudent ? `Wali (${activeStudent.name})` : 'System',
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    fsSetDoc('auditLogs', newLog.id, newLog);
  };

  const loginAsWali = (nisOrName: string) => {
    const query = nisOrName.trim().toLowerCase();
    // PENTING (privasi): login wali santri HANYA boleh lewat kecocokan NIS
    // yang persis (exact match), bukan lewat nama. Kalau nama diperbolehkan
    // sebagai kunci login, siapapun yang tahu/menebak nama santri lain bisa
    // langsung masuk ke akun itu tanpa tahu NIS-nya. Pencarian nama di UI
    // hanya untuk *menemukan* santri; NIS tetap wajib diketik untuk konfirmasi.
    const student = students.find((s) => !s.isDeleted && s.nis.toLowerCase() === query);

    if (student) {
      setUserSession({
        role: 'WALI',
        studentNis: student.nis,
      });
      addAuditLog('LOGIN_WALI', `Wali Santri ${student.name} (NIS: ${student.nis}) berhasil masuk`);
      return { success: true, message: `أَهْلًا وَسَهْلًا — Selamat datang kembali, ${student.parentName}.`, student };
    }

    return { success: false, message: 'NIS tidak ditemukan. Pastikan NIS santri diketik dengan tepat.' };
  };

  const loginAsAdmin = (pinOrPass: string) => {
    // Admin PIN/password validation
    const query = pinOrPass.toLowerCase().trim();
    if (query === '123456' || query === 'admin' || query === '085148199511' || query === '109676' || query === 'kaiser 109676') {
      setUserSession({
        role: 'ADMIN',
        adminName: 'kaiser 109676',
      });
      addAuditLog('LOGIN_ADMIN', 'Administrator berhasil masuk ke dashboard');
      return { success: true, message: 'أَهْلًا وَسَهْلًا — Selamat datang di dashboard.' };
    }
    return { success: false, message: 'PIN / Password Administrator tidak valid!' };
  };

  const logout = () => {
    setUserSession({ role: 'GUEST' });
  };

  const createPayment = (data: {
    studentId: string;
    studentNis: string;
    studentName: string;
    parentName: string;
    parentWhatsapp: string;
    parentAddress: string;
    className: string;
    dormitoryName: string;
    paymentTypeId: string;
    paymentTypeName: string;
    category: any;
    monthYear?: string;
    amount: number;
    paymentMethod: 'TRANSFER' | 'CASH';
    proofUrl?: string;
    billId?: string;
    note?: string;
  }) => {
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomNum}`;
    const transactionNumber = `TRX-${timestamp.toString().slice(-7)}`;

    const newPayment: Payment = {
      // ID dengan suffix acak (bukan timestamp saja) — mencegah dua pembayaran
      // yang dibuat di milidetik yang sama saling menimpa di database.
      id: `p_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
      invoiceNumber,
      transactionNumber,
      billId: data.billId,
      studentId: data.studentId,
      studentNis: data.studentNis,
      studentName: data.studentName,
      parentName: data.parentName,
      parentWhatsapp: data.parentWhatsapp,
      parentAddress: data.parentAddress,
      className: data.className,
      dormitoryName: data.dormitoryName,
      paymentTypeId: data.paymentTypeId,
      paymentTypeName: data.paymentTypeName,
      category: data.category,
      monthYear: data.monthYear,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      proofUrl: data.proofUrl,
      status: 'MENUNGGU_VERIFIKASI',
      note: data.note,
      createdAt: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);
    fsSetDoc('payments', newPayment.id, newPayment);

    // Update bill status if tied to a bill
    if (data.billId) {
      setBills((prev) =>
        prev.map((b) => (b.id === data.billId ? { ...b, status: 'MENUNGGU_VERIFIKASI' as const } : b))
      );
      const bill = bills.find((b) => b.id === data.billId);
      if (bill) fsSetDoc('bills', bill.id, { ...bill, status: 'MENUNGGU_VERIFIKASI' });
    }

    // Update student sppStatus if SPP payment
    if (data.category === 'SPP') {
      setStudents((prev) =>
        prev.map((s) => (s.id === data.studentId ? { ...s, sppStatus: 'MENUNGGU' as const } : s))
      );
      const st = students.find((s) => s.id === data.studentId);
      if (st) fsSetDoc('students', st.id, { ...st, sppStatus: 'MENUNGGU' });
    }

    addAuditLog(
      'PEMBAYARAN_BARU',
      `Pembayaran ${invoiceNumber} (${data.studentName} - Rp ${data.amount.toLocaleString('id-ID')}) dikirim`
    );

    // Notifikasi realtime: satu untuk admin (perlu tindakan verifikasi),
    // satu untuk wali santri yang bersangkutan (statusnya sedang diproses).
    addNotification({
      title: 'Pembayaran Baru Menunggu Verifikasi',
      message: `${data.studentName} mengirim pembayaran ${data.paymentTypeName} sebesar Rp ${data.amount.toLocaleString('id-ID')}.`,
      type: 'PAYMENT',
    });
    addNotification({
      title: 'Pembayaran Sedang Diproses',
      message: `Pembayaran ${data.paymentTypeName}${data.monthYear ? ` (${data.monthYear})` : ''} sebesar Rp ${data.amount.toLocaleString('id-ID')} sedang diperiksa oleh admin.`,
      type: 'PAYMENT',
      studentNis: data.studentNis,
    });

    // Format WhatsApp Message to Admin
    const formattedAmount = `Rp ${data.amount.toLocaleString('id-ID')}`;
    const waText = `Assalamu'alaikum Admin,\nSaya telah melakukan pembayaran.\n\nNama Orang Tua: ${data.parentName}\nNama Santri: ${data.studentName}\nNIS: ${data.studentNis}\nJenis Pembayaran: ${data.paymentTypeName}${data.monthYear ? ` (${data.monthYear})` : ''}\nNominal: ${formattedAmount}\n\nSaya juga telah mengunggah bukti pembayaran melalui website.\nMohon dilakukan verifikasi.\nTerima kasih.`;

    const cleanWaAdmin = bankAccount.whatsappAdmin.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanWaAdmin}?text=${encodeURIComponent(waText)}`;

    return { payment: newPayment, whatsappUrl };
  };

  const verifyPayment = (paymentId: string, approved: boolean, rejectionReason?: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;

    const newStatus = approved ? 'DIVERIFIKASI' : 'DITOLAK';

    const updatedPayment: Payment = {
      ...payment,
      status: newStatus,
      rejectionReason: approved ? undefined : rejectionReason,
      verifiedAt: new Date().toISOString(),
      verifiedBy: userSession.adminName || 'Admin',
    };

    setPayments((prev) => prev.map((p) => (p.id === paymentId ? updatedPayment : p)));
    fsSetDoc('payments', paymentId, updatedPayment);

    // Update associated bill status
    if (payment.billId) {
      const bill = bills.find((b) => b.id === payment.billId);
      setBills((prev) =>
        prev.map((b) =>
          b.id === payment.billId ? { ...b, status: approved ? 'LUNAS' as const : 'BELUM_LUNAS' as const } : b
        )
      );
      if (bill) fsSetDoc('bills', bill.id, { ...bill, status: approved ? 'LUNAS' : 'BELUM_LUNAS' });
    }

    // Update student financial attributes
    const student = students.find((s) => s.id === payment.studentId);
    if (student) {
      let sppStatus = student.sppStatus;
      let rihlahStatus = student.rihlahStatus;
      let uangJajanBalance = student.uangJajanBalance;

      if (payment.category === 'SPP') {
        sppStatus = approved ? 'LUNAS' : 'BELUM_LUNAS';
      } else if (payment.category === 'RIHLAH') {
        rihlahStatus = approved ? 'LUNAS' : 'BELUM_LUNAS';
      } else if (payment.category === 'UANG_JAJAN' && approved) {
        uangJajanBalance += payment.amount;
      }

      const updatedStudent = { ...student, sppStatus, rihlahStatus, uangJajanBalance };
      setStudents((prev) => prev.map((s) => (s.id === payment.studentId ? updatedStudent : s)));
      fsSetDoc('students', student.id, updatedStudent);
    }

    addAuditLog(
      approved ? 'VERIFIKASI_BERHASIL' : 'VERIFIKASI_DITOLAK',
      `Pembayaran ${payment.invoiceNumber} (${payment.studentName}) ${approved ? 'DIVERIFIKASI LUNAS' : `DITOLAK: ${rejectionReason || 'Bukti tidak sesuai'}`}`
    );

    // Notifikasi realtime ke wali santri yang bersangkutan.
    addNotification({
      title: approved ? 'Pembayaran Berhasil Diverifikasi' : 'Pembayaran Perlu Diperiksa Kembali',
      message: approved
        ? `Pembayaran ${payment.paymentTypeName}${payment.monthYear ? ` (${payment.monthYear})` : ''} sebesar Rp ${payment.amount.toLocaleString('id-ID')} telah diverifikasi dan tercatat LUNAS.`
        : `Pembayaran ${payment.paymentTypeName} belum dapat diverifikasi. ${rejectionReason ? `Alasan: ${rejectionReason}` : 'Silakan periksa kembali bukti pembayaran.'}`,
      type: 'PAYMENT',
      studentNis: payment.studentNis,
    });
  };

  // Admin realizes a payment was verified/ACC'd by mistake (mis-click, wrong
  // student, wrong month, etc.) and needs to undo it — reverts the payment,
  // the related bill, and the student's SPP/Rihlah/saldo status back to
  // "belum lunas" (as if it was never verified).
  /**
   * Admin mengoreksi NOMINAL pembayaran yang sudah tercatat (mis. salah input
   * jumlah). Berbeda dengan cancelVerifiedPayment (yang membatalkan total),
   * ini hanya mengubah angkanya saja, dan tetap tersimpan sebagai pembayaran
   * untuk bulan yang sama — sehingga status per-bulan otomatis terhitung ulang.
   */
  const updatePaymentAmount = (paymentId: string, newAmount: number, reason?: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment || newAmount <= 0) return;

    const updatedPayment: Payment = { ...payment, amount: newAmount };
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? updatedPayment : p)));
    fsSetDoc('payments', paymentId, updatedPayment);

    addAuditLog(
      'KOREKSI_NOMINAL_PEMBAYARAN',
      `Admin mengoreksi nominal ${payment.invoiceNumber} (${payment.studentName}, ${payment.monthYear || '-'}) dari Rp ${payment.amount.toLocaleString('id-ID')} menjadi Rp ${newAmount.toLocaleString('id-ID')}${reason ? ` — Alasan: ${reason}` : ''}`
    );
  };

  const cancelVerifiedPayment = (paymentId: string, reason?: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment || payment.status !== 'DIVERIFIKASI') return;

    const updatedPayment: Payment = {
      ...payment,
      status: 'DIBATALKAN',
      rejectionReason: reason || 'Dibatalkan oleh Admin (koreksi verifikasi)',
      verifiedAt: new Date().toISOString(),
      verifiedBy: userSession.adminName || 'Admin',
    };
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? updatedPayment : p)));
    fsSetDoc('payments', paymentId, updatedPayment);

    if (payment.billId) {
      const bill = bills.find((b) => b.id === payment.billId);
      setBills((prev) => prev.map((b) => (b.id === payment.billId ? { ...b, status: 'BELUM_LUNAS' as const } : b)));
      if (bill) fsSetDoc('bills', bill.id, { ...bill, status: 'BELUM_LUNAS' });
    }

    const student = students.find((s) => s.id === payment.studentId);
    if (student) {
      let updatedStudent = { ...student };
      if (payment.category === 'SPP') {
        updatedStudent.sppStatus = 'BELUM_LUNAS';
      } else if (payment.category === 'RIHLAH') {
        updatedStudent.rihlahStatus = 'BELUM_LUNAS';
      } else if (payment.category === 'UANG_JAJAN') {
        updatedStudent.uangJajanBalance = Math.max(0, student.uangJajanBalance - payment.amount);
      }
      setStudents((prev) => prev.map((s) => (s.id === payment.studentId ? updatedStudent : s)));
      fsSetDoc('students', student.id, updatedStudent);
    }

    addAuditLog(
      'BATALKAN_VERIFIKASI',
      `⚠️ Membatalkan verifikasi pembayaran ${payment.invoiceNumber} (${payment.studentName}) — dikembalikan ke status Belum Lunas`
    );
  };


  // person). Creates an already-verified payment record and updates the
  // student's status immediately, without needing the wali to submit a form.
  const manualSettlePayment = (
    studentId: string,
    category: PaymentCategory,
    amount: number,
    note?: string,
    monthYear?: string
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student || amount <= 0) return;

    const pType = INITIAL_PAYMENT_TYPES.find((pt) => pt.category === category) || INITIAL_PAYMENT_TYPES[0];
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const newPayment: Payment = {
      id: `p_manual_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
      invoiceNumber: `CASH-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionNumber: `TRX-${timestamp.toString().slice(-7)}`,
      studentId: student.id,
      studentNis: student.nis,
      studentName: student.name,
      parentName: student.parentName,
      parentWhatsapp: student.parentWhatsapp,
      parentAddress: student.parentAddress,
      className: student.className,
      dormitoryName: student.dormitoryName,
      paymentTypeId: pType.id,
      paymentTypeName: pType.name,
      category,
      // PENTING: kalau tidak diisi bulan-nya, pembayaran cash ini TIDAK akan
      // terhitung sebagai lunas untuk bulan manapun di matriks SPP bulanan
      // (yang menghitung status murni berdasarkan payment.monthYear). Default
      // ke bulan aktif kalau admin tidak pilih secara eksplisit.
      monthYear: monthYear || (category === 'SPP' ? CURRENT_ACTIVE_MONTH : undefined),
      amount,
      paymentMethod: 'CASH',
      status: 'DIVERIFIKASI',
      verifiedAt: new Date().toISOString(),
      verifiedBy: userSession.adminName || 'Admin',
      note: note || 'Pelunasan manual oleh Admin (bayar tunai/cash langsung)',
      createdAt: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);
    fsSetDoc('payments', newPayment.id, newPayment);

    let updatedStudent = { ...student };
    if (category === 'SPP') {
      updatedStudent.sppStatus = 'LUNAS';
    } else if (category === 'RIHLAH') {
      updatedStudent.rihlahStatus = 'LUNAS';
    } else if (category === 'UANG_JAJAN') {
      updatedStudent.uangJajanBalance = student.uangJajanBalance + amount;
    }
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));
    fsSetDoc('students', studentId, updatedStudent);

    addAuditLog(
      'LUNASKAN_MANUAL',
      `Admin melunaskan ${pType.name} untuk ${student.name} secara manual (Rp ${amount.toLocaleString('id-ID')})`
    );
  };

  const createStudent = (data: Omit<Student, 'id' | 'createdAt' | 'isDeleted' | 'sppStatus' | 'uangJajanBalance' | 'rihlahStatus'>) => {
    const newStudent: Student = {
      ...data,
      // PENTING (integritas data): ID pakai timestamp + suffix acak, BUKAN
      // Date.now() saja. Kalau cuma Date.now(), dua santri yang dibuat dalam
      // milidetik yang sama (misal admin klik dua kali dengan cepat, atau
      // form submit ganda) akan dapat ID Firestore yang SAMA PERSIS — dan
      // penyimpanan kedua akan MENIMPA/MENGHAPUS data santri pertama tanpa
      // peringatan apapun. Inilah penyebab santri "hilang tiba-tiba".
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sppStatus: 'BELUM_LUNAS',
      uangJajanBalance: 0,
      rihlahStatus: 'BELUM_LUNAS',
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    setStudents((prev) => [newStudent, ...prev]);
    fsSetDoc('students', newStudent.id, newStudent);
    addAuditLog('TAMBAH_SANTRI', `Menambahkan santri baru: ${data.name} (NIS: ${data.nis})`);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    const existing = students.find((s) => s.id === id);
    const updated = existing ? { ...existing, ...updates, updatedAt: new Date().toISOString() } : null;
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)));
    if (updated) fsSetDoc('students', id, updated);
    addAuditLog('EDIT_SANTRI', `Mengubah data santri ID: ${id}`);
  };

  const topUpStudentBalance = (studentId: string, amount: number, note?: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student || amount <= 0) return;

    const updatedStudent = { ...student, uangJajanBalance: student.uangJajanBalance + amount };
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? updatedStudent : s))
    );
    fsSetDoc('students', studentId, updatedStudent);

    const timestamp = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const newPayment: Payment = {
      id: `p_topup_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
      invoiceNumber: `TOP-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionNumber: `TRX-${timestamp.toString().slice(-7)}`,
      studentId: student.id,
      studentNis: student.nis,
      studentName: student.name,
      parentName: student.parentName,
      parentWhatsapp: student.parentWhatsapp,
      parentAddress: student.parentAddress,
      className: student.className,
      dormitoryName: student.dormitoryName,
      paymentTypeId: 'pt2',
      paymentTypeName: 'Tabungan Uang Jajan',
      category: 'UANG_JAJAN',
      amount,
      paymentMethod: 'CASH',
      status: 'DIVERIFIKASI',
      verifiedAt: new Date().toISOString(),
      verifiedBy: userSession.adminName || 'Admin',
      note: note || 'TopUp Langsung Kasir Pondok',
      createdAt: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);
    fsSetDoc('payments', newPayment.id, newPayment);
    addAuditLog('TOPUP_SALDO', `TopUp Saldo Uang Jajan ${student.name} (+Rp ${amount.toLocaleString('id-ID')})`);
  };

  const deleteStudent = (id: string, soft = true) => {
    if (soft) {
      const existing = students.find((s) => s.id === id);
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, isDeleted: true } : s)));
      if (existing) fsSetDoc('students', id, { ...existing, isDeleted: true });
      addAuditLog('HAPUS_SANTRI_SOFT', `Soft delete santri ID: ${id}`);
    } else {
      setStudents((prev) => prev.filter((s) => s.id !== id));
      fsDeleteDoc('students', id);
      addAuditLog('HAPUS_SANTRI_PERMANEN', `Hapus permanen santri ID: ${id}`);
    }
  };

  const restoreStudent = (id: string) => {
    const existing = students.find((s) => s.id === id);
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, isDeleted: false } : s)));
    if (existing) fsSetDoc('students', id, { ...existing, isDeleted: false });
    addAuditLog('RESTORE_SANTRI', `Memulihkan santri ID: ${id}`);
  };

  const importStudents = (newStudents: Partial<Student>[]) => {
    let count = 0;
    const prepared: Student[] = [];

    newStudents.forEach((st) => {
      if (!st.name || !st.nis) return;
      const exists = students.some((s) => s.nis === st.nis);
      if (!exists) {
        prepared.push({
          id: `s_imp_${Date.now()}_${count}`,
          nis: st.nis,
          name: st.name,
          classId: st.classId || 'c1',
          className: st.className || '7 A (Ula)',
          dormitoryId: st.dormitoryId || 'd1',
          dormitoryName: st.dormitoryName || 'Asrama Al-Ghazali (Putra)',
          parentName: st.parentName || 'Wali Santri',
          parentWhatsapp: st.parentWhatsapp || '081234567890',
          parentAddress: st.parentAddress || 'Indonesia',
          photoUrl: st.photoUrl,
          sppStatus: 'BELUM_LUNAS',
          uangJajanBalance: 0,
          rihlahStatus: 'BELUM_LUNAS',
          isDeleted: false,
          createdAt: new Date().toISOString(),
        });
        count++;
      }
    });

    if (prepared.length > 0) {
      setStudents((prev) => [...prepared, ...prev]);
      prepared.forEach((s) => fsSetDoc('students', s.id, s));
      addAuditLog('IMPORT_EXCEL_SANTRI', `Berhasil mengimpor ${count} santri dari Excel/CSV`);
    }

    return count;
  };

  const generateBills = (
    targetType: 'ALL' | 'CLASS' | 'DORM' | 'STUDENT',
    targetId: string,
    paymentTypeId: string,
    monthYear: string,
    dueDate: string,
    customAmount?: number
  ) => {
    const pType = INITIAL_PAYMENT_TYPES.find((pt) => pt.id === paymentTypeId) || INITIAL_PAYMENT_TYPES[0];
    const amount = customAmount || pType.defaultAmount;

    let targetStudents = students.filter((s) => !s.isDeleted);
    if (targetType === 'CLASS') {
      targetStudents = targetStudents.filter((s) => s.classId === targetId || s.className === targetId);
    } else if (targetType === 'DORM') {
      targetStudents = targetStudents.filter((s) => s.dormitoryId === targetId || s.dormitoryName === targetId);
    } else if (targetType === 'STUDENT') {
      targetStudents = targetStudents.filter((s) => s.id === targetId || s.nis === targetId);
    }

    let generatedCount = 0;
    const newBills: Bill[] = [];

    targetStudents.forEach((st) => {
      const billNumber = `BILL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      newBills.push({
        id: `b_gen_${Date.now()}_${generatedCount}`,
        billNumber,
        studentId: st.id,
        studentNis: st.nis,
        studentName: st.name,
        className: st.className,
        dormitoryName: st.dormitoryName,
        paymentTypeId: pType.id,
        paymentTypeName: pType.name,
        category: pType.category,
        amount,
        monthYear,
        dueDate,
        status: 'BELUM_LUNAS',
        createdAt: new Date().toISOString(),
      });
      generatedCount++;
    });

    if (newBills.length > 0) {
      setBills((prev) => [...newBills, ...prev]);
      newBills.forEach((b) => fsSetDoc('bills', b.id, b));
      addAuditLog(
        'GENERATE_TAGIHAN',
        `Membuat ${generatedCount} tagihan ${pType.name} (${monthYear}) untuk target ${targetType}`
      );
    }

    return generatedCount;
  };

  const createAnnouncement = (data: {
    title: string;
    category: any;
    content: string;
    isPinned: boolean;
    author: string;
    targetType: 'ALL' | 'CLASS' | 'STUDENT';
    targetClassName?: string;
    targetStudentId?: string;
    targetStudentName?: string;
  }) => {
    const newAnno: Announcement = {
      ...data,
      id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setAnnouncements((prev) => [newAnno, ...prev]);
    fsSetDoc('announcements', newAnno.id, newAnno);
    addAuditLog('TAMBAH_PENGUMUMAN', `Pengumuman baru dipublikasi: ${data.title}`);
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    fsDeleteDoc('announcements', id);
    addAuditLog('HAPUS_PENGUMUMAN', `Menghapus pengumuman ID: ${id}`);
  };

  const updateBankAccount = (bank: BankAccount) => {
    setBankAccount(bank);
    fsSetDoc('settings', 'bankAccount', bank);
    addAuditLog('UPDATE_REKENING', `Perubahan rekening utama: ${bank.bankName} - ${bank.accountNumber} (${bank.accountHolder})`);
  };

  // -------------------------- MEDIA GALLERY --------------------------
  const uploadMediaFile = async (file: File): Promise<MediaItem> => {
    const { url, storagePath } = await uploadFile(file, 'media');
    const item: MediaItem = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url,
      name: file.name,
      type: file.type.startsWith('video') ? 'video' : 'image',
      storagePath,
      createdAt: new Date().toISOString(),
    };
    setMediaGallery((prev) => [item, ...prev]);
    fsSetDoc('media', item.id, item);
    addAuditLog('UPLOAD_MEDIA', `Mengunggah media baru: ${file.name}`);
    return item;
  };

  const addMediaFromUrl = (url: string, name?: string): MediaItem => {
    const item: MediaItem = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url,
      name: name || 'Media dari URL',
      type: /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url) ? 'video' : 'image',
      createdAt: new Date().toISOString(),
    };
    setMediaGallery((prev) => [item, ...prev]);
    fsSetDoc('media', item.id, item);
    return item;
  };

  const deleteMediaItem = (id: string) => {
    const item = mediaGallery.find((m) => m.id === id);
    setMediaGallery((prev) => prev.filter((m) => m.id !== id));
    fsDeleteDoc('media', id);
    if (item?.storagePath) deleteUploadedFile(item.storagePath);
  };

  // -------------------------- CASHFLOW (KAS PONDOK) --------------------------
  const addCashflowEntry = (entry: { type: CashflowType; category: string; amount: number; description: string; date: string }) => {
    if (entry.amount <= 0) return;
    const newEntry: CashflowEntry = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...entry,
      createdBy: userSession.adminName || 'Admin',
      createdAt: new Date().toISOString(),
    };
    setCashflow((prev) => [newEntry, ...prev]);
    fsSetDoc('cashflow', newEntry.id, newEntry);
    addAuditLog(
      entry.type === 'PEMASUKAN' ? 'TAMBAH_PEMASUKAN' : 'TAMBAH_PENGELUARAN',
      `${entry.type === 'PEMASUKAN' ? '+' : '-'}Rp ${entry.amount.toLocaleString('id-ID')} — ${entry.category}: ${entry.description}`
    );
  };

  const deleteCashflowEntry = (id: string) => {
    setCashflow((prev) => prev.filter((c) => c.id !== id));
    fsDeleteDoc('cashflow', id);
    addAuditLog('HAPUS_TRANSAKSI_KAS', `Menghapus catatan kas ID: ${id}`);
  };

  // -------------------------- RINCIAN PEMBAYARAN (SARAN NOMINAL) --------------------------
  const updateDefaultPaymentBreakdown = (items: PaymentBreakdownItem[]) => {
    const updated = { ...bankAccount, defaultPaymentBreakdown: items };
    setBankAccount(updated);
    fsSetDoc('settings', 'bankAccount', updated);
    addAuditLog('UPDATE_RINCIAN_DEFAULT', `Mengubah rincian pembayaran default (total Rp ${items.reduce((s, i) => s + i.amount, 0).toLocaleString('id-ID')})`);
  };

  const updateStudentBreakdown = (studentId: string, items: PaymentBreakdownItem[] | undefined) => {
    const existing = students.find((s) => s.id === studentId);
    if (!existing) return;
    const updated = { ...existing, suggestedBreakdown: items };
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
    fsSetDoc('students', studentId, updated);
    addAuditLog(
      'UPDATE_RINCIAN_SANTRI',
      items
        ? `Kustom rincian pembayaran untuk ${existing.name}: total Rp ${items.reduce((s, i) => s + i.amount, 0).toLocaleString('id-ID')}`
        : `Reset rincian pembayaran ${existing.name} ke default pondok`
    );
  };


  const backupData = () => {
    const backupObj = {
      version: 'PondokPay_v1.0',
      timestamp: new Date().toISOString(),
      students,
      bills,
      payments,
      announcements,
      bankAccount,
      auditLogs,
    };
    return JSON.stringify(backupObj, null, 2);
  };

  const restoreData = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.students && parsed.payments && parsed.bankAccount) {
        setStudents(parsed.students);
        setBills(parsed.bills || []);
        setPayments(parsed.payments);
        setAnnouncements(parsed.announcements || []);
        setBankAccount(parsed.bankAccount);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);

        if (db) {
          fsOverwriteCollection('students', parsed.students);
          fsOverwriteCollection('bills', parsed.bills || []);
          fsOverwriteCollection('payments', parsed.payments);
          fsOverwriteCollection('announcements', parsed.announcements || []);
          fsSetDoc('settings', 'bankAccount', parsed.bankAccount);
          if (parsed.auditLogs) fsOverwriteCollection('auditLogs', parsed.auditLogs);
        }

        addAuditLog('RESTORE_DATABASE', 'Restorasi database dari file backup berhasil');
        return { success: true, message: 'Restorasi data berhasil dilakukan' };
      } else {
        return { success: false, message: 'Format file JSON backup tidak valid' };
      }
    } catch (err: any) {
      return { success: false, message: `Gagal membaca file backup: ${err?.message || 'Error syntax'}` };
    }
  };

  const deleteAllPayments = () => {
    setPayments([]);
    setBills((prev) => prev.map((b) => ({ ...b, status: 'BELUM_LUNAS' as const })));
    setStudents((prev) => prev.map((s) => ({ ...s, sppStatus: 'BELUM_LUNAS' as const, rihlahStatus: 'BELUM_LUNAS' as const })));

    if (db) {
      fsDeleteAllInCollection('payments');
      fsOverwriteCollection('bills', bills.map((b) => ({ ...b, status: 'BELUM_LUNAS' })));
      fsOverwriteCollection('students', students.map((s) => ({ ...s, sppStatus: 'BELUM_LUNAS', rihlahStatus: 'BELUM_LUNAS' })));
    }

    addAuditLog('HAPUS_SEMUA_PEMBAYARAN', '⚠️ MENGHAPUS SELURUH RIWAYAT TRANSAKSI PEMBAYARAN');
  };

  /**
   * Reset BENAR-BENAR BERSIH untuk mulai pemakaian produksi: menghapus semua
   * data dummy/contoh (santri, tagihan, pembayaran, pengumuman) menjadi
   * kosong total, supaya admin bisa mulai input data santri asli dari nol.
   * BEDA dengan resetSystem() yang malah mengisi ulang dengan data contoh.
   * Pengaturan lembaga (nama pondok, logo, rekening) TIDAK ikut terhapus.
   */
  const startCleanForProduction = () => {
    setStudents([]);
    setBills([]);
    setPayments([]);
    setAnnouncements([]);

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify([]));

    if (db) {
      fsOverwriteCollection('students', []);
      fsOverwriteCollection('bills', []);
      fsOverwriteCollection('payments', []);
      fsOverwriteCollection('announcements', []);
    }

    addAuditLog('MULAI_BERSIH_PRODUKSI', '⚠️ Sistem dikosongkan total (tanpa data dummy) untuk mulai pemakaian produksi sungguhan');
  };

  const resetSystem = () => {
    localStorage.clear();
    setStudents(INITIAL_STUDENTS);
    setBills(INITIAL_BILLS);
    setPayments(INITIAL_PAYMENTS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setBankAccount(INITIAL_BANK_ACCOUNT);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setUserSession({ role: 'ADMIN' });

    // Store defaults into localStorage
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(INITIAL_BILLS));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(INITIAL_ANNOUNCEMENTS));
    localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(INITIAL_BANK_ACCOUNT));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ role: 'ADMIN' }));

    if (db) {
      fsOverwriteCollection('students', INITIAL_STUDENTS);
      fsOverwriteCollection('bills', INITIAL_BILLS);
      fsOverwriteCollection('payments', INITIAL_PAYMENTS);
      fsOverwriteCollection('announcements', INITIAL_ANNOUNCEMENTS);
      fsSetDoc('settings', 'bankAccount', INITIAL_BANK_ACCOUNT);
      fsOverwriteCollection('auditLogs', INITIAL_AUDIT_LOGS);
    }

    addAuditLog('RESET_SISTEM', '⚠️ MERESET SELURUH SISTEM KE DUMMY DATA AWAL');
  };

  return (
    <AppContext.Provider
      value={{
        students,
        bills,
        payments,
        announcements,
        bankAccount,
        auditLogs,
        notifications: combinedNotifications,
        userSession,
        activeStudent,
        paymentTypes: INITIAL_PAYMENT_TYPES,
        mediaGallery,
        cashflow,
        theme,
        isFirebaseConfigured,
        toggleTheme,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        addNotification,
        loginAsWali,
        loginAsAdmin,
        logout,
        createPayment,
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
        uploadMediaFile,
        addMediaFromUrl,
        deleteMediaItem,
        addCashflowEntry,
        deleteCashflowEntry,
        updateDefaultPaymentBreakdown,
        updateStudentBreakdown,
        backupData,
        restoreData,
        deleteAllPayments,
        resetSystem,
        startCleanForProduction,
        addAuditLog,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
