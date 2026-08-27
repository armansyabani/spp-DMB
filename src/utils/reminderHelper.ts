import { Student, Bill, BankAccount } from '../types';
import { sendWhatsAppMessage, type WaSendResult } from '../lib/waSender';

/**
 * Identifies santri who have not paid their monthly obligations.
 * Returns active (non-deleted) santri whose SPP status is not 'LUNAS'
 * or who have unpaid bills.
 */
export const getUnpaidSantri = (students: Student[], bills: Bill[] = []): Student[] => {
  return students.filter((student) => {
    if (student.isDeleted) return false;

    // Condition 1: SPP status is not LUNAS
    if (student.sppStatus !== 'LUNAS') {
      return true;
    }

    // Condition 2: Check if there are active bills for this student marked as BELUM_LUNAS
    if (bills.length > 0) {
      const hasUnpaidBill = bills.some(
        (b) => b.studentId === student.id && b.status === 'BELUM_LUNAS'
      );
      if (hasUnpaidBill) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Formats WhatsApp phone number to standard international format (e.g. 628123456789).
 */
export const formatWhatsAppNumber = (rawPhone: string): string => {
  const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
  if (digitsOnly.startsWith('0')) {
    return '62' + digitsOnly.slice(1);
  }
  return digitsOnly;
};

/**
 * Builds the pre-filled WhatsApp payment reminder message template.
 * Ditulis dengan bahasa yang natural & hangat seperti admin pondok yang
 * mengetik sendiri — bukan format "laporan sistem" (hindari istilah kaku
 * seperti "Nominal Obligasi", header/emoji berlebihan ala template AI).
 */
export const buildPaymentReminderTemplate = (
  student: Student,
  bankAccount: BankAccount,
  obligationAmount: number = 500000
): string => {
  const currentMonth = new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  return `Assalamu'alaikum Wr. Wb.

Bapak/Ibu ${student.parentName}, mohon maaf mengganggu waktunya.

Kami dari ${bankAccount.pesantrenName || 'Pondok Pesantren'} ingin mengingatkan, SPP ananda *${student.name}* (${student.className}, NIS ${student.nis}) untuk bulan *${currentMonth}* sebesar *Rp ${obligationAmount.toLocaleString('id-ID')}* masih belum kami terima.

Kalau berkenan, bisa ditransfer ke rekening berikut:
${bankAccount.bankName} ${bankAccount.accountNumber} a.n. ${bankAccount.accountHolder}

Setelah transfer, mohon unggah bukti pembayarannya di aplikasi PondokPay ya, supaya bisa langsung kami verifikasi.

Terima kasih banyak atas perhatiannya, Pak/Bu. Jazakumullahu khairan.
Wassalamu'alaikum Wr. Wb.`;
};

/**
 * Sends the reminder automatically via the Fonnte WhatsApp gateway
 * (server-side, no manual "kirim" tap needed). If Fonnte isn't configured or
 * the request fails for any reason, it automatically falls back to opening
 * wa.me with the message pre-filled so the admin can still send with one tap.
 * Returns which path actually happened, so the caller can show an accurate
 * toast instead of assuming success.
 */
export const sendPaymentReminderWA = async (
  student: Student,
  bankAccount: BankAccount,
  obligationAmount: number = 500000,
  customMessage?: string
): Promise<WaSendResult> => {
  const message = customMessage || buildPaymentReminderTemplate(student, bankAccount, obligationAmount);
  return sendWhatsAppMessage(student.parentWhatsapp, message);
};
