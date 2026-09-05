import { useState } from 'react';
import { Package, Plus, Save, Truck, X } from 'lucide-react';
import { Notice } from '../../components/common/Notice';
import type { Warehouse } from '../../types';

interface WarehouseSetupPageProps {
  warehouses?: Warehouse[];
  onCreateWarehouse?: (name: string, location: string) => Promise<void>;
  onNotify: (message: string) => void;
}

export function WarehouseSetupPage({
  warehouses = [],
  onCreateWarehouse,
  onNotify,
}: WarehouseSetupPageProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newLocation.trim()) {
      onNotify('Please provide both warehouse name and location.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onCreateWarehouse) {
        await onCreateWarehouse(newName.trim(), newLocation.trim());
      }
      setNewName('');
      setNewLocation('');
      setShowAddModal(false);
      onNotify(`Warehouse "${newName}" created successfully.`);
    } catch (err: any) {
      onNotify(err.message || 'Failed to create warehouse.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN / FULFILLMENT SETUP</span>
          <h1>Warehouse setup<span className="heading-period">.</span></h1>
          <p>Manage locations, replenishment rules, and the costs behind automatic split recommendations.</p>
        </div>
        <button className="button button-primary" onClick={() => onNotify('Warehouse configuration saved.')}>
          <Save size={15} /> Save configuration
        </button>
      </div>

      <div className="config-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LOCATIONS</span>
              <h2>Warehouses ({warehouses.length})</h2>
            </div>
            <button
              className="button button-small"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={14} /> Add warehouse
            </button>
          </div>

          {showAddModal && (
            <form onSubmit={handleAddWarehouse} style={{ padding: '1rem', background: 'var(--surface-muted, #f8f9fa)', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.9rem' }}>New Warehouse Location</strong>
                <button type="button" className="icon-button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Warehouse Name (e.g. South Hub)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #ccc)' }}
                  required
                />
                <input
                  type="text"
                  placeholder="City / Location (e.g. Hyderabad)"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #ccc)' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="button button-small" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary button-small" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Location'}
                </button>
              </div>
            </form>
          )}

          <div className="warehouse-list">
            {warehouses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No warehouses registered yet.</p>
            ) : (
              warehouses.map((wh, idx) => (
                <div key={wh.id || idx}>
                  <span className={`warehouse-icon ${idx % 2 === 1 ? 'warehouse-east' : ''}`}>
                    <Package size={16} />
                  </span>
                  <span>
                    <strong>{wh.name}</strong>
                    <small>{wh.location} {wh._count?.stock !== undefined ? `· ${wh._count.stock} SKUs` : ''}</small>
                  </span>
                  <b className="invoice-status invoice-paid">Online</b>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">FULFILLMENT LOGIC</span>
              <h2>Cost weighting</h2>
            </div>
            <Truck size={19} className="muted-icon" />
          </div>
          <label className="field">
            <span>Shipping cost weight</span>
            <input defaultValue="60" type="range" />
          </label>
          <label className="field">
            <span>Warehouse proximity weight</span>
            <input defaultValue="40" type="range" />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Auto-consolidate backorders</strong>
              <small>Prompt when stock arrives mid-fulfillment</small>
            </span>
            <button className="toggle toggle-on">
              <span />
            </button>
          </label>
        </section>
      </div>
      <Notice>Split recommendations use available stock, shipping cost, and proximity weights in real time.</Notice>
    </div>
  );
}

