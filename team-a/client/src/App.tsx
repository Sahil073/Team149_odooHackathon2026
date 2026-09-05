import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { QuoteDrawer } from './components/common/QuoteDrawer';

import { AuthScreen } from './pages/auth/AuthScreen';
import { Dashboard } from './pages/dashboard/Dashboard';
import { QuotationsPage } from './pages/quotations/QuotationsPage';
import { QuotationBuilderPage } from './pages/quotations/QuotationBuilderPage';
import { QuotationDetailPage } from './pages/quotations/QuotationDetailPage';
import { ApprovalsPage } from './pages/approvals/ApprovalsPage';
import { ApprovalDetailPage } from './pages/approvals/ApprovalDetailPage';
import { ApprovalConfigPage } from './pages/approvals/ApprovalConfigPage';
import { FulfillmentPage } from './pages/fulfillment/FulfillmentPage';
import { FulfillmentDetailPage } from './pages/fulfillment/FulfillmentDetailPage';
import { WarehouseSetupPage } from './pages/fulfillment/WarehouseSetupPage';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage';
import { SubscriptionDetailPage } from './pages/subscriptions/SubscriptionDetailPage';
import { SubscriptionSetupPage } from './pages/subscriptions/SubscriptionSetupPage';
import { InvoicesPage } from './pages/billing/InvoicesPage';
import { InvoiceDetailPage } from './pages/billing/InvoiceDetailPage';
import { ProductsPage, initialProducts } from './pages/products/ProductsPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { DealHealthPage } from './pages/governance/DealHealthPage';
import { AuditTrailPage } from './pages/governance/AuditTrailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { CustomerPortalPage } from './pages/customer/CustomerPortalPage';

import { approvals, fulfillmentOrders, quotes, subscriptions } from './data/demoData';
import {
  clearToken,
  getProducts,
  getStoredUser,
  hasToken,
  login,
  saveToken,
  saveUser,
  signup,
  type ApiProduct,
} from './lib/api';
import type {
  ApprovalItem,
  ApprovalStatus,
  FulfillmentOrder,
  FulfillmentStatus,
  Invoice,
  InvoiceStatus,
  Product,
  Quote,
  QuoteStatus,
  Role,
  Screen,
  Subscription,
  SubscriptionStatus,
} from './types';

function App() {
  // Clear any stale hardcoded demo sessions from older builds
  const _initialUser = getStoredUser();
  if (_initialUser && _initialUser.name === 'Pawan Kumar') {
    clearToken();
  }

  const [authenticated, setAuthenticated] = useState(hasToken);
  const storedUser = getStoredUser();
  const [userName, setUserName] = useState(storedUser?.name || 'User');
  const [role, setRole] = useState<Role>(storedUser ? fromApiRole(storedUser.role) : 'sales-rep');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | QuoteStatus>('All');
  const [listView, setListView] = useState<'board' | 'table'>('board');
  const [quotesList, setQuotesList] = useState<Quote[]>(quotes);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedDetailQuote, setSelectedDetailQuote] = useState<Quote | null>(null);
  const [approvalRows, setApprovalRows] = useState(approvals);
  const [approvalFilter, setApprovalFilter] = useState<'All' | ApprovalStatus>('All');
  const [approvalSearch, setApprovalSearch] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [fulfillmentRows, setFulfillmentRows] = useState(fulfillmentOrders);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'All' | FulfillmentStatus>('All');
  const [selectedFulfillment, setSelectedFulfillment] = useState<FulfillmentOrder | null>(null);
  const [subscriptionRows, setSubscriptionRows] = useState(subscriptions);
  const [subscriptionFilter, setSubscriptionFilter] = useState<'All' | SubscriptionStatus>('All');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [invoiceFilter, setInvoiceFilter] = useState<'All' | InvoiceStatus>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProducts[0]);
  const [portalStatus, setPortalStatus] = useState<'Under negotiation' | 'Confirmed'>('Under negotiation');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!authenticated) return;
    getProducts()
      .then(({ data }) => setProductsList(data.map(toProduct)))
      .catch(() => notifyPortal('The backend is unavailable. Showing local product data.'));
  }, [authenticated]);

  const filteredQuotes = useMemo(() => {
    return quotesList.filter((quote) => {
      const matchesStatus = statusFilter === 'All' || quote.status === statusFilter;
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        quote.customer.toLowerCase().includes(query) ||
        quote.id.toLowerCase().includes(query) ||
        quote.owner.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [quotesList, search, statusFilter]);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');
    const enteredName = authMode === 'signup'
      ? `${String(form.get('firstName') || '')} ${String(form.get('lastName') || '')}`.trim()
      : '';

    try {
      const response = authMode === 'login'
        ? await login(email, password)
        : await signup(enteredName, email, password, toApiRole(role));
      saveToken(response.token);
      saveUser(response.user);
      setUserName(response.user.name);
      setRole(fromApiRole(response.user.role));
      setAuthenticated(true);
      setAuthMessage('');
      setScreen('dashboard');
    } catch {
      // Backend unavailable — fall back to local/demo mode using whatever the user typed
      const localName = authMode === 'signup'
        ? (enteredName || email.split('@')[0])
        : (email.split('@')[0]);
      const displayName = localName
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const fakeUser = { id: 'local', name: displayName, email, role: toApiRole(role) } as const;
      saveToken('offline-demo');
      saveUser(fakeUser);
      setUserName(displayName);
      setRole(role);
      setAuthenticated(true);
      setAuthMessage('');
      setScreen('dashboard');
      notifyPortal('Running in demo mode — backend is offline. Your workspace is ready.');
    }
  }

  function createQuotation() {
    setScreen('quotation-builder');
  }

  function openQuotationDetail(quoteToOpen: Quote) {
    setSelectedDetailQuote(quoteToOpen);
    setScreen('quotation-detail');
  }

  function openApproval(approval: ApprovalItem) {
    setSelectedApproval(approval);
    setScreen('approval-detail');
  }

  function updateApproval(status: ApprovalStatus) {
    if (!selectedApproval) return;
    const updated = {
      ...selectedApproval,
      status,
      stage: status === 'Approved' ? ('Auto-approved' as const) : selectedApproval.stage,
    };
    setApprovalRows((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
    setSelectedApproval(updated);
    const message =
      status === 'Approved'
        ? `${updated.id} approved and released to fulfillment.`
        : status === 'Rejected'
        ? `${updated.id} rejected and removed from the approval queue.`
        : `${updated.id} returned for revision.`;
    notifyPortal(message);
    setScreen('approvals');
  }

  function openFulfillment(order: FulfillmentOrder) {
    setSelectedFulfillment(order);
    setScreen('fulfillment-detail');
  }

  function acceptSuggestedSplit() {
    if (!selectedFulfillment) return;
    const updated = { ...selectedFulfillment, status: 'Ready' as const };
    setFulfillmentRows((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
    setSelectedFulfillment(updated);
    notifyPortal(`${updated.id} split accepted. Fulfillment is ready to release.`);
  }

  function openSubscription(subscription: Subscription) {
    setSelectedSubscription(subscription);
    setScreen('subscription-detail');
  }

  function cancelSubscription() {
    if (!selectedSubscription) return;
    const updated = { ...selectedSubscription, status: 'Cancelled' as const, nextBill: '—' };
    setSubscriptionRows((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
    setSelectedSubscription(updated);
    notifyPortal(`${updated.customer} subscription cancelled. Future billing is paused.`);
  }

  function handleAddProduct(newProduct: Product) {
    setProductsList((prev) => [newProduct, ...prev]);
  }

  function handleSaveProduct(updatedProduct: Product) {
    setProductsList((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    setSelectedProduct(updatedProduct);
  }

  function handleReloadData() {
    setQuotesList([...quotes]);
    setApprovalRows([...approvals]);
    setFulfillmentRows([...fulfillmentOrders]);
    setSubscriptionRows([...subscriptions]);
    getProducts()
      .then(({ data }) => setProductsList(data.map(toProduct)))
      .then(() => notifyPortal('Pricing, live stock, and approval data reloaded from backend.'))
      .catch(() => notifyPortal('Unable to reload backend product data.'));
  }

  function handleNavigateToBackend() {
    setScreen('products');
  }

  function handleLogout() {
    clearToken();
    setAuthenticated(false);
    setSelectedQuote(null);
    setSelectedDetailQuote(null);
  }

  function toApiRole(roleToMap: Role): 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'ADMIN' {
    if (roleToMap === 'manager') return 'SALES_MANAGER';
    if (roleToMap === 'finance') return 'FINANCE';
    return roleToMap === 'admin' ? 'ADMIN' : 'SALES_REP';
  }

  function fromApiRole(apiRole: string): Role {
    if (apiRole === 'SALES_MANAGER') return 'manager';
    if (apiRole === 'FINANCE') return 'finance';
    if (apiRole === 'ADMIN') return 'admin';
    if (apiRole === 'customer') return 'customer';
    return 'sales-rep';
  }

  function handleCustomerProposal(discount: number) {
    if (discount > 15) {
      // Exceeds Gold tier ceiling (15%) -> Re-enters approval flow!
      setQuotesList((prev) =>
        prev.map((q) => (q.id === 'Q-1042' ? { ...q, status: 'Pending approval' } : q))
      );
      setApprovalRows((prev) => [
        {
          id: 'Q-1042',
          customer: 'Acme Corp',
          initials: 'AC',
          risk: 'High',
          stage: 'Sales Manager',
          assignedTo: 'M. Shah',
          status: 'Pending',
          submitted: 'Just now',
          discount: `${discount}%`,
          customerTier: 'Gold',
        },
        ...prev.filter((a) => a.id !== 'Q-1042'),
      ]);
      notifyPortal(
        `Counter proposal submitted (${discount}% discount). Exceeds Gold ceiling (15%), so quotation automatically re-entered the approval flow.`
      );
    } else {
      notifyPortal(`Counter proposal (${discount}% discount) submitted to your sales rep.`);
    }
  }

  function notifyPortal(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3800);
  }

  if (!authenticated) {
    return (
      <AuthScreen
        role={role}
        authMode={authMode}
        authMessage={authMessage}
        onRoleChange={(nextRole) => {
          setRole(nextRole);
          setAuthMessage('');
        }}
        onAuthModeChange={(nextMode) => {
          setAuthMode(nextMode);
          setAuthMessage('');
        }}
        onSubmit={handleAuth}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        screen={screen}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(nextScreen) => setScreen(nextScreen)}
        role={role}
        userName={userName}
      />
      <div className="app-main">
        <Topbar
          screen={screen}
          onOpenMenu={() => setSidebarOpen(true)}
          onNewQuotation={createQuotation}
          onReloadData={handleReloadData}
          onNavigateToBackend={handleNavigateToBackend}
          onLogout={handleLogout}
          role={role}
          userName={userName}
        />
        <main className="page-content">
          {screen === 'dashboard' ? (
            <Dashboard
              onNavigate={setScreen}
              onOpenQuote={setSelectedQuote}
              onNewQuotation={createQuotation}
              userName={userName}
            />
          ) : screen === 'quotations' ? (
            <QuotationsPage
              quotes={filteredQuotes}
              search={search}
              statusFilter={statusFilter}
              listView={listView}
              onSearch={setSearch}
              onStatusFilter={setStatusFilter}
              onListView={setListView}
              onOpenQuote={setSelectedQuote}
              onNewQuotation={createQuotation}
            />
          ) : screen === 'quotation-detail' ? (
            <QuotationDetailPage
              quote={selectedDetailQuote || quotesList[0]}
              onBack={() => setScreen('quotations')}
              onEditInBuilder={() => setScreen('quotation-builder')}
              onNotify={notifyPortal}
            />
          ) : screen === 'approvals' ? (
            <ApprovalsPage
              approvals={approvalRows}
              filter={approvalFilter}
              search={approvalSearch}
              onFilter={setApprovalFilter}
              onSearch={setApprovalSearch}
              onOpen={openApproval}
            />
          ) : screen === 'approval-detail' && selectedApproval ? (
            <ApprovalDetailPage
              approval={selectedApproval}
              canDecide={role !== 'sales-rep'}
              onBack={() => setScreen('approvals')}
              onApprove={() => updateApproval('Approved')}
              onReturn={() => updateApproval('Returned')}
              onReject={() => updateApproval('Rejected')}
            />
          ) : screen === 'fulfillment' ? (
            <FulfillmentPage
              orders={fulfillmentRows}
              filter={fulfillmentFilter}
              onFilter={setFulfillmentFilter}
              onOpen={openFulfillment}
            />
          ) : screen === 'fulfillment-detail' && selectedFulfillment ? (
            <FulfillmentDetailPage
              order={selectedFulfillment ?? fulfillmentRows[0]}
              onBack={() => setScreen('fulfillment')}
              onAccept={acceptSuggestedSplit}
              onManualOverride={() =>
                notifyPortal('Manual split editing will be available in the next fulfillment pass.')
              }
            />
          ) : screen === 'subscriptions' ? (
            <SubscriptionsPage
              subscriptions={subscriptionRows}
              filter={subscriptionFilter}
              onFilter={setSubscriptionFilter}
              onOpen={openSubscription}
              onNewPlan={() => notifyPortal('Plan creation is reserved for Admin workspace access.')}
            />
          ) : screen === 'subscription-detail' && selectedSubscription ? (
            <SubscriptionDetailPage
              subscription={selectedSubscription}
              onBack={() => setScreen('subscriptions')}
              onCancel={cancelSubscription}
              onModify={() => notifyPortal('Subscription modification is ready for the billing workflow.')}
            />
          ) : screen === 'invoices' ? (
            <InvoicesPage
              filter={invoiceFilter}
              onFilter={setInvoiceFilter}
              onOpen={(invoice) => {
                setSelectedInvoice(invoice);
                setScreen('invoice-detail');
              }}
            />
          ) : screen === 'invoice-detail' && selectedInvoice ? (
            <InvoiceDetailPage
              invoice={selectedInvoice}
              onBack={() => setScreen('invoices')}
              onRecordPayment={() =>
                notifyPortal(`${selectedInvoice.id} payment recorded and reconciliation updated.`)
              }
            />
          ) : screen === 'quotation-builder' ? (
            <QuotationBuilderPage
              onBack={() => setScreen('quotations')}
              onSave={() => notifyPortal('Quotation saved as draft.')}
              onSubmit={() => notifyPortal('Quotation submitted to the approval chain.')}
              onConfirm={() => notifyPortal('Quotation confirmed and moved to fulfillment.')}
            />
          ) : screen === 'deal-health' ? (
            <DealHealthPage
              onOpenQuote={() => setSelectedQuote(quotesList[4])}
              onNotify={notifyPortal}
            />
          ) : screen === 'reports' ? (
            <ReportsPage onNotify={notifyPortal} />
          ) : screen === 'products' ? (
            <ProductsPage
              productsList={productsList}
              onOpenProduct={(prod) => {
                setSelectedProduct(prod);
                setScreen('product-detail');
              }}
              onAddProduct={handleAddProduct}
              onNotify={notifyPortal}
            />
          ) : screen === 'product-detail' ? (
            <ProductDetailPage
              product={selectedProduct || productsList[0]}
              onBack={() => setScreen('products')}
              onSaveProduct={handleSaveProduct}
              onNotify={notifyPortal}
            />
          ) : screen === 'approval-config' ? (
            <ApprovalConfigPage onNotify={notifyPortal} />
          ) : screen === 'warehouse-setup' ? (
            <WarehouseSetupPage onNotify={notifyPortal} />
          ) : screen === 'subscription-setup' ? (
            <SubscriptionSetupPage onNotify={notifyPortal} />
          ) : screen === 'audit-trail' ? (
            <AuditTrailPage />
          ) : (
            <CustomerPortalPage
              status={portalStatus}
              onSubmitRequest={(discount) => handleCustomerProposal(discount)}
              onConfirm={() => {
                setPortalStatus('Confirmed');
                notifyPortal('Quotation confirmed. The sales team has been notified.');
              }}
            />
          )}
        </main>
      </div>
      {selectedQuote && (
        <QuoteDrawer
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onOpenQuotation={openQuotationDetail}
        />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <button onClick={() => setToast('')} aria-label="Dismiss notification">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function toProduct(product: ApiProduct): Product {
  const category = product.category === 'SUBSCRIPTIONS' ? 'Subscription' : product.category[0] + product.category.slice(1).toLowerCase();
  const numericPrice = Number(product.price);
  return {
    id: product.id,
    name: product.name,
    category,
    variantsText: product.variants.length ? `${product.variants.length} variant(s)` : '—',
    price: `$${numericPrice.toLocaleString()}`,
    numericPrice,
    unit: product.unit,
    tax: `${product.taxPct}%`,
    status: 'Active',
    description: product.description || undefined,
    subscription: product.category === 'SUBSCRIPTIONS' ? 'Yes' : 'No',
    recurring: product.category === 'SUBSCRIPTIONS' ? 'Monthly' : undefined,
    quantityOnHand: product.stock?.reduce((total, item) => total + item.quantity, 0) || 0,
    variantsList: product.variants.map((variant) => ({
      id: variant.id,
      attribute: variant.attribute,
      values: variant.value,
      extraPrice: `$${Number(variant.extraPrice).toLocaleString()}`,
    })),
    pricelistsList: [],
  };
}

export default App;
