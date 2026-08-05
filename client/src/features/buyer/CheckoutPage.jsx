import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCart } from '../../services/cartService';
import { checkout } from '../../services/orderService';
import { CheckIcon, TruckIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA/Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+61', label: 'Australia (+61)' },
];

function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [address, setAddress] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [placedOrders, setPlacedOrders] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCart().then((data) => setCart(data.cart));
  }, []);

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPhoneNumber(digitsOnly);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const contact = `${countryCode} ${phoneNumber}`;
      const data = await checkout({ address, contact });
      setPlacedOrders(data.orders);
    } catch (err) {
      setError(err.response?.data?.error || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrders) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="w-12 h-12" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">Order placed!</h1>
        <p className="text-slate-500 mb-8">
          {placedOrders.length > 1
            ? `Your order was split into ${placedOrders.length} orders across different suppliers.`
            : 'Your order has been confirmed.'}
        </p>

        <div className="space-y-3 text-left">
          {placedOrders.map((order) => (
            <div key={order._id} className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between text-sm text-slate-500 mb-3">
                <span>Order #{order._id.slice(-6)}</span>
                <span className="capitalize font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">{order.status}</span>
              </div>
              {order.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm text-slate-600 py-0.5">
                  <span>{item.name} × {item.quantity} {item.unit || 'unit'}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between font-semibold text-slate-900">
                <span>Total</span>
                <span>₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center mt-8">
          <Link to="/orders" className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-5 py-2.5 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-105">
            View Orders
          </Link>
          <Link to="/home" className="border border-slate-300 text-slate-700 px-5 py-2.5 rounded-full hover:border-slate-500 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!cart) return <p className="text-slate-400 text-center py-16">Loading...</p>;
  if (cart.items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-lg mb-4">Your cart is empty — nothing to check out.</p>
        <Link to="/home" className="text-emerald-800 underline hover:text-emerald-900 transition-colors">
          Browse the marketplace
        </Link>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
            <CheckIcon className="w-3.5 h-3.5" />
          </span>
          Cart
        </div>
        <div className="flex-1 h-px bg-emerald-200" />
        <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
          Checkout
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <div className="flex items-center gap-2 text-slate-400 font-medium text-sm">
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">3</span>
          Confirmation
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handlePlaceOrder} className="lg:col-span-2 space-y-6">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-emerald-700" />
              <h2 className="font-semibold text-slate-800">Shipping Information</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="border border-slate-200 rounded-xl px-2 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  required
                  minLength={7}
                  maxLength={12}
                  placeholder="9876543210"
                  className="flex-1 min-w-0 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Order Review</h2>
            <div className="space-y-2">
              {cart.items.map((item) => (
                <div key={item.productId._id} className="flex justify-between text-sm text-slate-600">
                  <span>{item.productId.name} × {item.quantity} {item.productId.unit || 'unit'}</span>
                  <span>₹{(item.priceAtAdd * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-3.5 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Placing order...' : 'Place Order'}
          </button>
        </form>

        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 h-fit shadow-sm">
          <h2 className="font-bold text-lg text-slate-900 mb-4">Summary</h2>
          <div className="flex justify-between font-bold text-slate-900">
            <span>Total</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;