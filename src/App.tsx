import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/landing/LandingPage';
import { WaliDashboard } from './components/wali/WaliDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { BankModal } from './components/bank/BankModal';
import { PaymentFormModal } from './components/payment/PaymentFormModal';
import { PaymentOptionsModal } from './components/payment/PaymentOptionsModal';
import { StrukModal } from './components/struk/StrukModal';
import { NotificationModal } from './components/notification/NotificationModal';
import { Payment, Bill, PaymentType } from './types';
import { Toaster } from 'react-hot-toast';
import { PublicReceiptPage } from './components/struk/PublicReceiptPage';

const MainContent: React.FC = () => {
  const { userSession, activeStudent, bankAccount, paymentTypes } = useApp();

  // Halaman publik struk (dibuka via scan QR di kuitansi) — dicek dari URL,
  // tidak butuh login, dan di-render TERPISAH dari seluruh app supaya data
  // lain (dashboard admin/wali) tidak pernah ikut ter-render ke pengunjung publik.
  const [publicReceiptId, setPublicReceiptId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('struk');
  });

  const closePublicReceipt = () => {
    setPublicReceiptId(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Global Modal States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginTab, setLoginTab] = useState<'WALI' | 'ADMIN'>('WALI');

  const [showBankModal, setShowBankModal] = useState(false);

  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [selectedMonthForPayment, setSelectedMonthForPayment] = useState<string | undefined>(undefined);
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState<string | undefined>(undefined);
  const [selectedSuggestedAmount, setSelectedSuggestedAmount] = useState<number | undefined>(undefined);

  const [viewingStrukPayment, setViewingStrukPayment] = useState<Payment | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'LANDING'>('DASHBOARD');

  const handleOpenLogin = (tab: 'WALI' | 'ADMIN' = 'WALI') => {
    setLoginTab(tab);
    setShowLoginModal(true);
  };

  const handleOpenPayment = (bill?: Bill, month?: string) => {
    setSelectedBillForPayment(bill || null);
    setSelectedMonthForPayment(month);
    setSelectedPaymentTypeId(bill?.paymentTypeId);

    if (bill) {
      // A specific bill already dictates the payment type; skip the chooser.
      setShowPaymentModal(true);
    } else if (userSession.role === 'WALI') {
      // Ad-hoc payment: let the wali santri pick SPP / Rihlah / Koperasi first.
      setShowPaymentOptionsModal(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handleSelectPaymentType = (pt: PaymentType, suggestedAmount?: number) => {
    setSelectedPaymentTypeId(pt.id);
    setSelectedSuggestedAmount(suggestedAmount);
    setShowPaymentOptionsModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (payment: Payment) => {
    setShowPaymentModal(false);
    setViewingStrukPayment(payment);
  };

  // Halaman publik struk dirender lebih dulu & terpisah — pengunjung dari QR
  // code tidak pernah melihat/mengakses dashboard admin/wali sama sekali.
  if (publicReceiptId) {
    return <PublicReceiptPage paymentId={publicReceiptId} onClose={closePublicReceipt} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500 selection:text-white transition-colors duration-200 overflow-hidden">
      
      {/* Sidebar Component */}
      <Sidebar
        onOpenLogin={handleOpenLogin}
        onOpenBank={() => setShowBankModal(true)}
        onOpenPayment={() => handleOpenPayment()}
        onOpenNotifications={() => setShowNotificationModal(true)}
        onNavigateHome={() => setViewMode('DASHBOARD')}
        onNavigateLanding={() => setViewMode('LANDING')}
      />

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden relative">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {viewMode === 'LANDING' || userSession.role === 'GUEST' ? (
            <div className="space-y-4">
              {userSession.role !== 'GUEST' && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => setViewMode('DASHBOARD')}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-emerald-700 transition"
                  >
                    Kembali ke Dashboard
                  </button>
                </div>
              )}
              <LandingPage
                onOpenLogin={handleOpenLogin}
                onOpenBank={() => setShowBankModal(true)}
                onOpenPayment={() => handleOpenPayment()}
              />
            </div>
          ) : userSession.role === 'WALI' && activeStudent ? (
            <WaliDashboard
              student={activeStudent}
              onOpenPayment={(bill, month) => handleOpenPayment(bill, month)}
              onViewStruk={(payment) => setViewingStrukPayment(payment)}
            />
          ) : userSession.role === 'ADMIN' ? (
            <AdminDashboard
              onViewStruk={(payment) => setViewingStrukPayment(payment)}
              onOpenPayment={(bill, month) => handleOpenPayment(bill, month)}
            />
          ) : null}
        </main>

        {/* Footer - Only visible on the Landing Page */}
        {(viewMode === 'LANDING' || userSession.role === 'GUEST') && (
          <Footer
            bankAccount={bankAccount}
            onOpenBank={() => setShowBankModal(true)}
            onOpenLogin={handleOpenLogin}
          />
        )}
      </div>

      {/* MODALS */}
      {showLoginModal && (
        <LoginModal
          initialTab={loginTab}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => setShowLoginModal(false)}
        />
      )}

      {showBankModal && (
        <BankModal
          bankAccount={bankAccount}
          onClose={() => setShowBankModal(false)}
        />
      )}

      {showPaymentOptionsModal && (
        <PaymentOptionsModal
          paymentTypes={paymentTypes}
          breakdown={
            activeStudent?.suggestedBreakdown && activeStudent.suggestedBreakdown.length > 0
              ? activeStudent.suggestedBreakdown
              : bankAccount.defaultPaymentBreakdown || []
          }
          onClose={() => setShowPaymentOptionsModal(false)}
          onSelect={handleSelectPaymentType}
        />
      )}

      {showPaymentModal && (
        <PaymentFormModal
          prefilledStudent={activeStudent}
          prefilledBill={selectedBillForPayment}
          prefilledMonth={selectedMonthForPayment}
          prefilledPaymentTypeId={selectedPaymentTypeId}
          prefilledAmount={selectedSuggestedAmount}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {viewingStrukPayment && (
        <StrukModal
          payment={viewingStrukPayment}
          bankAccount={bankAccount}
          onClose={() => setViewingStrukPayment(null)}
        />
      )}

      {showNotificationModal && (
        <NotificationModal
          onClose={() => setShowNotificationModal(false)}
          onOpenPayment={() => handleOpenPayment()}
        />
      )}

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Toaster position="top-center" />
      <MainContent />
    </AppProvider>
  );
}
