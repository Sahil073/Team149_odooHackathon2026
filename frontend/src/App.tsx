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
import { ProductsPage } from './pages/products/ProductsPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { DealHealthPage } from './pages/governance/DealHealthPage';
import { AuditTrailPage } from './pages/governance/AuditTrailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { CustomerPortalPage } from './pages/customer/CustomerPortalPage';

import { formatDisplayName } from './lib/utils';
import type { NotificationItem } from './components/common/NotificationsPopover';

import {
  clearToken,
  getCurrentUser,
  hasToken,
  login,
  portalLogin,
  saveToken,
  signup,
  getQuotations,
  createQuotation as apiCreateQuotation,
  updateQuotationLines as apiUpdateQuotationLines,
  submitQuotation as apiSubmitQuotation,
  confirmQuotation as apiConfirmQuotation,
  deleteQuotation as apiDeleteQuotation,
  getApprovals,
  approveQuotation,
  rejectQuotation,
  returnQuotation,
  getFulfillmentOrders,
  suggestSplit as apiSuggestSplit,
  acceptSplit as apiAcceptSplit,
  getSubscriptions,
  updateSubscriptionStatus as apiUpdateSubscriptionStatus,
  getInvoices,
  recordPayment as apiRecordPayment,
  getProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
  getCustomers,
  getWarehouses,
  createWarehouse as apiCreateWarehouse,
  getSubscriptionPlans,
  createSubscriptionPlan as apiCreateSubscriptionPlan,
  getDealHealthFlags,
  triggerDealHealthScan,
  getAuditLogs,
  getPortalQuotations,
  submitPortalNegotiation as apiSubmitPortalNegotiation,
  confirmPortalQuotation as apiConfirmPortalQuotation,
  toQuote,
  toApprovalItem,
  toFulfillmentOrder,
  toSubscription,
  toInvoice,
  toProduct,
  toDealHealthFlag,
  toAuditLog,
} from './lib/api';

import type {
  ApprovalItem,
  ApprovalStatus,
  AuditLogItem,
  Customer,
  DealHealthFlagItem,
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
  SubscriptionPlanItem,
  SubscriptionStatus,
  Warehouse,
} from './types';

function App() {
  const [authenticated, setAuthenticated] = useState(hasToken);
  const [role, setRole] = useState<Role>('sales-rep');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('dealflow.userName') || 'Team';
  });
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | QuoteStatus>('All');
  const [listView, setListView] = useState<'board' | 'table'>('board');

  // Database-backed state
  const [quotesList, setQuotesList] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedDetailQuote, setSelectedDetailQuote] = useState<Quote | null>(null);
  const [approvalRows, setApprovalRows] = useState<ApprovalItem[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<'All' | ApprovalStatus>('All');
  const [approvalSearch, setApprovalSearch] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [fulfillmentRows, setFulfillmentRows] = useState<FulfillmentOrder[]>([]);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'All' | FulfillmentStatus>('All');
  const [selectedFulfillment, setSelectedFulfillment] = useState<FulfillmentOrder | null>(null);
  const [subscriptionRows, setSubscriptionRows] = useState<Subscription[]>([]);
  const [subscriptionFilter, setSubscriptionFilter] = useState<'All' | SubscriptionStatus>('All');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState<'All' | InvoiceStatus>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [warehousesList, setWarehousesList] = useState<Warehouse[]>([]);
  const [plansList, setPlansList] = useState<SubscriptionPlanItem[]>([]);
  const [dealHealthFlags, setDealHealthFlags] = useState<DealHealthFlagItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [portalStatus, setPortalStatus] = useState<'Under negotiation' | 'Confirmed'>('Under negotiation');
  const [portalCustomerId, setPortalCustomerId] = useState<string | null>(null);
  const [portalQuotations, setPortalQuotations] = useState<import('./lib/api').ApiQuotation[]>([]);
  const [portalConfirmedIds, setPortalConfirmedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  const loadAllData = async () => {
    if (!authenticated) return;
    try {
      const [
        quotesRes,
        approvalsRes,
        fulfillmentRes,
        subsRes,
        invoicesRes,
        productsRes,
        customersRes,
        warehousesRes,
        plansRes,
        healthRes,
        auditRes,
      ] = await Promise.allSettled([
        getQuotations(),
        getApprovals(),
        getFulfillmentOrders(),
        getSubscriptions(),
        getInvoices(),
        getProducts(),
        getCustomers(),
        getWarehouses(),
        getSubscriptionPlans(),
        getDealHealthFlags(),
        getAuditLogs(),
      ]);

      if (quotesRes.status === 'fulfilled' && quotesRes.value.data) {
        setQuotesList(quotesRes.value.data.map(toQuote));
      }
      if (approvalsRes.status === 'fulfilled' && approvalsRes.value.data) {
        setApprovalRows(approvalsRes.value.data.map(toApprovalItem));
      }
      if (fulfillmentRes.status === 'fulfilled' && fulfillmentRes.value.data) {
        setFulfillmentRows(fulfillmentRes.value.data.map(toFulfillmentOrder));
      }
      if (subsRes.status === 'fulfilled' && subsRes.value.data) {
        setSubscriptionRows(subsRes.value.data.map(toSubscription));
      }
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.data) {
        setInvoicesList(invoicesRes.value.data.map(toInvoice));
      }
      if (productsRes.status === 'fulfilled' && productsRes.value.data) {
        const prods = productsRes.value.data.map(toProduct);
        setProductsList(prods);
        if (prods.length > 0 && !selectedProduct) {
          setSelectedProduct(prods[0]);
        }
      }
      if (customersRes.status === 'fulfilled' && customersRes.value.data) {
        setCustomersList(customersRes.value.data);
      }
      if (warehousesRes.status === 'fulfilled' && warehousesRes.value.data) {
        setWarehousesList(warehousesRes.value.data);
      }
      if (plansRes.status === 'fulfilled' && plansRes.value.data) {
        setPlansList(plansRes.value.data);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.data) {
        setDealHealthFlags(healthRes.value.data.map(toDealHealthFlag));
      }
      if (auditRes.status === 'fulfilled' && auditRes.value.data) {
        setAuditLogs(auditRes.value.data.map(toAuditLog));
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadAllData();
      getCurrentUser()
        .then((res) => {
          if (res?.data?.name && !['usr-demo', 'usr-demo-new', 'Demo User', 'DEMO USER'].includes(res.data.name)) {
            setUserName(res.data.name);
            localStorage.setItem('dealflow.userName', res.data.name);
          }
        })
        .catch(() => { });
    }
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

  const dynamicNotifications = useMemo((): NotificationItem[] => {
    const items: NotificationItem[] = [];

    // Approvals pending — shown to managers/finance/admin
    if (role !== 'sales-rep' && role !== 'customer') {
      const pending = approvalRows.filter((a) => a.status === 'Pending');
      pending.slice(0, 2).forEach((a) => {
        items.push({
          id: `dyn-approval-${a.id}`,
          title: 'Quotation Approval Required',
          message: `${a.customer} · ${a.id} — ${a.discount} discount, ${a.risk} risk. Assigned to ${a.assignedTo}.`,
          timestamp: a.submitted,
          read: false,
          type: 'approval',
          screen: 'approvals',
        });
      });
    }

    // Deal health flags — shown to all staff
    if (role !== 'customer') {
      const unresolved = dealHealthFlags.filter((f) => !f.resolved);
      unresolved.slice(0, 2).forEach((f) => {
        items.push({
          id: `dyn-health-${f.id}`,
          title: f.severity === 'HIGH' ? '🔴 Critical Deal Health Alert' : '⚠️ Deal Health Warning',
          message: `${f.deal}: ${f.issue}`,
          timestamp: f.date,
          read: f.severity !== 'HIGH',
          type: 'health',
          screen: 'deal-health',
        });
      });
    }

    // Fulfillment with pending splits
    if (role !== 'customer') {
      const pending = fulfillmentRows.filter((f) => f.status === 'Split pending');
      pending.slice(0, 1).forEach((f) => {
        items.push({
          id: `dyn-fulfillment-${f.id}`,
          title: 'Split Shipment Recommended',
          message: `${f.customer} · ${f.id} — stock split ready across Indian hubs.`,
          timestamp: 'Now',
          read: false,
          type: 'fulfillment',
          screen: 'fulfillment',
        });
      });
    }

    // Unpaid invoices
    if (role === 'finance' || role === 'admin') {
      const unpaid = invoicesList.filter((inv) => inv.status === 'Unpaid');
      unpaid.slice(0, 1).forEach((inv) => {
        items.push({
          id: `dyn-invoice-${inv.id}`,
          title: 'Invoice Payment Pending',
          message: `${inv.customer} · ${inv.amount} due ${inv.dueDate}.`,
          timestamp: inv.dueDate,
          read: true,
          type: 'billing',
          screen: 'invoices',
        });
      });
    }

    return items;
  }, [role, approvalRows, dealHealthFlags, fulfillmentRows, invoicesList]);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const emailOrUsername = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');

    try {
      let displayName = '';
      let authToken = '';

      if (authMode === 'signup') {
        const firstName = String(form.get('firstName') || '').trim();
        const lastName = String(form.get('lastName') || '').trim();
        displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || formatDisplayName(emailOrUsername);

        const signupEmail = emailOrUsername.includes('@')
          ? emailOrUsername
          : `${emailOrUsername.toLowerCase()}@dealflow360.com`;

        const response = await signup(
          displayName,
          signupEmail,
          password,
          toApiRole(role),
        );
        authToken = response.token;
        if (response.user?.name && !['usr-demo', 'usr-demo-new'].includes(response.user.name)) {
          displayName = response.user.name;
        }

        try {
          const known = JSON.parse(localStorage.getItem('dealflow.usersCache') || '{}');
          known[emailOrUsername.toLowerCase()] = displayName;
          if (emailOrUsername.includes('@')) {
            known[emailOrUsername.split('@')[0].toLowerCase()] = displayName;
          }
          localStorage.setItem('dealflow.usersCache', JSON.stringify(known));
        } catch { }
      } else {
        const loginEmail = emailOrUsername.includes('@')
          ? emailOrUsername
          : `${emailOrUsername.toLowerCase()}@dealflow360.com`;

        const response = await login(loginEmail, password);
        authToken = response.token;

        try {
          const known = JSON.parse(localStorage.getItem('dealflow.usersCache') || '{}');
          const cached =
            known[emailOrUsername.toLowerCase()] ||
            (emailOrUsername.includes('@') ? known[emailOrUsername.split('@')[0].toLowerCase()] : null);
          if (cached) {
            displayName = cached;
          }
        } catch { }

        if (!displayName && response.user?.name && !['usr-demo', 'usr-demo-new', 'Demo User', 'DEMO USER'].includes(response.user.name)) {
          displayName = response.user.name;
        }

        if (!displayName) {
          displayName = formatDisplayName(emailOrUsername);
        }
      }

      saveToken(authToken);
      setUserName(displayName);
      localStorage.setItem('dealflow.userName', displayName);
      setAuthenticated(true);
      setAuthMessage('');

      // Customer role → go directly to customer portal
      if (role === 'customer') {
        try {
          const loginEmail = emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@dealflow360.com`;
          const portalRes = await portalLogin(loginEmail, password);
          saveToken(portalRes.token);
          setPortalCustomerId(portalRes.customer?.id || null);
          // Load portal-specific quotations
          const pqRes = await getPortalQuotations();
          if (pqRes?.data) setPortalQuotations(pqRes.data);
        } catch {
          // portal login may fail for staff — silently continue
        }
        setScreen('customer-portal');
      } else {
        setScreen('dashboard');
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to sign in.');
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

  async function updateApproval(status: ApprovalStatus) {
    if (!selectedApproval) return;
    try {
      if (status === 'Approved') {
        await approveQuotation(selectedApproval.id, 'Reviewed via portal - approved');
      } else if (status === 'Rejected') {
        await rejectQuotation(selectedApproval.id, 'Reviewed via portal - rejected');
      } else {
        await returnQuotation(selectedApproval.id, 'Reviewed via portal - returned for revision');
      }

      const message =
        status === 'Approved'
          ? `${selectedApproval.id} approved and released to fulfillment.`
          : status === 'Rejected'
            ? `${selectedApproval.id} rejected and removed from the approval queue.`
            : `${selectedApproval.id} returned for revision.`;
      notifyPortal(message);
      setScreen('approvals');
      await loadAllData();
    } catch (err: any) {
      const updated = {
        ...selectedApproval,
        status,
        stage: status === 'Approved' ? ('Auto-approved' as const) : selectedApproval.stage,
      };
      setApprovalRows((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedApproval(updated);
      notifyPortal(err.message || `Updated ${selectedApproval.id}`);
      setScreen('approvals');
    }
  }

  function openFulfillment(order: FulfillmentOrder) {
    setSelectedFulfillment(order);
    setScreen('fulfillment-detail');
  }

  async function acceptSuggestedSplit() {
    if (!selectedFulfillment) return;
    try {
      // First call suggest-split to get AI-recommended split plan
      const suggestion = await apiSuggestSplit(selectedFulfillment.id);
      // Then persist the split to database
      await apiAcceptSplit(selectedFulfillment.id, suggestion.splits.map((s: any) => ({
        warehouseId: s.warehouseId || s.warehouse?.id,
        qtyFulfilled: s.qtyFulfilled,
        shipmentCost: s.shipmentCost,
      })));
      await loadAllData();
      notifyPortal(`${selectedFulfillment.id} split accepted and saved. Fulfillment is ready to release.`);
    } catch (err: any) {
      // Optimistic update on failure
      const updated = { ...selectedFulfillment, status: 'Ready' as const };
      setFulfillmentRows((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedFulfillment(updated);
      notifyPortal(err.message || `${selectedFulfillment.id} split accepted.`);
    }
  }

  function openSubscription(subscription: Subscription) {
    setSelectedSubscription(subscription);
    setScreen('subscription-detail');
  }

  async function cancelSubscription() {
    if (!selectedSubscription) return;
    try {
      await apiUpdateSubscriptionStatus(selectedSubscription.id, 'CANCELLED');
      notifyPortal(`${selectedSubscription.customer} subscription cancelled. Future billing is paused.`);
      await loadAllData();
    } catch (err: any) {
      const updated = { ...selectedSubscription, status: 'Cancelled' as const, nextBill: '—' };
      setSubscriptionRows((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedSubscription(updated);
      notifyPortal(err.message || `${selectedSubscription.customer} subscription cancelled.`);
    }
  }

  async function handleAddProduct(newProduct: Product) {
    try {
      const cat = newProduct.category.toUpperCase();
      const mappedCategory =
        cat === 'SUBSCRIPTIONS' || cat === 'SUBSCRIPTION'
          ? 'SUBSCRIPTIONS'
          : cat === 'SERVICES' || cat === 'SERVICE'
            ? 'SERVICES'
            : 'HARDWARE';

      await apiCreateProduct({
        name: newProduct.name,
        category: mappedCategory as any,
        price: newProduct.numericPrice,
        unit: newProduct.unit || 'unit',
        taxPct: parseInt(newProduct.tax) || 15,
        description: newProduct.description,
      });
      await loadAllData();
      notifyPortal(`Product "${newProduct.name}" created successfully.`);
    } catch (err: any) {
      setProductsList((prev) => [newProduct, ...prev]);
      notifyPortal(err.message || `Product "${newProduct.name}" created.`);
    }
  }

  async function handleSaveProduct(updatedProduct: Product) {
    try {
      const cat = updatedProduct.category.toUpperCase();
      const mappedCategory =
        cat === 'SUBSCRIPTIONS' || cat === 'SUBSCRIPTION'
          ? 'SUBSCRIPTIONS'
          : cat === 'SERVICES' || cat === 'SERVICE'
            ? 'SERVICES'
            : 'HARDWARE';

      await apiUpdateProduct(updatedProduct.id, {
        name: updatedProduct.name,
        category: mappedCategory as any,
        price: updatedProduct.numericPrice,
        unit: updatedProduct.unit,
        description: updatedProduct.description,
      });
      await loadAllData();
      setSelectedProduct(updatedProduct);
      notifyPortal(`Product "${updatedProduct.name}" updated successfully.`);
    } catch (err: any) {
      setProductsList((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
      setSelectedProduct(updatedProduct);
      notifyPortal(err.message || `Product "${updatedProduct.name}" updated.`);
    }
  }

  async function handleTriggerScan() {
    try {
      const res = await triggerDealHealthScan();
      notifyPortal(res.message || 'Deal health scan completed.');
      const flagsRes = await getDealHealthFlags();
      if (flagsRes?.data) {
        setDealHealthFlags(flagsRes.data.map(toDealHealthFlag));
      }
    } catch (err: any) {
      notifyPortal(err.message || 'Deal health scan completed.');
    }
  }

  async function handleSaveQuotation(
    payloadOrCustomerId: any,
    maybeLines?: Array<{ productId: string; qty: number; discountPct: number }>
  ) {
    // Normalize: accept (customerId, lines[]) OR ({ customerId, lines })
    const customerId = typeof payloadOrCustomerId === 'string'
      ? payloadOrCustomerId
      : payloadOrCustomerId?.customerId;
    const lines = maybeLines ?? payloadOrCustomerId?.lines ?? [];
    try {
      const res = await apiCreateQuotation({
        customerId,
        lines: lines.map((l: any) => ({
          productId: l.productId,
          qty: l.qty,
          discountPct: l.discountPct,
        })),
      });
      await loadAllData();
      notifyPortal(`Quotation ${res.data.id} saved as draft.`);
      setScreen('quotations');
    } catch (err: any) {
      notifyPortal(err.message || 'Failed to save quotation draft.');
    }
  }

  async function handleSubmitQuotation(
    payloadOrCustomerId: any,
    maybeLines?: Array<{ productId: string; qty: number; discountPct: number }>
  ) {
    const customerId = typeof payloadOrCustomerId === 'string'
      ? payloadOrCustomerId
      : payloadOrCustomerId?.customerId;
    const lines = maybeLines ?? payloadOrCustomerId?.lines ?? [];
    try {
      const res = await apiCreateQuotation({
        customerId,
        lines: lines.map((l: any) => ({
          productId: l.productId,
          qty: l.qty,
          discountPct: l.discountPct,
        })),
      });
      await apiSubmitQuotation(res.data.id);
      await loadAllData();
      notifyPortal(`Quotation ${res.data.id} submitted for approval.`);
      setScreen('quotations');
    } catch (err: any) {
      notifyPortal(err.message || 'Failed to submit quotation for approval.');
    }
  }

  async function handleConfirmQuotation(
    payloadOrCustomerId: any,
    maybeLines?: Array<{ productId: string; qty: number; discountPct: number }>
  ) {
    const customerId = typeof payloadOrCustomerId === 'string'
      ? payloadOrCustomerId
      : payloadOrCustomerId?.customerId;
    const lines = maybeLines ?? payloadOrCustomerId?.lines ?? [];
    try {
      const res = await apiCreateQuotation({
        customerId,
        lines: lines.map((l: any) => ({
          productId: l.productId,
          qty: l.qty,
          discountPct: l.discountPct,
        })),
      });
      await apiConfirmQuotation(res.data.id);
      await loadAllData();
      notifyPortal(`Quotation ${res.data.id} confirmed and ready for fulfillment.`);
      setScreen('quotations');
    } catch (err: any) {
      notifyPortal(err.message || 'Failed to confirm quotation.');
    }
  }

  async function handleRecordPayment(invoice: Invoice) {
    try {
      const numAmount = Number(invoice.amount.replace(/[^0-9.-]+/g, '')) || 100;
      await apiRecordPayment({
        invoiceId: invoice.id,
        amount: numAmount,
        method: 'BANK_TRANSFER',
      });
      await loadAllData();
      notifyPortal(`${invoice.id} payment recorded and reconciliation updated.`);
    } catch (err: any) {
      notifyPortal(err.message || `Payment recorded for ${invoice.id}`);
    }
  }

  async function handleCreateWarehouse(name: string, location: string) {
    await apiCreateWarehouse({ name, location });
    await loadAllData();
  }

  async function handleCreatePlan(plan: { name: string; cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'; prorationRule?: string }) {
    await apiCreateSubscriptionPlan(plan);
    await loadAllData();
  }

  async function handleReloadData() {
    try {
      await loadAllData();
      notifyPortal('Pricing, live stock, and approval data reloaded from database.');
    } catch {
      notifyPortal('Unable to reload database data.');
    }
  }

  function handleNavigateToBackend() {
    setScreen('products');
  }

  function handleLogout() {
    clearToken();
    localStorage.removeItem('dealflow.userName');
    setAuthenticated(false);
    setUserName('Team');
    setSelectedQuote(null);
    setSelectedDetailQuote(null);
  }

  function toApiRole(roleToMap: Role): 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'ADMIN' {
    if (roleToMap === 'manager') return 'SALES_MANAGER';
    if (roleToMap === 'finance') return 'FINANCE';
    return roleToMap === 'admin' ? 'ADMIN' : 'SALES_REP';
  }

  async function handlePortalNegotiation(quotationId: string, discount: number, notes: string) {
    try {
      // Submit negotiation via portal API using first line id
      const activeQ = portalQuotations.find((q) => q.id === quotationId);
      const changes = (activeQ?.lines || []).map((l) => ({
        lineId: l.id,
        newDiscountPct: discount,
      }));
      await apiSubmitPortalNegotiation(quotationId, changes, notes);
      if (discount > 15) {
        notifyPortal(
          `Counter proposal (${discount}% discount) submitted. Exceeds Gold ceiling — quotation re-entered the approval flow.`
        );
      } else {
        notifyPortal(`Counter proposal (${discount}% discount) submitted to your account team.`);
      }
      // Reload portal quotations
      const pqRes = await getPortalQuotations();
      if (pqRes?.data) setPortalQuotations(pqRes.data);
    } catch (err: any) {
      notifyPortal(err.message || 'Failed to submit counter proposal.');
      throw err;
    }
  }

  async function handlePortalConfirm(quotationId: string) {
    try {
      await apiConfirmPortalQuotation(quotationId);
      setPortalConfirmedIds((prev) => new Set([...prev, quotationId]));
      notifyPortal('Quotation confirmed! Your sales team has been notified.');
      // Reload portal quotations
      const pqRes = await getPortalQuotations();
      if (pqRes?.data) setPortalQuotations(pqRes.data);
    } catch (err: any) {
      notifyPortal(err.message || 'Failed to confirm quotation.');
      throw err;
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
          onNavigate={setScreen}
          initialNotifications={dynamicNotifications}
        />
        <main className="page-content">
          {screen === 'dashboard' ? (
            <Dashboard
              quotes={quotesList}
              dealHealthFlags={dealHealthFlags}
              auditLogs={auditLogs}
              userName={userName}
              onNavigate={setScreen}
              onOpenQuote={setSelectedQuote}
              onNewQuotation={createQuotation}
            />
          ) : screen === 'quotations' ? (
            <QuotationsPage
              quotes={filteredQuotes}
              allQuotes={quotesList}
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
              onNewPlan={() => setScreen('subscription-setup')}
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
              invoices={invoicesList}
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
              onRecordPayment={() => handleRecordPayment(selectedInvoice)}
            />
          ) : screen === 'quotation-builder' ? (
            <QuotationBuilderPage
              productsList={productsList}
              customersList={customersList}
              onBack={() => setScreen('quotations')}
              onSave={handleSaveQuotation}
              onSubmit={handleSubmitQuotation}
              onConfirm={handleConfirmQuotation}
            />
          ) : screen === 'deal-health' ? (
            <DealHealthPage
              dealHealthFlags={dealHealthFlags}
              onOpenQuote={() => {
                if (quotesList.length > 0) {
                  setSelectedQuote(quotesList[0]);
                }
              }}
              onNotify={notifyPortal}
              onTriggerScan={handleTriggerScan}
            />
          ) : screen === 'reports' ? (
            <ReportsPage onNotify={notifyPortal} quotes={quotesList} />
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
            <WarehouseSetupPage
              warehouses={warehousesList}
              onCreateWarehouse={handleCreateWarehouse}
              onNotify={notifyPortal}
            />
          ) : screen === 'subscription-setup' ? (
            <SubscriptionSetupPage
              plans={plansList}
              onCreatePlan={handleCreatePlan}
              onNotify={notifyPortal}
            />
          ) : screen === 'audit-trail' ? (
            <AuditTrailPage auditLogs={auditLogs} />
          ) : (
            <CustomerPortalPage
              quotations={portalQuotations}
              confirmedIds={portalConfirmedIds}
              onSubmitNegotiation={handlePortalNegotiation}
              onConfirmQuotation={handlePortalConfirm}
              status={portalStatus}
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

export default App;

