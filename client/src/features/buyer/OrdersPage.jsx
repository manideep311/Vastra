import { useState, useEffect } from 'react';
import { getMyOrders } from '../../services/orderService';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-blue-50 text-blue-700',
  preparing: 'bg-purple-50 text-purple-700',
  ready_for_dispatch: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders().then((data) => {
      setOrders(data.orders);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-slate-400 text-center py-16">Loading orders...</p>;
  if (orders.length === 0) return <p className="text-slate-400 text-center py-16">No orders yet.</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">Your Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5 transition-all duration-200 hover:shadow-md">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm text-slate-400">Order #{order._id.slice(-6)}</p>
                <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_COLORS[order.status]}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="space-y-1">
              {order.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm text-slate-600">
                  <span>{item.name} × {item.quantity} {item.unit || 'unit'} (₹{item.price}/{item.unit || 'unit'})</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between font-semibold text-slate-900">
              <span>Total</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrdersPage;