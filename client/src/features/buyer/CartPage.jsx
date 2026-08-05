import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, updateCartItem, removeCartItem } from '../../services/cartService';
import { getImageUrl } from '../../utils/config';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { pluralizeUnit } from '../../utils/units';
import { MinusIcon, PlusIcon, TrashIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

function CartPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  const { isLoggedIn } = useBuyerAuth();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    const data = await getCart();
    setCart(data.cart);
    setLoading(false);
  };

  // A product's real minimum in this cart — unset/1 means no minimum.
  const moqFor = (product) => (product?.moq > 1 ? product.moq : 1);

  const handleQuantityChange = async (productId, newQty) => {
    if (newQty < 1) return;
    try {
      const data = await updateCartItem(productId, newQty);
      setCart(data.cart);
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to update quantity');
      setTimeout(() => setToast(''), 2200);
    }
  };

  const handleRemove = async (productId) => {
    const data = await removeCartItem(productId);
    setCart(data.cart);
  };

  const handleCheckout = () => {
    // Checkout requires a buyer account — send guests to login and bring
    // them straight back to checkout afterwards.
    if (!isLoggedIn) {
      navigate('/buyer/login', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };

  if (loading) return <p className="text-slate-400 text-center py-16">Loading cart...</p>;

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBagIcon className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-slate-500 text-lg mb-4">Your cart is empty.</p>
        <Link
          to="/home"
          className="inline-block bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-105"
        >
          Browse the marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-4">Your Cart</h1>
        {items.map((item) => {
          const moq = moqFor(item.productId);
          const atMoqFloor = item.quantity <= moq;
          return (
            <div
              key={item.productId._id}
              className="flex items-center gap-4 bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.productId.images?.[0] ? (
                  <img src={getImageUrl(item.productId.images[0])} alt={item.productId.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-300 text-xs">No image</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{item.productId.name}</p>
                <p className="text-sm text-slate-400">₹{item.priceAtAdd}/{item.productId.unit || 'unit'}</p>
                {moq > 1 && <p className="text-xs text-slate-400 mt-0.5">Minimum order: {moq} {pluralizeUnit(item.productId.unit, moq)}</p>}
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center border border-slate-200 rounded-full overflow-hidden bg-white">
                  <button
                    onClick={() => handleQuantityChange(item.productId._id, item.quantity - 1)}
                    disabled={atMoqFloor}
                    aria-label="Decrease quantity"
                    className="p-2 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <MinusIcon className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <span className="px-4 font-medium text-sm whitespace-nowrap">
                    {item.quantity} {pluralizeUnit(item.productId.unit, item.quantity)}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.productId._id, item.quantity + 1)}
                    aria-label="Increase quantity"
                    className="p-2 hover:bg-slate-50 transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              </div>
              <p className="font-semibold text-slate-900 w-20 text-right">₹{(item.priceAtAdd * item.quantity).toFixed(2)}</p>
              <button
                onClick={() => handleRemove(item.productId._id)}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 h-fit shadow-sm">
        <h2 className="font-bold text-lg text-slate-900 mb-4">Order Summary</h2>
        <div className="flex justify-between text-slate-600 mb-2 text-sm">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="border-t border-slate-100 my-4" />
        <div className="flex justify-between font-bold text-slate-900 mb-6">
          <span>Total</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-3 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.02] active:scale-95"
        >
          Proceed to Checkout
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-40 md:bottom-6 left-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-50">{toast}</div>
      )}
    </div>
  );
}

export default CartPage;