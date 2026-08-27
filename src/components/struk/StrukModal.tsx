import React, { useEffect, useState, useRef } from 'react';
import { Payment, BankAccount } from '../../types';
import { X, Download, Printer, CheckCircle2, Clock, AlertTriangle, Copy, Building2, Share2, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';
import { downloadStrukPDF } from '../../utils/pdfExport';
import { formatWhatsAppNumber } from '../../utils/reminderHelper';

interface StrukModalProps {
  payment: Payment | null;
  bankAccount: BankAccount;
  onClose: () => void;
}

export const StrukModal: React.FC<StrukModalProps> = ({ payment, bankAccount, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (payment) {
      // PENTING (keamanan): QR code HANYA berisi URL menuju halaman struk publik
      // (berbasis ID pembayaran), BUKAN data sensitif (nominal/NIS) secara langsung.
      // Siapa pun yang scan hanya diarahkan ke halaman konfirmasi pembayaran ini.
      const receiptUrl = `${window.location.origin}${window.location.pathname}?struk=${encodeURIComponent(payment.id)}`;
      QRCode.toDataURL(receiptUrl, { width: 240, margin: 1 }, (err, url) => {
        if (!err && url) setQrCodeUrl(url);
      });
    }
  }, [payment]);

  if (!payment) return null;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Pembayaran - ${payment.invoiceNumber}</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 20px; color: #1e293b; }
            .struk-card { max-width: 500px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 24px; border-radius: 12px; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: bold; color: #047857; margin: 0; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .label { color: #64748b; }
            .value { font-weight: 600; text-align: right; }
            .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; margin: 16px 0; text-align: center; }
            .amount { font-size: 22px; font-weight: 800; color: #15803d; }
            .footer { font-size: 11px; text-align: center; color: #94a3b8; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
            @media print {
              body { padding: 0; }
              .struk-card { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="struk-card">
            <div class="header">
              <div class="title">PONDOK PESANTREN DARUL MUKHLASIN</div>
              <div class="subtitle">Sistem Pembayaran Resm PondokPay</div>
              <div style="font-size:11px; color:#475569; margin-top:4px;">Jl. Pesantren No. 01 | Admin WA: ${bankAccount.whatsappAdmin}</div>
            </div>

            <div class="row"><span class="label">No. Invoice:</span><span class="value">${payment.invoiceNumber}</span></div>
            <div class="row"><span class="label">No. Transaksi:</span><span class="value">${payment.transactionNumber}</span></div>
            <div class="row"><span class="label">Tanggal & Waktu:</span><span class="value">${new Date(payment.createdAt).toLocaleString('id-ID')}</span></div>
            <div class="row"><span class="label">Status:</span><span class="value" style="color: ${payment.status === 'DIVERIFIKASI' ? '#15803d' : payment.status === 'MENUNGGU_VERIFIKASI' ? '#d97706' : '#b91c1c'};">${payment.status.replace('_', ' ')}</span></div>

            <hr style="border: 0; border-top: 1px dashed #e2e8f0; margin: 12px 0;" />

            <div class="row"><span class="label">Nama Santri:</span><span class="value">${payment.studentName} (${payment.studentNis})</span></div>
            <div class="row"><span class="label">Kelas / Asrama:</span><span class="value">${payment.className} / ${payment.dormitoryName}</span></div>
            <div class="row"><span class="label">Wali Santri:</span><span class="value">${payment.parentName}</span></div>
            <div class="row"><span class="label">Jenis Pembayaran:</span><span class="value">${payment.paymentTypeName}${payment.monthYear ? ` (${payment.monthYear})` : ''}</span></div>
            <div class="row"><span class="label">Metode Pembayaran:</span><span class="value">${payment.paymentMethod}</span></div>

            <div class="total-box">
              <div class="label" style="font-size: 12px; font-weight:600;">TOTAL PEMBAYARAN</div>
              <div class="amount">Rp ${payment.amount.toLocaleString('id-ID')}</div>
            </div>

            <div style="text-align: center; margin-top: 12px;">
              ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width: 100px; height: 100px;" />` : ''}
              <div style="font-size: 10px; color: #94a3b8; margin-top:4px;">Struk ini merupakan bukti pembayaran elektronik yang sah.</div>
            </div>

            <div class="footer">
              Terima Kasih Atas Pembayaran Anda • Jazakumullah Khairan Katsiran<br/>
              PondokPay Production Ready System
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyInvoice = () => {
    navigator.clipboard.writeText(payment.invoiceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const receiptUrl = `${window.location.origin}${window.location.pathname}?struk=${encodeURIComponent(payment.id)}`;

  const shareText = `Kuitansi Pembayaran ${bankAccount.pesantrenName || 'PondokPay'}\nSantri: ${payment.studentName} (${payment.studentNis})\nJenis: ${payment.paymentTypeName}${payment.monthYear ? ` (${payment.monthYear})` : ''}\nTotal: Rp ${payment.amount.toLocaleString('id-ID')}\nStatus: ${payment.status === 'DIVERIFIKASI' ? 'LUNAS TERVERIFIKASI' : payment.status === 'MENUNGGU_VERIFIKASI' ? 'Menunggu Verifikasi' : 'Ditolak'}\n\nLihat detail: ${receiptUrl}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Kuitansi ${payment.invoiceNumber}`, text: shareText, url: receiptUrl });
      } catch {
        // Pengguna membatalkan share sheet — tidak perlu ditampilkan sebagai error.
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Tautan & ringkasan kuitansi disalin ke clipboard!');
    }
  };

  const handleSendWhatsApp = () => {
    const phone = formatWhatsAppNumber(payment.parentWhatsapp);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-base tracking-wide">Kwitansi & Struk Resmi</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Struk Card */}
        <div className="p-6 bg-slate-50/50" ref={printRef}>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative">
            
            {/* Watermark / Status Badge */}
            <div className="text-center pb-4 border-b border-dashed border-slate-200">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mb-2">
                {payment.status === 'DIVERIFIKASI' ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : payment.status === 'MENUNGGU_VERIFIKASI' ? (
                  <Clock className="w-7 h-7 text-amber-600" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">PONDOK PESANTREN DARUL MUKHLASIN</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Sistem Pembayaran PondokPay</p>
              
              <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {payment.status === 'DIVERIFIKASI' && <span className="text-emerald-700">✓ DIVERIFIKASI LUNAS</span>}
                {payment.status === 'MENUNGGU_VERIFIKASI' && <span className="text-amber-700">⏳ MENUNGGU VERIFIKASI</span>}
                {payment.status === 'DITOLAK' && <span className="text-red-700">✕ PEMBAYARAN DITOLAK</span>}
              </div>
            </div>

            {/* Details Table */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>No. Invoice:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                  {payment.invoiceNumber}
                  <button onClick={handleCopyInvoice} className="p-0.5 hover:text-emerald-600" title="Salin Invoice">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>No. Transaksi:</span>
                <span className="font-mono font-semibold text-slate-800">{payment.transactionNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Waktu Pembayaran:</span>
                <span className="font-medium text-slate-800">{new Date(payment.createdAt).toLocaleString('id-ID')}</span>
              </div>

              <hr className="border-t border-dashed border-slate-200 my-2" />

              <div className="flex justify-between text-slate-600">
                <span>Nama Santri:</span>
                <span className="font-bold text-slate-900">{payment.studentName} ({payment.studentNis})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kelas & Asrama:</span>
                <span className="font-medium text-slate-800">{payment.className} • {payment.dormitoryName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Nama Orang Tua:</span>
                <span className="font-medium text-slate-800">{payment.parentName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Jenis Pembayaran:</span>
                <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  {payment.paymentTypeName}{payment.monthYear ? ` (${payment.monthYear})` : ''}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode:</span>
                <span className="font-medium text-slate-800">{payment.paymentMethod}</span>
              </div>
              {payment.status === 'DIVERIFIKASI' && payment.verifiedBy && (
                <div className="flex justify-between text-slate-600">
                  <span>Diverifikasi Oleh:</span>
                  <span className="font-medium text-slate-800">{payment.verifiedBy}</span>
                </div>
              )}

              {payment.proofUrl && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-500 block mb-1">Bukti Transfer:</span>
                  <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={payment.proofUrl} alt="Bukti Transfer" className="h-20 w-full object-cover rounded-lg border border-slate-200 hover:opacity-90 transition" />
                  </a>
                </div>
              )}

              {/* Total Amount Box */}
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-center shadow-sm">
                <span className="text-[10px] font-semibold tracking-wider uppercase opacity-90 block">TOTAL DIBAYARKAN</span>
                <span className="text-2xl font-black tracking-tight">Rp {payment.amount.toLocaleString('id-ID')}</span>
              </div>

              {/* QR Code & Footer */}
              <div className="pt-3 text-center space-y-1">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code Detail Pembayaran" className="w-20 h-20 mx-auto border p-1 rounded-lg bg-white" />
                )}
                <p className="text-[10px] text-slate-400 font-medium">Scan untuk melihat detail pembayaran</p>
                <p className="text-[10px] text-slate-500 font-semibold italic">Jazakumullah Khairan Katsiran</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 justify-end">
          {copied && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold self-center mr-auto">✓ Invoice Tersalin!</span>
          )}
          <button
            onClick={() => downloadStrukPDF(payment, bankAccount)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-bold hover:from-emerald-700 hover:to-teal-800 transition shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:brightness-95 transition shadow-sm active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-600 transition shadow-sm active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            Bagikan
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Cetak Struk
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
