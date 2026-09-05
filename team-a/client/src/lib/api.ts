import type {
  ApprovalItem,
  ApprovalRule,
  ApprovalStatus,
  AuditLogItem,
  Customer,
  DealHealthFlagItem,
  DiscountConfig,
  FulfillmentOrder,
  FulfillmentStatus,
  Invoice,
  InvoiceStatus,
  Product,
  QuotedProduct,
  Quote,
  QuoteStatus,
  Subscription,
  SubscriptionPlanItem,
  SubscriptionStatus,
  Warehouse,
} from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://team149-odoohackathon2026-1.onrender.com/api'
).replace(/\/$/, '');

const TOKEN_KEY = 'dealflow.accessToken';
const USER_KEY = 'dealflow.user';

type ApiErrorBody = { message?: string; error?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    throw new Error(errorBody?.message || errorBody?.error || `Request failed (${response.status})`);
  }
  return body as T;
}

// ── Auth Types & Methods ──────────────────────────────────────────────────

export type AuthResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'ADMIN' };
};

export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signup(name: string, email: string, password: string, role: AuthResponse['user']['role']) {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
}

export function portalLogin(email: string, password: string) {
  return request<{ token: string; customer: Customer }>('/auth/portal-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser() {
  return request<{ data: AuthResponse['user'] }>('/auth/me');
}

export function saveToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function saveUser(user: AuthResponse['user']) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): AuthResponse['user'] | null {
  const value = window.localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthResponse['user'];
  } catch {
    return null;
  }
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function hasToken() {
  return Boolean(window.localStorage.getItem(TOKEN_KEY));
}

// ── Products ──────────────────────────────────────────────────────────────

export type ApiProduct = {
  id: string;
  name: string;
  category: 'HARDWARE' | 'SERVICES' | 'SUBSCRIPTIONS';
  price: number | string;
  unit: string;
  taxPct: number;
  description?: string | null;
  variants?: Array<{ id: string; attribute: string; value: string; extraPrice: number | string }>;
  stock?: Array<{ quantity?: number; qtyAvailable?: number; qtyReserved?: number; warehouse?: { name: string } }>;
};

export function getProducts(category?: string) {
  const query = category ? `?category=${category}` : '';
  return request<{ data: ApiProduct[] }>(`/products${query}`);
}

export function createProduct(data: {
  name: string;
  category: 'HARDWARE' | 'SERVICES' | 'SUBSCRIPTIONS';
  price: number;
  unit?: string;
  taxPct?: number;
  description?: string;
}) {
  return request<{ data: ApiProduct }>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProduct(id: string, data: Partial<{
  name: string;
  category: 'HARDWARE' | 'SERVICES' | 'SUBSCRIPTIONS';
  price: number;
  unit: string;
  taxPct: number;
  description: string;
}>) {
  return request<{ data: ApiProduct }>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function addProductVariant(productId: string, variant: { attribute: string; value: string; extraPrice: number }) {
  return request<{ data: any }>(`/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(variant),
  });
}

// ── Customers ─────────────────────────────────────────────────────────────

export function getCustomers(tier?: string) {
  const query = tier ? `?tier=${tier}` : '';
  return request<{ data: Customer[] }>(`/customers${query}`);
}

export function createCustomer(data: { name: string; email: string; tier?: 'BRONZE' | 'SILVER' | 'GOLD' }) {
  return request<{ data: Customer }>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Quotations ────────────────────────────────────────────────────

export type ApiQuotationLine = {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number | string;
  discountPct: number;
  lineLimitPct?: number;
  status?: 'OK' | 'FLAGGED';
  product?: ApiProduct;
};

export type ApiQuotation = {
  id: string;
  customerId: string;
  salesRepId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CLOSED';
  blendedRiskScore?: number | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  salesRep?: { id: string; name: string; email: string; role?: string };
  lines?: ApiQuotationLine[];
  _count?: { lines: number };
  approvals?: any[];
  splits?: any[];
};

export function getQuotations(filters?: { status?: string; customerId?: string; salesRepId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerId) params.set('customerId', filters.customerId);
  if (filters?.salesRepId) params.set('salesRepId', filters.salesRepId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ data: ApiQuotation[] }>(`/quotations${qs}`);
}

export function getQuotation(id: string) {
  return request<{ data: ApiQuotation }>(`/quotations/${id}`);
}

export function createQuotation(data: {
  customerId: string;
  lines?: Array<{ productId: string; qty: number; discountPct: number }>;
}) {
  return request<{ data: ApiQuotation }>('/quotations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateQuotationLines(id: string, lines: Array<{ productId: string; qty: number; discountPct: number }>) {
  return request<{ data: ApiQuotation }>(`/quotations/${id}/lines`, {
    method: 'PUT',
    body: JSON.stringify({ lines }),
  });
}

export function submitQuotation(id: string) {
  return request<{ data: ApiQuotation }>(`/quotations/${id}/submit`, {
    method: 'POST',
  });
}

export function confirmQuotation(id: string) {
  return request<{ data: ApiQuotation }>(`/quotations/${id}/confirm`, {
    method: 'POST',
  });
}

// ── Approvals ─────────────────────────────────────────────────────────────

export function getApprovals() {
  return request<{ data: ApiQuotation[] }>('/approvals');
}

export function approveQuotation(id: string, note?: string) {
  return request<{ data: any; message: string }>(`/approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function rejectQuotation(id: string, note?: string) {
  return request<{ data: any; message: string }>(`/approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function returnQuotation(id: string, note: string) {
  return request<{ data: any; message: string }>(`/approvals/${id}/return`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

// ── Fulfillment ───────────────────────────────────────────────────────────

export function getFulfillmentOrders() {
  return request<{ data: ApiQuotation[] }>('/fulfillment');
}

export function getFulfillmentSplits(quotationId: string) {
  return request<{ data: any[] }>(`/fulfillment/${quotationId}/splits`);
}

export function suggestSplit(quotationId: string) {
  return request<{ message?: string; splits: any[]; generatedBy: string }>(`/fulfillment/${quotationId}/suggest-split`);
}

export function acceptSplit(
  quotationId: string,
  splits: Array<{ warehouseId: string; qtyFulfilled: number; shipmentCost?: number }>,
  isManualOverride = false
) {
  return request<{ data: any[]; message: string }>(`/fulfillment/${quotationId}/splits`, {
    method: 'POST',
    body: JSON.stringify({ splits, isManualOverride }),
  });
}

// ── Subscriptions ─────────────────────────────────────────────────────────

export type ApiSubscription = {
  id: string;
  quotationId: string;
  planId: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  nextBillDate: string;
  plan?: { id: string; name: string; cycle: string; prorationRule: string };
  quotation?: {
    id: string;
    customer?: Customer;
    lines?: ApiQuotationLine[];
  };
};

export function getSubscriptions() {
  return request<{ data: ApiSubscription[] }>('/subscriptions');
}

export function getSubscriptionPlans() {
  return request<{ data: SubscriptionPlanItem[] }>('/subscriptions/plans');
}

export function createSubscriptionPlan(plan: { name: string; cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'; prorationRule?: string }) {
  return request<{ data: SubscriptionPlanItem; message: string }>('/subscriptions/plans', {
    method: 'POST',
    body: JSON.stringify(plan),
  });
}

export function updateSubscriptionStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'CANCELLED') {
  return request<{ data: ApiSubscription; message: string }>(`/subscriptions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ── Invoices & Payments ───────────────────────────────────────────────────

export type ApiInvoice = {
  id: string;
  quotationId: string;
  type: 'ONE_TIME' | 'RECURRING';
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'VOID';
  amount: number | string;
  dueDate: string;
  quotation?: {
    id: string;
    customer?: Customer;
    lines?: ApiQuotationLine[];
  };
  payments?: any[];
};

export function getInvoices(filters?: { status?: string; type?: string; quotationId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.quotationId) params.set('quotationId', filters.quotationId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ data: ApiInvoice[] }>(`/invoices${qs}`);
}

export function getInvoice(id: string) {
  return request<{ data: ApiInvoice }>(`/invoices/${id}`);
}

export function createInvoice(data: { quotationId: string; type: 'ONE_TIME' | 'RECURRING'; dueDate: string }) {
  return request<{ data: ApiInvoice; message: string }>('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function recordPayment(data: { invoiceId: string; amount: number; method: 'CARD' | 'BANK_TRANSFER' | 'UPI' | 'OTHER'; reference?: string }) {
  return request<{ data: any; message: string }>('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Warehouses & Stock ────────────────────────────────────────────────────

export function getWarehouses() {
  return request<{ data: Warehouse[] }>('/warehouses');
}

export function getWarehouse(id: string) {
  return request<{ data: Warehouse & { stock?: any[] } }>(`/warehouses/${id}`);
}

export function createWarehouse(data: { name: string; location: string }) {
  return request<{ data: Warehouse; message: string }>('/warehouses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getStock(warehouseId?: string, productId?: string) {
  const params = new URLSearchParams();
  if (warehouseId) params.set('warehouseId', warehouseId);
  if (productId) params.set('productId', productId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ data: any[] }>(`/stock${qs}`);
}

// ── Deal Health & Governance ──────────────────────────────────────────────

export type ApiDealHealthFlag = {
  id: string;
  quotationId: string;
  flagType: 'STALLED' | 'DISCOUNT_ANOMALY' | 'DELIVERY_SLIPPAGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detail: string;
  detectedAt: string;
  resolved: boolean;
  quotation?: {
    id: string;
    customer?: { id: string; name: string; tier: string };
  };
};

export function getDealHealthFlags(filters?: { severity?: string; resolved?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.resolved !== undefined) params.set('resolved', String(filters.resolved));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ data: ApiDealHealthFlag[] }>(`/deal-health-flags${qs}`);
}

export function resolveDealHealthFlag(id: string) {
  return request<{ data: any; message: string }>(`/deal-health-flags/${id}/resolve`, {
    method: 'PATCH',
  });
}

export function triggerDealHealthScan() {
  return request<{ message: string; newFlagsCreated: number }>('/cron/deal-health-scan', {
    method: 'POST',
  });
}

export function triggerDatabaseSeed() {
  return request<{ message: string }>('/cron/seed', {
    method: 'POST',
  });
}

export type ApiAuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  userId?: string | null;
  action: string;
  reason?: string | null;
  createdAt: string;
  user?: { name: string; email: string };
};

export function getAuditLogs(filters?: { entityType?: string; entityId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.entityId) params.set('entityId', filters.entityId);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ data: ApiAuditLog[] }>(`/audit-log${qs}`);
}

// ── Configuration & Rules ─────────────────────────────────────────────────

export function getDiscountConfig() {
  return request<{ data: DiscountConfig }>('/discounts');
}

export function saveDiscountTier(tierName: string, maxDiscountPct: number) {
  return request<{ data: any; message: string }>('/discounts/tiers', {
    method: 'POST',
    body: JSON.stringify({ tierName, maxDiscountPct }),
  });
}

export function saveCategoryDiscount(category: string, maxDiscountPct: number) {
  return request<{ data: any; message: string }>('/discounts/categories', {
    method: 'POST',
    body: JSON.stringify({ category, maxDiscountPct }),
  });
}

export function getApprovalChains() {
  return request<{ data: ApprovalRule[] }>('/approval-chains');
}

export function saveApprovalChains(rules: ApprovalRule[]) {
  return request<{ data: ApprovalRule[]; message: string }>('/approval-chains', {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
}

// ── Customer Portal ───────────────────────────────────────────────────────

export function getPortalQuotation(id: string) {
  return request<{ data: ApiQuotation }>(`/portal/quotations/${id}`);
}

export function submitPortalNegotiation(id: string, requestedChanges: Array<{ lineId: string; newDiscountPct: number }>, notes?: string) {
  return request<{ data: any; message: string }>(`/portal/quotations/${id}/negotiate`, {
    method: 'POST',
    body: JSON.stringify({ requestedChanges, notes }),
  });
}

export function confirmPortalQuotation(id: string) {
  return request<{ data: any; message: string }>(`/portal/quotations/${id}/confirm`, {
    method: 'POST',
  });
}

// ── Data Transformation Helpers ───────────────────────────────────────────

export function getInitials(name?: string): string {
  if (!name) return 'DF';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'recently';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function toQuoteStatus(status?: string): QuoteStatus {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PENDING_APPROVAL':
      return 'Pending approval';
    case 'APPROVED':
      return 'Approved';
    case 'FULFILLED':
    case 'CLOSED':
      return 'Confirmed';
    case 'REJECTED':
      return 'Draft';
    default:
      return 'Draft';
  }
}

export function toQuote(apiQuote: ApiQuotation): Quote {
  const lines = apiQuote.lines || [];
  const numericAmount = lines.reduce((sum, line) => {
    const price = Number(line.unitPrice) || 0;
    const discount = line.discountPct || 0;
    return sum + price * line.qty * (1 - discount / 100);
  }, 0);

  const riskScore = apiQuote.blendedRiskScore ?? 0;
  const health: Quote['health'] = riskScore > 50 ? 'At risk' : riskScore > 20 ? 'Needs attention' : 'Healthy';

  const products: QuotedProduct[] = lines.map((line) => {
    const unitPrice = Number(line.unitPrice) || 0;
    const totalPrice = unitPrice * line.qty * (1 - line.discountPct / 100);
    const cat = line.product?.category;
    const category: QuotedProduct['category'] =
      cat === 'SUBSCRIPTIONS' ? 'Subscriptions' : cat === 'SERVICES' ? 'Services' : 'Hardware';

    return {
      id: line.id,
      name: line.product?.name || 'Product',
      sku: line.productId,
      category,
      specifications: line.product?.description || `${line.product?.name || 'Item'} - Standard configuration`,
      quantity: line.qty,
      unitPrice,
      discount: line.discountPct,
      totalPrice,
    };
  });

  return {
    id: apiQuote.id,
    customer: apiQuote.customer?.name || 'Customer',
    initials: getInitials(apiQuote.customer?.name),
    amount: `$${numericAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    numericAmount,
    status: toQuoteStatus(apiQuote.status),
    owner: apiQuote.salesRep?.name || 'Sales Rep',
    updated: formatTimeAgo(apiQuote.updatedAt),
    lineItems: lines.length,
    health,
    validUntil: 'Oct 30, 2026',
    products,
  };
}

export function toApprovalItem(apiQuote: ApiQuotation): ApprovalItem {
  const lines = apiQuote.lines || [];
  const maxDiscount = lines.reduce((max, line) => Math.max(max, line.discountPct || 0), 0);
  const risk: ApprovalItem['risk'] = maxDiscount > 15 ? 'High' : maxDiscount > 8 ? 'Medium' : 'Low';
  const stage: ApprovalItem['stage'] = maxDiscount > 15 ? 'Finance' : 'Sales Manager';

  let status: ApprovalStatus = 'Pending';
  if (apiQuote.status === 'APPROVED') status = 'Approved';
  if (apiQuote.status === 'REJECTED') status = 'Rejected';

  return {
    id: apiQuote.id,
    customer: apiQuote.customer?.name || 'Customer',
    initials: getInitials(apiQuote.customer?.name),
    risk,
    stage,
    assignedTo: stage === 'Finance' ? 'Finance Team' : apiQuote.salesRep?.name || 'Sales Manager',
    status,
    submitted: formatTimeAgo(apiQuote.updatedAt),
    discount: `${maxDiscount}%`,
    customerTier: apiQuote.customer?.tier ? apiQuote.customer.tier[0] + apiQuote.customer.tier.slice(1).toLowerCase() : 'Bronze',
  };
}

export function toFulfillmentOrder(apiQuote: ApiQuotation): FulfillmentOrder {
  const lines = apiQuote.lines || [];
  const totalItems = lines.reduce((sum, line) => sum + line.qty, 0);
  const splits = apiQuote.splits || [];

  let status: FulfillmentStatus = 'Split pending';
  if (splits.length > 0) status = 'Ready';

  const stockRows = splits.length
    ? splits.map((s) => ({
        warehouse: s.warehouse?.name || 'Warehouse',
        quantity: `${s.qtyFulfilled} units`,
        shipments: '1',
        cost: `$${Number(s.shipmentCost || 25).toFixed(0)}`,
      }))
    : [
        {
          warehouse: 'Main Warehouse',
          quantity: `${totalItems} units`,
          shipments: '1',
          cost: '$35',
        },
      ];

  const warehouseNames = splits.length
    ? splits.map((s) => s.warehouse?.name || 'Warehouse').join(' + ')
    : 'Pending allocation';

  return {
    id: apiQuote.id,
    customer: apiQuote.customer?.name || 'Customer',
    initials: getInitials(apiQuote.customer?.name),
    status,
    warehouses: warehouseNames,
    items: totalItems,
    stockRows,
  };
}

export function toSubscription(apiSub: ApiSubscription): Subscription {
  const lines = apiSub.quotation?.lines || [];
  const amountNum = lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.qty, 0);

  const cycleMap: Record<string, Subscription['cycle']> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
  };

  const statusMap: Record<string, SubscriptionStatus> = {
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    CANCELLED: 'Cancelled',
  };

  return {
    id: apiSub.id,
    customer: apiSub.quotation?.customer?.name || 'Customer',
    initials: getInitials(apiSub.quotation?.customer?.name),
    plan: apiSub.plan?.name || 'Cloud Subscription',
    cycle: cycleMap[apiSub.plan?.cycle || 'MONTHLY'] || 'Monthly',
    nextBill: apiSub.nextBillDate ? new Date(apiSub.nextBillDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
    status: statusMap[apiSub.status] || 'Active',
    amount: `$${amountNum.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
  };
}

export function toInvoice(apiInv: ApiInvoice): Invoice {
  const amountNum = Number(apiInv.amount) || 0;
  const status: InvoiceStatus = apiInv.status === 'PAID' ? 'Paid' : 'Unpaid';
  const dueDate = apiInv.dueDate ? new Date(apiInv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  const source = apiInv.type === 'RECURRING' ? `${apiInv.quotationId} · recurring billing` : `${apiInv.quotationId} · one-time order`;

  return {
    id: apiInv.id,
    customer: apiInv.quotation?.customer?.name || 'Customer',
    amount: `$${amountNum.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    status,
    dueDate,
    source,
  };
}

export function toProduct(product: ApiProduct): Product {
  const category =
    product.category === 'SUBSCRIPTIONS'
      ? 'Subscription'
      : product.category[0] + product.category.slice(1).toLowerCase();
  const numericPrice = Number(product.price);
  const variants = product.variants || [];
  const stock = product.stock || [];
  const totalStock = stock.reduce((total, item) => total + (item.quantity ?? item.qtyAvailable ?? 0), 0);

  return {
    id: product.id,
    name: product.name,
    category,
    variantsText: variants.length ? `${variants.length} variant(s)` : '—',
    price: `$${numericPrice.toLocaleString()}`,
    numericPrice,
    unit: product.unit || 'unit',
    tax: `${product.taxPct}%`,
    status: 'Active',
    description: product.description || undefined,
    subscription: product.category === 'SUBSCRIPTIONS' ? 'Yes' : 'No',
    recurring: product.category === 'SUBSCRIPTIONS' ? 'Monthly' : undefined,
    quantityOnHand: totalStock,
    variantsList: variants.map((variant) => ({
      id: variant.id,
      attribute: variant.attribute,
      values: variant.value,
      extraPrice: `$${Number(variant.extraPrice).toLocaleString()}`,
    })),
    pricelistsList: [],
  };
}

export function toDealHealthFlag(flag: ApiDealHealthFlag): DealHealthFlagItem {
  const toneMap: Record<string, DealHealthFlagItem['tone']> = {
    DISCOUNT_ANOMALY: 'orange',
    STALLED: 'red',
    DELIVERY_SLIPPAGE: 'blue',
  };

  const dealName = flag.quotation?.customer?.name
    ? `${flag.quotation.customer.name} · ${flag.quotationId}`
    : flag.quotationId;

  const date = flag.detectedAt
    ? new Date(flag.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Today';

  return {
    id: flag.id,
    deal: dealName,
    quotationId: flag.quotationId,
    issue: flag.detail,
    date,
    tone: toneMap[flag.flagType] || 'orange',
    severity: flag.severity,
    resolved: flag.resolved,
  };
}

export function toAuditLog(log: ApiAuditLog): AuditLogItem {
  return {
    id: log.id,
    user: log.user?.name || log.userId || 'System',
    entity: log.entityId || log.entityType,
    action: log.action.replace(/_/g, ' ').toLowerCase(),
    reason: log.reason || 'System operation',
    timestamp: formatTimeAgo(log.createdAt),
  };
}

// ── AI Deal Win Predictor (ML) ─────────────────────────────────────────────

export type WinPredictionPayload = {
  customerTier?: string;
  totalRevenue?: number;
  avgDiscountPct?: number;
  itemCount?: number;
  riskScore?: number;
};

export type WinPredictionResponse = {
  winProbability: number;
  status: 'HIGH' | 'MODERATE' | 'AT_RISK' | string;
  confidence?: number;
  keyDriver?: string;
  recommendedDiscountPct?: number;
  modelType?: string;
  modelVersion?: string;
  fallbackActive?: boolean;
};

export function predictWinProbability(payload: WinPredictionPayload): Promise<WinPredictionResponse> {
  return request<WinPredictionResponse>('/ai/win-probability', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
