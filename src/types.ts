export type PaymentCategory = 'SPP' | 'UANG_JAJAN' | 'RIHLAH' | 'SERAGAM' | 'KITAB' | 'UJIAN' | 'LAINNYA';

export type PaymentMethod = 'TRANSFER' | 'CASH';

export type PaymentStatus = 'MENUNGGU_VERIFIKASI' | 'DIVERIFIKASI' | 'DITOLAK' | 'DIBATALKAN';

export type BillStatus = 'BELUM_LUNAS' | 'MENUNGGU_VERIFIKASI' | 'LUNAS';

export type AnnouncementCategory = 'PENTING' | 'KEUANGAN' | 'KEGIATAN' | 'UMUM';

export interface PaymentBreakdownItem {
  id: string;
  label: string;
  amount: number;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  entryDate?: string;
  classId: string;
  className: string;
  dormitoryId: string;
  dormitoryName: string;
  parentName: string;
  parentWhatsapp: string;
  parentAddress: string;
  photoUrl?: string;
  sppStatus: 'LUNAS' | 'MENUNGGU' | 'BELUM_LUNAS';
  uangJajanBalance: number;
  rihlahStatus: 'LUNAS' | 'MENUNGGU' | 'BELUM_LUNAS';
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Rincian pembayaran bulanan yang disarankan admin khusus untuk santri ini
   * (override dari rincian default pondok). Wali santri tetap bebas bayar
   * custom saat mengisi form pembayaran. */
  suggestedBreakdown?: PaymentBreakdownItem[];
}

export interface Parent {
  id: string;
  name: string;
  whatsapp: string;
  address: string;
  studentNisList: string[];
}

export interface ClassRoom {
  id: string;
  name: string;
  level: string;
}

export interface Dormitory {
  id: string;
  name: string;
  supervisor: string;
}

export interface PaymentType {
  id: string;
  name: string;
  category: PaymentCategory;
  defaultAmount: number;
  description?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  studentId: string;
  studentNis: string;
  studentName: string;
  className: string;
  dormitoryName: string;
  paymentTypeId: string;
  paymentTypeName: string;
  category: PaymentCategory;
  amount: number;
  monthYear?: string;
  dueDate: string;
  status: BillStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceNumber: string;
  transactionNumber: string;
  billId?: string;
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
  category: PaymentCategory;
  monthYear?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  proofUrl?: string;
  status: PaymentStatus;
  note?: string;
  rejectionReason?: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  qrCodeData: string;
  generatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: AnnouncementCategory;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: string;
  targetType: 'ALL' | 'CLASS' | 'STUDENT';
  targetClassName?: string;
  targetStudentId?: string;
  targetStudentName?: string;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  whatsappAdmin: string;
  pesantrenName?: string;
  foundationName?: string;
  pesantrenLogoUrl?: string;
  foundationLogoUrl?: string;
  heroImages?: string[];
  defaultPaymentBreakdown?: PaymentBreakdownItem[];
  /** Kalau false/undefined, seluruh tampilan status & tunggakan Rihlah
   * disembunyikan total (tidak ada badge "BELUM LUNAS" default ke wali
   * santri). Admin harus mengaktifkan ini secara sengaja dari Pengaturan
   * sebelum modul Rihlah dipakai. */
  rihlahModuleEnabled?: boolean;
  /** Foto profil Admin (satu identitas admin bersama). Dipakai konsisten di
   * seluruh aplikasi — dashboard, sidebar, dropdown akun — supaya tidak ada
   * lagi tempat yang "lupa" menampilkan foto dan balik ke avatar inisial. */
  adminPhotoUrl?: string;
  /** Preset warna brand aktif. Kalau kosong, default 'emerald' (hijau khas
   * Islami yang sudah dipakai sejak awal). */
  themeAccent?: 'emerald' | 'royal-blue' | 'maroon' | 'ocean-teal';
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  user: string;
  timestamp: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  fullContent?: string;
  type: 'BILL' | 'PAYMENT' | 'ANNOUNCEMENT' | 'REMINDER';
  isRead: boolean;
  createdAt: string;
  studentNis?: string;
  actionUrl?: string;
}

export interface UserSession {
  role: 'GUEST' | 'WALI' | 'ADMIN';
  studentNis?: string;
  adminName?: string;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  storagePath?: string;
  createdAt: string;
}

export type CashflowType = 'PEMASUKAN' | 'PENGELUARAN';

export interface CashflowEntry {
  id: string;
  type: CashflowType;
  category: string;
  amount: number;
  description: string;
  date: string; // yyyy-mm-dd
  createdBy: string;
  createdAt: string;
}
