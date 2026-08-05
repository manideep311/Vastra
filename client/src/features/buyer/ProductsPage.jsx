import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts } from '../../services/productService';
import { addToCart } from '../../services/cartService';
import { getProductCategoryStats } from '../../services/categoryService';
import { getImageUrl } from '../../utils/config';
import { pluralizeUnit } from '../../utils/units';
import { useWishlist } from '../../context/WishlistContext';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import {
  MagnifyingGlassIcon,
  HeartIcon as HeartOutlineIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon, StarIcon } from '@heroicons/react/24/solid';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

function sortProducts(products, sort) {
  const sorted = [...products];
  if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') sorted.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
  return sorted;
}

function ProductRow({ product, onAddToCart }) {
  const wishlist = useWishlist();
  const { isLoggedIn } = useBuyerAuth();
  const navigate = useNavigate();
  const wishlisted = wishlist?.isWishlisted?.(product._id);
  const inStock = product.status === 'available';

  const handleWishlistClick = () => {
    if (!isLoggedIn) {
      navigate('/buyer/login', { state: { from: '/products' } });
      return;
    }
    wishlist.toggleWishlist(product._id);
  };

  return (
    <div className="flex items-center gap-4 bg-white/70 backdrop-blur-sm border-b border-slate-200/70 last:border-b-0 px-4 py-3.5 transition-colors hover:bg-white/90">
      <Link to={`/products/${product._id}`} className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
        {product.images?.[0] ? (
          <img src={getImageUrl(product.images[0])} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-slate-300 text-[10px] text-center px-1">No image</span>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/products/${product._id}`} className="font-semibold text-slate-900 hover:text-emerald-800 transition-colors truncate">
            {product.name}
          </Link>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
              inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {inStock ? 'In stock' : 'Out of stock'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 truncate">
          {product.category}
          {product.moq ? ` · MOQ ${product.moq} ${product.unit || 'unit'}` : ''}
          {product.ratingCount > 0 && (
            <span className="inline-flex items-center gap-0.5 ml-2 text-amber-600 font-medium">
              <StarIcon className="w-3 h-3" />
              {product.ratingAverage?.toFixed(1)} ({product.ratingCount})
            </span>
          )}
        </p>
      </div>

      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="font-bold text-slate-900">₹{product.price}</p>
        <p className="text-slate-400 text-xs">/{product.unit || 'unit'}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleWishlistClick}
          aria-label="Toggle wishlist"
          className="w-9 h-9 rounded-full bg-white/80 border border-slate-200/70 flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
        >
          {wishlisted ? (
            <HeartIcon className="w-4 h-4 text-rose-500" />
          ) : (
            <HeartOutlineIcon className="w-4 h-4 text-slate-500" />
          )}
        </button>
        <button
          onClick={() => onAddToCart(product._id)}
          disabled={!inStock}
          className="text-sm font-medium bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-4 py-2 rounded-full transition-all duration-200 hover:shadow-md hover:shadow-emerald-700/30 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-200/70 last:border-b-0 px-4 py-3.5 animate-pulse">
      <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 bg-slate-100 rounded" />
        <div className="h-3 w-1/2 bg-slate-100 rounded" />
      </div>
      <div className="h-4 w-12 bg-slate-100 rounded hidden sm:block" />
      <div className="h-9 w-24 bg-slate-100 rounded-full" />
    </div>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    getProductCategoryStats()
      .then((data) => setCategories(['All', ...data.categories.map((c) => c.category)]))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(
    async (pageNum, { append = false } = {}) => {
      append ? setLoadingMore(true) : setLoading(true);
      try {
        const params = { page: pageNum, limit: PAGE_SIZE };
        if (keyword) params.keyword = keyword;
        if (category !== 'All') params.category = category;
        const data = await getProducts(params);
        setProducts((prev) => (append ? [...prev, ...data.products] : data.products));
        setPage(data.pagination.page);
        setPages(data.pagination.pages);
        setTotal(data.pagination.total);
      } catch (err) {
        console.error(err);
      } finally {
        append ? setLoadingMore(false) : setLoading(false);
      }
    },
    [keyword, category]
  );

  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const handleLoadMore = () => {
    fetchProducts(page + 1, { append: true });
  };

  const handleAddToCart = async (productId) => {
    const product = products.find((p) => p._id === productId);
    try {
      await addToCart(productId, 1);
      setToast(`Added 1 ${pluralizeUnit(product?.unit, 1)} to cart ✓`);
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to add to cart');
    } finally {
      setTimeout(() => setToast(''), 2200);
    }
  };

  const sortedProducts = sortProducts(products, sort);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">All Products</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} fabrics from verified suppliers</p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search fabrics..."
              className="pl-9 pr-3 py-2 w-48 sm:w-56 border border-slate-200 rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-slate-200 rounded-full bg-white text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All categories' : cat}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-slate-200 rounded-full bg-white text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </form>
      </div>

      {toast && (
        <div className="fixed bottom-40 md:bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-50">
          {toast}
        </div>
      )}

      <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBagIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500">No products found.</p>
            <p className="text-slate-300 text-sm mt-1">Try a different search or category.</p>
          </div>
        ) : (
          sortedProducts.map((product) => (
            <ProductRow key={product._id} product={product} onAddToCart={handleAddToCart} />
          ))
        )}
      </div>

      {!loading && page < pages && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-sm font-medium border border-slate-200 text-slate-600 px-6 py-2.5 rounded-full hover:border-emerald-300 hover:text-emerald-800 transition-all duration-200 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductsPage;
