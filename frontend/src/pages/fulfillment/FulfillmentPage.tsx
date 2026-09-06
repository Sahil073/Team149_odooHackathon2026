import { ArrowRight, Package, Sparkles } from 'lucide-react';
import type { FulfillmentOrder, FulfillmentStatus } from '../../types';

type FulfillmentPageProps = {
  orders: FulfillmentOrder[];
  filter: 'All' | FulfillmentStatus;
  onFilter: (filter: 'All' | FulfillmentStatus) => void;
  onOpen: (order: FulfillmentOrder) => void;
};

export function FulfillmentPage({ orders, filter, onFilter, onOpen }: FulfillmentPageProps) {
  const filteredOrders = filter === 'All' ? orders : orders.filter((order) => order.status === filter);
  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">OPERATIONS / FULFILLMENT</span>
          <h1>Fulfillment<span className="heading-period">.</span></h1>
          <p>See live stock, warehouse coverage, and orders waiting to ship.</p>
        </div>
        <span className="page-context"><Package size={15} /> {orders.length} orders in queue</span>
      </div>
      <section className="panel stock-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">LIVE INVENTORY</span>
            <h2>Stock by warehouse</h2>
          </div>
          <span className="sync-label"><span /> Synced 4 min ago</span>
        </div>
        <div className="stock-grid">
          {[
            { label: 'Total available', value: '79', detail: 'Across 2 warehouses', tone: 'stock-blue' },
            { label: 'Reserved units', value: '36', detail: 'For active quotations', tone: 'stock-violet' },
            { label: 'Backordered', value: '4', detail: 'Needs replenishment', tone: 'stock-orange' },
          ].map((stat) => (
            <div className="stock-stat" key={stat.label}>
              <span className={`stock-stat-icon ${stat.tone}`}>
                <Package size={16} />
              </span>
              <div>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
                <small>{stat.detail}</small>
              </div>
            </div>
          ))}
        </div>
        <div className="table-scroll">
          <table className="operations-table stock-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Product</th>
                <th>In stock</th>
                <th>Reserved</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Main Warehouse', 'Laptop Pro 14', '40', '18', '22'],
                ['East Depot', 'Laptop Pro 14', '10', '6', '4'],
                ['Main Warehouse', 'Docking Station', '65', '12', '53'],
              ].map((row) => (
                <tr key={`${row[0]}-${row[1]}`}>
                  <td><strong>{row[0]}</strong></td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td><span className="available-value">{row[4]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="operations-section-heading">
        <div>
          <span className="eyebrow">ORDERS AWAITING FULFILLMENT</span>
          <h2>Open warehouse decisions</h2>
        </div>
        <div className="filter-tabs">
          {(['All', 'Split pending', 'Backorder', 'Ready'] as Array<'All' | FulfillmentStatus>).map((item) => (
            <button className={filter === item ? 'filter-tab-active' : ''} key={item} onClick={() => onFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="operations-table-panel">
        <div className="table-scroll">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Warehouses</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => onOpen(order)}>
                  <td>
                    <strong>{order.id}</strong>
                    <span>Quotation order</span>
                  </td>
                  <td>
                    <span className="table-customer">
                      <span className="avatar avatar-small avatar-cyan">{order.initials}</span>
                      {order.customer}
                    </span>
                  </td>
                  <td>{order.items} units</td>
                  <td>
                    <span className={`fulfillment-status fulfillment-${order.status.toLowerCase().replace(' ', '-')}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.warehouses}</td>
                  <td><ArrowRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredOrders.length && <div className="empty-table">No orders match this filter.</div>}
        </div>
      </div>
      <div className="operations-note">
        <Sparkles size={15} />
        <span>Click an order to review its recommended warehouse split and shipping cost.</span>
      </div>
    </div>
  );
}
