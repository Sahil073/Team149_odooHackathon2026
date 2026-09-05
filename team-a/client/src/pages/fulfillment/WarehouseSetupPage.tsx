import { Package, Plus, Save, Truck } from 'lucide-react';
import { Notice } from '../../components/common/Notice';

export function WarehouseSetupPage({ onNotify }: { onNotify: (message: string) => void }) {
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
              <h2>Warehouses</h2>
            </div>
            <button className="button button-small" onClick={() => onNotify('New warehouse form opened.')}>
              <Plus size={14} /> Add warehouse
            </button>
          </div>
          <div className="warehouse-list">
            <div>
              <span className="warehouse-icon">
                <Package size={16} />
              </span>
              <span>
                <strong>Main Warehouse</strong>
                <small>Bengaluru · 184 SKUs</small>
              </span>
              <b className="invoice-status invoice-paid">Online</b>
            </div>
            <div>
              <span className="warehouse-icon warehouse-east">
                <Package size={16} />
              </span>
              <span>
                <strong>East Depot</strong>
                <small>Chennai · 62 SKUs</small>
              </span>
              <b className="invoice-status invoice-paid">Online</b>
            </div>
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
