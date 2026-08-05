import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBuyerProfile } from '../../services/buyerService';
import { getMyOrders } from '../../services/orderService';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { ShoppingBagIcon, ClockIcon, UserCircleIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-blue-50 text-blue-700',
  preparing: 'bg-purple-50 text-purple-700',
  ready_for_dispatch: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

function DashboardPage() {
  const { user } = useBuyerAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getBuyerProfile().then((data) => setProfile(data.profile)).catch(() => setProfile(null));
    getMyOrders().then((data) => setOrders(data.orders));
  }, []);

  const activeOrders = orders.filter((o) => o.status !== 'completed').length;
  const recentOrders = orders.slice(0, 5);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <ShoppingBagIcon className="w-5 h-5 text-emerald-700" />
          </div>
          <p className="text-slate-400 text-sm">Total Orders</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <ClockIcon className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-slate-400 text-sm">Active Orders</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{activeOrders}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <UserCircleIcon className="w-5 h-5 text-emerald-800" />
          </div>
          <p className="text-slate-400 text-sm">Account</p>
          <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity timeline */}
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardDocumentListIcon className="w-5 h-5 text-emerald-700" />
            <h2 className="font-semibold text-slate-800">Recent Activity</h2>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-slate-400 text-sm">No orders yet.</p>
          ) : (
            <div className="relative space-y-6 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
              {recentOrders.map((order) => (
                <div key={order._id} className="relative pl-6">
                  <span className="absolute left-0 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Order #{order._id.slice(-6)}</p>
                      <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()} — ₹{order.total.toFixed(2)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status]}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {orders.length > 5 && (
            <Link to="/orders" className="block text-center text-sm text-emerald-800 font-medium mt-6 hover:text-emerald-900 transition-colors">
              View all orders →
            </Link>
          )}
        </div>

        {profile && (
          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-5">Your Profile</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-400">Business Type</span>
                <span className="font-medium text-slate-800">{profile.businessType || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-400">Industry</span>
                <span className="font-medium text-slate-800">{profile.industry || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-400">Preferred Fabrics</span>
                <span className="font-medium text-slate-800 text-right">{profile.preferredFabricTypes?.join(', ') || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Budget Range</span>
                <span className="font-medium text-slate-800">{profile.budgetRange || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;