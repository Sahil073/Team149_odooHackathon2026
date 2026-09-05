import { useState } from 'react';
import { ArrowRight, Plus, Save, Trash2 } from 'lucide-react';
import type { PricelistEntry, Product, ProductVariant } from '../../types';

type ProductDetailPageProps = {
  product: Product;
  onBack: () => void;
  onSaveProduct: (updatedProduct: Product) => void;
  onNotify: (message: string) => void;
};

export function ProductDetailPage({
  product,
  onBack,
  onSaveProduct,
  onNotify,
}: ProductDetailPageProps) {
  // Form State
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(product.price);
  const [unit, setUnit] = useState(product.unit);
  const [description, setDescription] = useState(
    product.description || 'High-performance enterprise hardware component.'
  );
  const [tax, setTax] = useState(product.tax || '15%');
  const [subscription, setSubscription] = useState<'Yes' | 'No'>(
    product.subscription || 'No'
  );
  const [recurring, setRecurring] = useState<'Monthly' | 'Yearly' | 'Weekly'>(
    product.recurring || 'Monthly'
  );
  const [quantityOnHand, setQuantityOnHand] = useState<number>(
    product.quantityOnHand ?? 40
  );

  // Dynamic Product Variants List
  const [variants, setVariants] = useState<ProductVariant[]>(
    product.variantsList && product.variantsList.length > 0
      ? product.variantsList
      : [
          { id: 'v1', attribute: 'Color', values: 'Blue, Black', extraPrice: '0' },
          { id: 'v2', attribute: 'RAM', values: '4GB, 8GB', extraPrice: '+$30' },
          { id: 'v3', attribute: 'Manufacturer', values: 'Dell, HP', extraPrice: '+$10/+$30' },
        ]
  );

  // Dynamic Pricelists List
  const [pricelists, setPricelists] = useState<PricelistEntry[]>(
    product.pricelistsList && product.pricelistsList.length > 0
      ? product.pricelistsList
      : [
          { id: 'p1', tier: 'Bronze', currency: 'USD', priceRule: 'Price, no adjustment' },
          { id: 'p2', tier: 'Gold', currency: 'USD/EUR', priceRule: 'Price minus 10 percent base' },
        ]
  );

  // Variant editing handlers
  function addVariantRow() {
    const newVariant: ProductVariant = {
      id: `v-${Date.now()}`,
      attribute: 'Size',
      values: 'Standard, XL',
      extraPrice: '+$15',
    };
    setVariants([...variants, newVariant]);
  }

  function updateVariant(id: string, field: keyof ProductVariant, value: string) {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  }

  function deleteVariant(id: string) {
    setVariants(variants.filter((v) => v.id !== id));
  }

  // Pricelist editing handlers
  function addPricelistRow() {
    const newPricelist: PricelistEntry = {
      id: `p-${Date.now()}`,
      tier: 'Silver',
      currency: 'USD',
      priceRule: 'Price minus 5 percent base',
    };
    setPricelists([...pricelists, newPricelist]);
  }

  function updatePricelist(id: string, field: keyof PricelistEntry, value: string) {
    setPricelists(
      pricelists.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  }

  function deletePricelist(id: string) {
    setPricelists(pricelists.filter((p) => p.id !== id));
  }

  // Save changes
  function handleSave() {
    const updated: Product = {
      ...product,
      name,
      category,
      price,
      unit: subscription === 'Yes' ? 'Recurring' : unit,
      tax,
      description,
      subscription,
      recurring,
      quantityOnHand: Number(quantityOnHand) || 0,
      variantsList: variants,
      variantsText: variants.length > 0 ? `${variants.length}(variant)` : '—',
      pricelistsList: pricelists,
    };

    onSaveProduct(updated);
    onNotify(`Product details for "${name}" updated successfully.`);
  }

  return (
    <div className="content-container product-detail-wireframe-page">
      <button className="back-link" onClick={onBack}>
        <ArrowRight size={15} className="back-arrow" /> Back to product catalog
      </button>

      {/* Main Title matching wireframe 17 */}
      <div className="page-heading detail-heading">
        <div>
          <span className="eyebrow">ADMIN / PRODUCT CATALOG</span>
          <h1>
            Product and pricelist<span className="heading-period">.</span>
          </h1>
          <p>{product.id} · General info, variants and tier/currency price rules.</p>
        </div>
        <button className="button button-primary" onClick={handleSave}>
          <Save size={15} /> Save Changes
        </button>
      </div>

      {/* 1. General Info Section Box */}
      <section className="panel wireframe-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">GENERAL INFO</span>
            <h2>Product Details & Settings</h2>
          </div>
        </div>

        <div className="general-info-grid">
          {/* Left Column */}
          <div className="info-column">
            <label className="field">
              <span>Product name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Hardware">Hardware</option>
                <option value="Services">Services</option>
                <option value="Subscription">Subscription</option>
                <option value="Software">Software</option>
              </select>
            </label>

            <label className="field">
              <span>Price</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>

            <label className="field">
              <span>Unit</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          {/* Right Column */}
          <div className="info-column">
            <label className="field">
              <span>Tax %</span>
              <input value={tax} onChange={(e) => setTax(e.target.value)} />
            </label>

            <div className="subscription-toggle-group">
              <label className="field">
                <span>Subscription</span>
                <select
                  value={subscription}
                  onChange={(e) => setSubscription(e.target.value as 'Yes' | 'No')}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </label>

              <span className="subscription-hint-text">
                If subscription yes then recurring will be visible
              </span>
            </div>

            {/* Dynamic Recurring Field - visible if subscription is Yes */}
            {subscription === 'Yes' && (
              <label className="field recurring-field-highlight">
                <span>Recurring</span>
                <select
                  value={recurring}
                  onChange={(e) => setRecurring(e.target.value as 'Monthly' | 'Yearly' | 'Weekly')}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </label>
            )}

            <label className="field">
              <span>Quantity on hand (Integer field)</span>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </section>

      {/* 2. Product Variants Section */}
      <section className="panel wireframe-panel" style={{ marginTop: '20px' }}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CONFIGURATIONS</span>
            <h2>Product Variants</h2>
          </div>
          <button className="button button-small" onClick={addVariantRow}>
            <Plus size={14} /> Add Variant Attribute
          </button>
        </div>

        <div className="table-scroll" style={{ marginTop: '16px' }}>
          <table className="operations-table wireframe-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Attribute</th>
                <th style={{ width: '45%' }}>Values</th>
                <th style={{ width: '25%' }}>Extra price</th>
                <th style={{ width: '5%' }} />
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id}>
                  <td>
                    <input
                      className="table-input"
                      value={variant.attribute}
                      onChange={(e) => updateVariant(variant.id, 'attribute', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      value={variant.values}
                      onChange={(e) => updateVariant(variant.id, 'values', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      value={variant.extraPrice}
                      onChange={(e) => updateVariant(variant.id, 'extraPrice', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      className="icon-button compact-remove"
                      onClick={() => deleteVariant(variant.id)}
                      title="Delete row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {variants.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-table">
                    No variant attributes defined for this product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Pricelists Section */}
      <section className="panel wireframe-panel" style={{ marginTop: '20px' }}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">COMMERCIAL TIERS</span>
            <h2>Pricelists</h2>
          </div>
          <button className="button button-small" onClick={addPricelistRow}>
            <Plus size={14} /> Add Pricelist Tier
          </button>
        </div>

        <div className="table-scroll" style={{ marginTop: '16px' }}>
          <table className="operations-table wireframe-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Tier</th>
                <th style={{ width: '25%' }}>Currency</th>
                <th style={{ width: '45%' }}>Price Rule</th>
                <th style={{ width: '5%' }} />
              </tr>
            </thead>
            <tbody>
              {pricelists.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <input
                      className="table-input"
                      value={entry.tier}
                      onChange={(e) => updatePricelist(entry.id, 'tier', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      value={entry.currency}
                      onChange={(e) => updatePricelist(entry.id, 'currency', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      value={entry.priceRule}
                      onChange={(e) => updatePricelist(entry.id, 'priceRule', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      className="icon-button compact-remove"
                      onClick={() => deletePricelist(entry.id)}
                      title="Delete row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {pricelists.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-table">
                    No pricelist rules defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Golden Callout Notice Bar matching wireframe 17 */}
      <div className="wireframe-notice-bar" style={{ marginTop: '24px' }}>
        <p>Product details should be filled.</p>
        <p>Recurring order with this product will be invoiced at the beginning of the period.</p>
      </div>
    </div>
  );
}
