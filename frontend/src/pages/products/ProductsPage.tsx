import { useState } from 'react';
import { ArrowRight, Plus, Settings2, X } from 'lucide-react';
import type { Product } from '../../types';

export const initialProducts: Product[] = [
  {
    id: 'PRD-001',
    name: 'Laptop Pro 14',
    category: 'Hardware',
    variantsText: '3(size)',
    price: '$1,200',
    numericPrice: 1200,
    unit: 'Each',
    tax: '15%',
    status: 'Active',
    description: 'High performance 14-inch professional laptop.',
    subscription: 'No',
    recurring: 'Monthly',
    quantityOnHand: 40,
    variantsList: [
      { id: 'v1', attribute: 'Color', values: 'Blue, Black', extraPrice: '0' },
      { id: 'v2', attribute: 'RAM', values: '4GB, 8GB', extraPrice: '+$30' },
      { id: 'v3', attribute: 'Manufacturer', values: 'Dell, HP', extraPrice: '+$10/+$30' },
    ],
    pricelistsList: [
      { id: 'p1', tier: 'Bronze', currency: 'USD', priceRule: 'Price, no adjustment' },
      { id: 'p2', tier: 'Gold', currency: 'USD/EUR', priceRule: 'Price minus 10 percent base' },
    ],
  },
  {
    id: 'PRD-002',
    name: 'Onsite Setup Service',
    category: 'Services',
    variantsText: '—',
    price: '$450',
    numericPrice: 450,
    unit: 'Each',
    tax: '10%',
    status: 'Active',
    description: 'Professional onsite workstation setup and network integration.',
    subscription: 'No',
    recurring: 'Monthly',
    quantityOnHand: 99,
    variantsList: [],
    pricelistsList: [
      { id: 'p1', tier: 'Bronze', currency: 'USD', priceRule: 'Standard service rate' },
      { id: 'p2', tier: 'Gold', currency: 'USD', priceRule: '15% corporate discount' },
    ],
  },
  {
    id: 'PRD-003',
    name: 'Docking Station',
    category: 'Hardware',
    variantsText: '3(color)',
    price: '$180',
    numericPrice: 180,
    unit: 'Each',
    tax: '15%',
    status: 'Active',
    description: 'Universal Thunderbolt 4 dual 4K display dock.',
    subscription: 'No',
    recurring: 'Monthly',
    quantityOnHand: 65,
    variantsList: [
      { id: 'v1', attribute: 'Color', values: 'Space Gray, Silver, Black', extraPrice: '0' },
      { id: 'v2', attribute: 'Power Adapter', values: '65W, 100W', extraPrice: '+$20' },
    ],
    pricelistsList: [
      { id: 'p1', tier: 'Bronze', currency: 'USD', priceRule: 'Price, no adjustment' },
      { id: 'p2', tier: 'Gold', currency: 'USD/EUR', priceRule: 'Price minus 10 percent base' },
    ],
  },
  {
    id: 'PRD-004',
    name: 'Care Plan 3 years',
    category: 'Subscription',
    variantsText: '—',
    price: '$40/month',
    numericPrice: 40,
    unit: 'Recurring',
    tax: '0%',
    status: 'Active',
    description: '3-year extended hardware warranty and priority support.',
    subscription: 'Yes',
    recurring: 'Monthly',
    quantityOnHand: 500,
    variantsList: [
      { id: 'v1', attribute: 'Tier', values: 'Standard, Premium', extraPrice: '+$15/month' },
    ],
    pricelistsList: [
      { id: 'p1', tier: 'Bronze', currency: 'USD', priceRule: 'Base subscription rate' },
      { id: 'p2', tier: 'Gold', currency: 'USD/EUR', priceRule: 'Yearly billing discount applied' },
    ],
  },
];

type ProductsPageProps = {
  productsList: Product[];
  onOpenProduct: (product: Product) => void;
  onAddProduct: (newProduct: Product) => void;
  onNotify: (message: string) => void;
};

export function ProductsPage({
  productsList,
  onOpenProduct,
  onAddProduct,
  onNotify,
}: ProductsPageProps) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPriceFieldsModal, setShowPriceFieldsModal] = useState(false);

  // New product form state
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'Hardware',
    price: '100',
    unit: 'Each',
    tax: '15%',
    subscription: 'No' as 'Yes' | 'No',
    recurring: 'Monthly' as 'Monthly' | 'Yearly' | 'Weekly',
    quantityOnHand: 10,
    description: '',
  });

  function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProductForm.name) return;

    const created: Product = {
      id: `PRD-00${productsList.length + 1}`,
      name: newProductForm.name,
      category: newProductForm.category,
      variantsText: '—',
      price:
        newProductForm.subscription === 'Yes'
          ? `$${newProductForm.price}/${newProductForm.recurring.toLowerCase()}`
          : `$${newProductForm.price}`,
      numericPrice: Number(newProductForm.price) || 100,
      unit: newProductForm.subscription === 'Yes' ? 'Recurring' : newProductForm.unit,
      tax: newProductForm.tax,
      status: 'Active',
      description: newProductForm.description || 'New product entry.',
      subscription: newProductForm.subscription,
      recurring: newProductForm.recurring,
      quantityOnHand: Number(newProductForm.quantityOnHand) || 0,
      variantsList: [],
      pricelistsList: [
        { id: 'p1', tier: 'Bronze', currency: 'USD', priceRule: 'Price, no adjustment' },
      ],
    };

    onAddProduct(created);
    setShowNewModal(false);
    onNotify(`Product "${created.name}" created successfully.`);
    setNewProductForm({
      name: '',
      category: 'Hardware',
      price: '100',
      unit: 'Each',
      tax: '15%',
      subscription: 'No',
      recurring: 'Monthly',
      quantityOnHand: 10,
      description: '',
    });
  }

  return (
    <div className="content-container operations-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN / PRODUCT CATALOG</span>
          <h1>
            Product catalog<span className="heading-period">.</span>
          </h1>
          <p>Every product, variant and price list in one place.</p>
        </div>
        <div className="page-heading-actions">
          <button
            className="button button-primary"
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={16} /> + New Product
          </button>
          <button
            className="button"
            onClick={() => setShowPriceFieldsModal(true)}
          >
            <Settings2 size={15} /> Manage Price fields
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="catalog-wireframe-metrics">
        <div className="metric-box">
          <span className="metric-title">Total Products</span>
          <strong className="metric-val">{productsList.length + 124}</strong>
          <small>{productsList.length} active, 6 archived</small>
        </div>
        <div className="metric-box">
          <span className="metric-title">Pricelists</span>
          <strong className="metric-val">3 tiers</strong>
          <small>3 tiers, 2 Currencies (USD, EUR)</small>
        </div>
        <div className="metric-box">
          <span className="metric-title">Variants</span>
          <strong className="metric-val">340 SKUs</strong>
          <small>340 SKUs across all products</small>
        </div>
      </div>

      {/* Products Table */}
      <div className="operations-table-panel standalone-table" style={{ marginTop: '20px' }}>
        <div className="table-scroll">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Product name</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Price</th>
                <th>Unit</th>
                <th>Tax</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {productsList.map((product) => (
                <tr key={product.id} onClick={() => onOpenProduct(product)}>
                  <td>
                    <strong>{product.name}</strong>
                    <span className="product-id-sub">{product.id}</span>
                  </td>
                  <td>{product.category}</td>
                  <td>{product.variantsText}</td>
                  <td className="table-amount">{product.price}</td>
                  <td>{product.unit}</td>
                  <td>{product.tax}</td>
                  <td>
                    <span className="invoice-status invoice-paid">{product.status}</span>
                  </td>
                  <td>
                    <ArrowRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wireframe Golden Callout Notice Bar */}
      <div className="wireframe-notice-bar" style={{ marginTop: '20px' }}>
        <span>Click a product row to open general info, variants and tier/currency price lists.</span>
      </div>

      {/* + New Product Modal */}
      {showNewModal && (
        <div className="modal-layer">
          <div className="modal-scrim" onClick={() => setShowNewModal(false)} />
          <div className="modal-box">
            <div className="modal-header">
              <h3>Create New Product</h3>
              <button className="icon-button" onClick={() => setShowNewModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="modal-form">
              <label className="field">
                <span>Product Name</span>
                <input
                  required
                  placeholder="e.g. Ultra Monitor 27"
                  value={newProductForm.name}
                  onChange={(e) =>
                    setNewProductForm({ ...newProductForm, name: e.target.value })
                  }
                />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Category</span>
                  <select
                    value={newProductForm.category}
                    onChange={(e) =>
                      setNewProductForm({ ...newProductForm, category: e.target.value })
                    }
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Services">Services</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Software">Software</option>
                  </select>
                </label>
                <label className="field">
                  <span>Price ($)</span>
                  <input
                    type="number"
                    required
                    placeholder="1200"
                    value={newProductForm.price}
                    onChange={(e) =>
                      setNewProductForm({ ...newProductForm, price: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="field-row">
                <label className="field">
                  <span>Unit</span>
                  <input
                    placeholder="Each / Session"
                    value={newProductForm.unit}
                    onChange={(e) =>
                      setNewProductForm({ ...newProductForm, unit: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Tax %</span>
                  <input
                    placeholder="15%"
                    value={newProductForm.tax}
                    onChange={(e) =>
                      setNewProductForm({ ...newProductForm, tax: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="field-row">
                <label className="field">
                  <span>Subscription</span>
                  <select
                    value={newProductForm.subscription}
                    onChange={(e) =>
                      setNewProductForm({
                        ...newProductForm,
                        subscription: e.target.value as 'Yes' | 'No',
                      })
                    }
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </label>
                {newProductForm.subscription === 'Yes' && (
                  <label className="field">
                    <span>Recurring Cycle</span>
                    <select
                      value={newProductForm.recurring}
                      onChange={(e) =>
                        setNewProductForm({
                          ...newProductForm,
                          recurring: e.target.value as 'Monthly' | 'Yearly' | 'Weekly',
                        })
                      }
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </label>
                )}
              </div>
              <label className="field">
                <span>Quantity on Hand (Integer)</span>
                <input
                  type="number"
                  placeholder="10"
                  value={newProductForm.quantityOnHand}
                  onChange={(e) =>
                    setNewProductForm({
                      ...newProductForm,
                      quantityOnHand: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  rows={3}
                  placeholder="Enter product description..."
                  value={newProductForm.description}
                  onChange={(e) =>
                    setNewProductForm({ ...newProductForm, description: e.target.value })
                  }
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Price Fields Modal */}
      {showPriceFieldsModal && (
        <div className="modal-layer">
          <div className="modal-scrim" onClick={() => setShowPriceFieldsModal(false)} />
          <div className="modal-box">
            <div className="modal-header">
              <h3>Manage Price Fields</h3>
              <button
                className="icon-button"
                onClick={() => setShowPriceFieldsModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px 0' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                Configure multi-currency exchange rates, customer tier discount limits, and tax fields.
              </p>
              <div className="form-grid">
                <label className="field">
                  <span>Base Currency</span>
                  <select defaultValue="USD">
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>GBP (£)</option>
                  </select>
                </label>
                <label className="field">
                  <span>Default Tax Rate</span>
                  <input defaultValue="15%" />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="button button-primary"
                onClick={() => {
                  setShowPriceFieldsModal(false);
                  onNotify('Price fields configuration updated.');
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
