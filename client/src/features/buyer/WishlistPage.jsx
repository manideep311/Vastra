import { Link } from 'react-router-dom';
import { HeartIcon } from '@heroicons/react/24/outline';
import { useWishlist } from '../../context/WishlistContext';
import { addToCart } from '../../services/cartService';
import ProductCard from '../../components/ProductCard';
import { useState } from 'react';

function WishlistPage() {
  const wishlist = useWishlist();
  const [toast, setToast] = useState('');

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      setToast('Added to cart ✓');
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to add to cart');
    } finally {
      setTimeout(() => setToast(''), 2200);
    }
  };

  if (wishlist?.loading) return <p className="text-slate-400 text-center py-16">Loading wishlist...</p>;

  const products = wishlist?.products || [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">Your Wishlist</h1>

      {products.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <HeartIcon className="w-7 h-7 text-rose-400" />
          </div>
          <p className="text-slate-500 text-lg mb-4">Nothing saved yet.</p>
          <Link
            to="/home"
            className="inline-block bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-105"
          >
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} onAddToCart={handleAddToCart} />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-40 md:bottom-6 left-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;
