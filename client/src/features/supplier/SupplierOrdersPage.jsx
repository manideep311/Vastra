import { useState, useEffect } from 'react';
import { getSupplierOrders, updateOrderStatus } from '../../services/supplierService';

const STATUS_FLOW = ['pending', 'accepted', 'preparing', 'ready_for_dispatch', 'completed'];
const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-blue-50 text-blue-700',
  preparing: 'bg-purple-50 text-purple-700',
  ready_for_dispatch: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

function SupplierOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const data = await getSupplierOrders();
    setOrders(data.orders);
    setLoading(false);
  };

  const handleAdvanceStatus = async (order) => {
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const nextStatus = STATUS_FLOW[currentIndex + 1];
    if (!nextStatus) return;

    setUpdatingId(order._id);
    try {
      await updateOrderStatus(order._id, nextStatus);
      fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <p className="text-slate-400 text-center py-16">Loading orders...</p>;
  if (orders.length === 0) return <p className="text-slate-400 text-center py-16">No incoming orders yet.</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">Incoming Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => {
          const currentIndex = STATUS_FLOW.indexOf(order.status);
          const nextStatus = STATUS_FLOW[currentIndex + 1];

          return (
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

              <div className="space-y-1 mb-3">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm text-slate-600">
                    <span>{item.name} × {item.quantity} {item.unit || 'unit'} (₹{item.price}/{item.unit || 'unit'})</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="text-sm text-slate-500 mb-3">
                <p>Ship to: {order.shippingInfo?.address}</p>
                <p>Contact: {order.shippingInfo?.contact}</p>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-900">Total: ₹{order.total.toFixed(2)}</span>
                {nextStatus ? (
                  <button
                    onClick={() => handleAdvanceStatus(order)}
                    disabled={updatingId === order._id}
                    className="text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 capitalize hover:shadow-lg hover:shadow-amber-500/30"
                  >
                    {updatingId === order._id ? 'Updating...' : `Mark as ${nextStatus.replace(/_/g, ' ')}`}
                  </button>
                ) : (
                  <span className="text-sm text-slate-400">Order complete</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SupplierOrdersPage;