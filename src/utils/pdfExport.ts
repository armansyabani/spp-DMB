import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Payment, BankAccount } from '../types';

/**
 * Export single Struk / Receipt as a PDF file.
 * PDF dibuat sepenuhnya dari teks & vector (jsPDF + autoTable), BUKAN screenshot
 * halaman — supaya tetap tajam & rapi di HP, laptop, dan saat dicetak.
 */
export async function downloadStrukPDF(payment: Payment, bankAccount: BankAccount) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const primaryColor: [number, number, number] = [4, 120, 87]; // Emerald-700
  const darkTextColor: [number, number, number] = [30, 41, 59]; // Slate-800
  const grayColor: [number, number, number] = [100, 116, 139]; // Slate-500

  // QR code — hanya berisi URL menuju halaman struk publik (bukan data sensitif langsung).
  const receiptUrl = `${window.location.origin}${window.location.pathname}?struk=${encodeURIComponent(payment.id)}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(receiptUrl, { width: 240, margin: 1 });
  } catch {
    // Kalau QR gagal dibuat, PDF tetap dilanjutkan tanpa QR (tidak boleh gagal total).
  }

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 148, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(bankAccount.pesantrenName || 'PONDOK PESANTREN DARUL MUKHLASIN', 74, 11, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('KUITANSI PEMBAYARAN', 74, 17, { align: 'center' });

  // Receipt Meta Info
  doc.setTextColor(...darkTextColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BUKTI PEMBAYARAN ELEKTRONIK', 12, 32);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')}`, 136, 32, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(12, 35, 136, 35);

  // Table Data for Receipt
  const rows = [
    ['No. Invoice', payment.invoiceNumber],
    ['No. Transaksi', payment.transactionNumber],
    ['Waktu Bayar', new Date(payment.createdAt).toLocaleString('id-ID')],
    ['Status Pembayaran', payment.status === 'DIVERIFIKASI' ? 'DIVERIFIKASI LUNAS' : payment.status === 'MENUNGGU_VERIFIKASI' ? 'MENUNGGU VERIFIKASI' : payment.status === 'DIBATALKAN' ? 'DIBATALKAN' : 'DITOLAK'],
    ['Nama Santri', `${payment.studentName} (NIS: ${payment.studentNis})`],
    ['Kelas & Asrama', `${payment.className} / ${payment.dormitoryName}`],
    ['Nama Orang Tua', payment.parentName],
    ['Jenis Pembayaran', `${payment.paymentTypeName}${payment.monthYear ? ` (${payment.monthYear})` : ''}`],
    ['Metode Pembayaran', payment.paymentMethod],
    ...(payment.note ? [['Catatan', payment.note]] : []),
    ...(payment.status === 'DIVERIFIKASI' && payment.verifiedBy ? [['Diverifikasi Oleh', payment.verifiedBy]] : []),
  ];

  autoTable(doc, {
    startY: 38,
    margin: { left: 12, right: 12 },
    body: rows,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: darkTextColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: grayColor, cellWidth: 42 },
      1: { fontStyle: 'bold', textColor: darkTextColor },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 100;

  // Amount Highlight Box
  doc.setFillColor(240, 253, 244); // bg-emerald-50
  doc.setDrawColor(187, 247, 208); // border-emerald-200
  doc.roundedRect(12, finalY + 4, 124, 18, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL NOMINAL DIBAYARKAN:', 16, finalY + 11);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rp ${payment.amount.toLocaleString('id-ID')}`, 132, finalY + 14, { align: 'right' });

  // QR Code (kalau berhasil dibuat)
  let footerY = finalY + 30;
  if (qrDataUrl) {
    const qrSize = 24;
    const qrX = 74 - qrSize / 2;
    const qrY = finalY + 28;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text('Scan untuk melihat detail pembayaran', 74, qrY + qrSize + 4, { align: 'center' });
    footerY = qrY + qrSize + 12;
  }

  // Footer Note
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...grayColor);
  doc.text('Kwitansi ini dihasilkan secara otomatis oleh sistem PondokPay dan sah tanpa tanda tangan basah.', 74, footerY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Jazakumullah Khairan Katsiran', 74, footerY + 5, { align: 'center' });

  doc.save(`Struk_PondokPay_${payment.invoiceNumber}.pdf`);
}

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  filterTypeLabel?: string;
  pesantrenName: string;
  whatsappAdmin: string;
}

/**
 * Export filtered payment list as a PDF report for Admin & Wali
 */
export function downloadTransactionsPDF(payments: Payment[], options: PDFReportOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [4, 120, 87]; // Emerald-700
  const darkTextColor: [number, number, number] = [30, 41, 59];
  const grayColor: [number, number, number] = [100, 116, 139];

  // Title & Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 297, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(options.pesantrenName || 'PONDOK PESANTREN DARUL MUKHLASIN', 148.5, 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`LAPORAN TRANSAKSI PEMBAYARAN PONDOKPAY - ${options.title.toUpperCase()}`, 148.5, 16, { align: 'center' });

  // Subheader info
  doc.setTextColor(...darkTextColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kategori Export: ${options.filterTypeLabel || 'Semua Data'}`, 14, 28);
  doc.text(`Total Transaksi: ${payments.length} Item`, 14, 33);

  const verifiedPaymentsOnly = payments.filter((p) => p.status === 'DIVERIFIKASI');
  const totalVerified = verifiedPaymentsOnly.reduce((acc, p) => acc + p.amount, 0);

  doc.text(`Total Terverifikasi (Lunas): Rp ${totalVerified.toLocaleString('id-ID')}`, 283, 28, { align: 'right' });
  doc.text(`Dicetak Pada: ${new Date().toLocaleString('id-ID')}`, 283, 33, { align: 'right' });

  // Line
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 36, 283, 36);

  // Table Data
  const tableRows = payments.map((p, index) => [
    (index + 1).toString(),
    p.invoiceNumber,
    new Date(p.createdAt).toLocaleDateString('id-ID'),
    p.studentNis,
    p.studentName,
    `${p.className} (${p.dormitoryName})`,
    `${p.paymentTypeName}${p.monthYear ? ` - ${p.monthYear}` : ''}`,
    p.paymentMethod,
    `Rp ${p.amount.toLocaleString('id-ID')}`,
    p.status.replace('_', ' '),
  ]);

  // Baris ringkasan TOTAL memakai nominal yang SUDAH TERVERIFIKASI saja
  // (bukan sekadar menjumlah semua baris) — supaya transaksi yang masih
  // menunggu verifikasi, ditolak, atau dibatalkan tidak ikut membesarkan
  // angka "pendapatan" di laporan (ini yang bikin laporan sebelumnya terasa
  // tidak akurat / acak).
  tableRows.push([
    '',
    'TOTAL (LUNAS SAJA)',
    '',
    '',
    `${verifiedPaymentsOnly.length} dari ${payments.length} Transaksi`,
    '',
    '',
    '',
    `Rp ${totalVerified.toLocaleString('id-ID')}`,
    '',
  ]);

  autoTable(doc, {
    startY: 38,
    margin: { left: 14, right: 14 },
    head: [['No', 'Invoice', 'Tanggal', 'NIS', 'Nama Santri', 'Kelas/Asrama', 'Jenis Pembayaran', 'Metode', 'Nominal', 'Status']],
    body: tableRows,
    theme: 'grid',
    styles: {
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkTextColor,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 28 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 20 },
      4: { fontStyle: 'bold', cellWidth: 42 },
      5: { cellWidth: 35 },
      6: { cellWidth: 45 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 32 },
      9: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
    },
    didParseCell: (data) => {
      // Highlight summary row
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 253, 244];
        data.cell.styles.textColor = primaryColor;
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 160;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...grayColor);
  doc.text(`Dokumen ini di-generate otomatis oleh Sistem Administrasi Keuangan PondokPay (${options.pesantrenName}).`, 148.5, finalY + 10, { align: 'center' });

  const filename = `Laporan_PondokPay_${options.filterTypeLabel ? options.filterTypeLabel.replace(/[^a-zA-Z0-9]/g, '_') : 'Transaksi'}_${Date.now()}.pdf`;
  doc.save(filename);
}
