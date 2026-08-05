import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSupplierDashboard } from '../../services/supplierService';
import { ArchiveBoxIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, PlusIcon, ChartBarIcon, TrophyIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-blue-50 text-blue-700',
  preparing: 'bg-purple-50 text-purple-700',
  ready_for_dispatch: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

function SupplierDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getSupplierDashboard().then(setData);
  }, []);

  if (!data) return <p className="text-slate-400 text-center py-16">Loading dashboard...</p>;

  const stats = [
    { label: 'Total Products', value: data.totalProducts, icon: ArchiveBoxIcon, color: 'violet' },
    { label: 'Active Products', value: data.activeProducts, icon: CheckCircleIcon, color: 'emerald' },
    { label: 'Pending Orders', value: data.pendingOrders, icon: ClockIcon, color: 'amber' },
    { label: 'Inventory Alerts', value: data.inventoryAlerts.length, icon: ExclamationTriangleIcon, color: 'rose' },
  ];

  const iconBg = {
    violet: 'bg-emerald-50 text-emerald-700',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard</h1>
        <Link
          to="/supplier/inventory"
          className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30"
        >
          <PlusIcon className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg[stat.color]}`}>
              <stat.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-slate-400 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {(data.salesOverTime?.length > 0 || data.topProducts?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {data.salesOverTime?.length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <ChartBarIcon className="w-5 h-5 text-emerald-700" />
                <h2 className="font-semibold text-slate-800">Sales — last 30 days</h2>
              </div>
              <div className="flex items-end gap-1 h-32">
                {data.salesOverTime.map((d) => {
                  const max = Math.max(...data.salesOverTime.map((x) => x.revenue), 1);
                  const heightPct = Math.max((d.revenue / max) * 100, 4);
                  return (
                    <div key={d.date} className="flex-1 group relative">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-600 transition-all duration-300 hover:opacity-80"
                        style={{ height: `${heightPct}%` }}
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[11px] px-2 py-1 rounded-md whitespace-nowrap z-10">
                        {d.date}: ₹{d.revenue.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.topProducts?.length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <TrophyIcon className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-slate-800">Top Products</h2>
              </div>
              <div className="space-y-3">
                {data.topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="text-slate-800 font-medium flex-shrink-0">{p.unitsSold} sold</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Recent Orders</h2>
          {data.recentOrders.length === 0 ? (
            <p className="text-slate-400 text-sm">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <div key={order._id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2.5">
                  <span className="text-slate-600">#{order._id.slice(-6)} — ₹{order.total.toFixed(2)}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status]}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Inventory Alerts</h2>
          {data.inventoryAlerts.length === 0 ? (
            <p className="text-slate-400 text-sm">All stock levels healthy.</p>
          ) : (
            <div className="space-y-3">
              {data.inventoryAlerts.map((product) => (
                <div key={product._id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2.5">
                  <span className="text-slate-600">{product.name}</span>
                  <span className="text-amber-600 font-medium">{product.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupplierDashboardPage;