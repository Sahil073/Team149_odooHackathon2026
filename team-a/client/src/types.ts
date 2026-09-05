export type Role = 'sales-rep' | 'manager' | 'finance' | 'customer' | 'admin';

export type Screen =
  | 'dashboard'
  | 'quotations'
  | 'quotation-detail'
  | 'approvals'
  | 'approval-detail'
  | 'fulfillment'
  | 'fulfillment-detail'
  | 'subscriptions'
  | 'subscription-detail'
  | 'invoices'
  | 'invoice-detail'
  | 'customer-portal'
  | 'quotation-builder'
  | 'deal-health'
  | 'reports'
  | 'products'
  | 'product-detail'
  | 'approval-config'
  | 'warehouse-setup'
  | 'subscription-setup'
  | 'audit-trail';

export type QuoteStatus =
  | 'Draft'
  | 'Pending approval'
  | 'Approved'
  | 'Negotiation'
  | 'Confirmed';

export type QuotedProduct = {
  id: string;
  name: string;
  sku: string;
  category: 'Hardware' | 'Services' | 'Subscriptions' | 'Software';
  specifications: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
};

export type Quote = {
  id: string;
  customer: string;
  initials: string;
  amount: string;
  numericAmount: number;
  status: QuoteStatus;
  owner: string;
  updated: string;
  lineItems: number;
  health: 'Healthy' | 'At risk' | 'Needs attention';
  validUntil?: string;
  products?: QuotedProduct[];
};

export type ProductVariant = {
  id: string;
  attribute: string;
  values: string;
  extraPrice: string;
};

export type PricelistEntry = {
  id: string;
  tier: string;
  currency: string;
  priceRule: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  variantsText: string;
  price: string;
  numericPrice: number;
  unit: string;
  tax: string;
  status: 'Active' | 'Archived';
  description?: string;
  subscription: 'Yes' | 'No';
  recurring?: 'Monthly' | 'Yearly' | 'Weekly';
  quantityOnHand: number;
  variantsList?: ProductVariant[];
  pricelistsList?: PricelistEntry[];
};

export type ApprovalStatus = 'Pending' | 'Returned' | 'Approved' | 'Rejected';

export type ApprovalItem = {
  id: string;
  customer: string;
  initials: string;
  risk: 'High' | 'Medium' | 'Low';
  stage: 'Sales Manager' | 'Finance' | 'Auto-approved';
  assignedTo: string;
  status: ApprovalStatus;
  submitted: string;
  discount: string;
  customerTier: string;
};

export type FulfillmentStatus = 'Split pending' | 'Backorder' | 'Ready';

export type FulfillmentStock = {
  warehouse: string;
  product: string;
  inStock: number;
  reserved: number;
  available: number;
};

export type FulfillmentOrder = {
  id: string;
  customer: string;
  initials: string;
  status: FulfillmentStatus;
  warehouses: string;
  items: number;
  stockRows: Array<{
    warehouse: string;
    quantity: string;
    shipments: string;
    cost: string;
  }>;
};

export type SubscriptionStatus = 'Active' | 'Paused' | 'Cancelled';

export type Subscription = {
  id: string;
  customer: string;
  initials: string;
  plan: string;
  cycle: 'Monthly' | 'Quarterly' | 'Yearly';
  nextBill: string;
  status: SubscriptionStatus;
  amount: string;
};

export type InvoiceStatus = 'Paid' | 'Unpaid';

export type Invoice = {
  id: string;
  customer: string;
  amount: string;
  status: InvoiceStatus;
  dueDate: string;
  source: string;
};
