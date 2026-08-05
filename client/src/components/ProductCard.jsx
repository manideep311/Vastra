import { Link, useNavigate } from 'react-router-dom';
import { HeartIcon, StarIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { getImageUrl } from '../utils/config';
import { useWishlist } from '../context/WishlistContext';
import { useBuyerAuth } from '../context/BuyerAuthContext';

function ProductCard({ product, onAddToCart }) {
  const wishlist = useWishlist();
  const { isLoggedIn } = useBuyerAuth();
  const navigate = useNavigate();
  const wishlisted = wishlist?.isWishlisted?.(product._id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      navigate('/buyer/login', { state: { from: `/products/${product._id}` } });
      return;
    }
    wishlist.toggleWishlist(product._id);
  };

  return (
    <div className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/70 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-900/10 hover:-translate-y-1.5 hover:border-emerald-200">
      <Link to={`/products/${product._id}`}>
        <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center overflow-hidden relative">
          {product.images?.[0] ? (
            <img
              src={getImageUrl(product.images[0])}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <span className="text-slate-300 text-sm font-medium">No image yet</span>
          )}
          <span
            className={`absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md ${
              product.status === 'available' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
            }`}
          >
            {product.status === 'available' ? 'In Stock' : 'Out of Stock'}
          </span>

          {wishlist && (
            <button
              onClick={handleWishlistClick}
              aria-label="Toggle wishlist"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110"
            >
              {wishlisted ? (
                <HeartIcon className="w-4 h-4 text-rose-500" />
              ) : (
                <HeartOutlineIcon className="w-4 h-4 text-slate-500" />
              )}
            </button>
          )}
        </div>
      </Link>

      <div className="p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">{product.category}</p>
          {product.ratingCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600">
              <StarIcon className="w-3.5 h-3.5" />
              {product.ratingAverage?.toFixed(1)}
            </span>
          )}
        </div>
        <Link to={`/products/${product._id}`}>
          <h3 className="font-semibold text-slate-900 mt-1.5 leading-snug transition-colors group-hover:text-emerald-800">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-5">
          <div>
            <span className="text-xl font-bold text-slate-900">₹{product.price}</span>
            <span className="text-slate-400 text-xs"> /{product.unit || 'unit'}</span>
          </div>
          <button
            onClick={() => onAddToCart(product._id)}
            className="text-sm font-medium bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-4 py-2 rounded-full transition-all duration-200 hover:shadow-md hover:shadow-emerald-700/30 hover:scale-105 active:scale-95"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;