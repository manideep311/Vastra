import { useState, useEffect } from 'react';
import { getProducts } from '../../services/productService';
import { addToCart } from '../../services/cartService';
import { getProductCategoryStats } from '../../services/categoryService';
import { pluralizeUnit } from '../../utils/units';
import ProductCard from '../../components/ProductCard';
import { MagnifyingGlassIcon, ShieldCheckIcon, TruckIcon, SparklesIcon } from '@heroicons/react/24/outline';

function SkeletonCard() {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/70 overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-100" />
      <div className="p-5 space-y-2">
        <div className="h-2.5 w-16 bg-slate-100 rounded" />
        <div className="h-4 w-3/4 bg-slate-100 rounded" />
        <div className="h-6 w-1/2 bg-slate-100 rounded mt-2" />
      </div>
    </div>
  );
}

function Discovery() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('All');
  const [toast, setToast] = useState('');
  const [categories, setCategories] = useState(['All']);

  useEffect(() => {
    getProductCategoryStats()
      .then((data) => setCategories(['All', ...data.categories.map((c) => c.category)]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (category !== 'All') params.category = category;
      const data = await getProducts(params);
      setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
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

  const featured = products.slice(0, 4);
  const rest = products.slice(4);

  return (
    <div>
      {/* Hero */}
      <div className="relative text-center mb-10 py-20 px-6 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-3xl text-white overflow-hidden">
        {/* Drifting fabric swatches */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="fabric-swatch fabric-anim-a w-40 h-52 -top-10 -left-10 bg-gradient-to-br from-amber-400/40 to-amber-600/20 opacity-40" />
          <div className="fabric-swatch fabric-anim-b w-32 h-44 top-8 right-[8%] bg-gradient-to-br from-emerald-400/40 to-emerald-900/20 opacity-40" style={{ animationDelay: '-3s' }} />
          <div className="fabric-swatch fabric-anim-c w-44 h-32 top-1/3 left-[6%] bg-gradient-to-br from-rose-400/30 to-rose-700/15 opacity-30" style={{ animationDelay: '-6s' }} />
          <div className="fabric-swatch fabric-anim-d w-36 h-48 bottom-4 right-[4%] bg-gradient-to-br from-emerald-400/30 to-emerald-700/15 opacity-30" style={{ animationDelay: '-2s' }} />
          <div className="fabric-swatch fabric-anim-a w-28 h-36 bottom-8 left-1/4 bg-gradient-to-br from-sky-400/30 to-sky-700/15 opacity-30" style={{ animationDelay: '-9s' }} />
          <div className="fabric-swatch fabric-anim-b w-48 h-28 -bottom-6 right-1/3 bg-gradient-to-br from-indigo-400/30 to-indigo-800/15 opacity-30" style={{ animationDelay: '-5s' }} />
          <div className="fabric-swatch fabric-anim-c w-24 h-32 top-6 left-[40%] bg-gradient-to-br from-teal-400/25 to-teal-700/10 opacity-25" style={{ animationDelay: '-11s' }} />
          <div className="fabric-swatch fabric-anim-d w-52 h-24 -top-6 right-[18%] bg-gradient-to-br from-stone-300/25 to-stone-500/10 opacity-25" style={{ animationDelay: '-7s' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-emerald-900/60 to-emerald-950/70" />
        </div>
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/10 text-amber-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <SparklesIcon className="w-3.5 h-3.5" />
            Premium fabric sourcing, simplified
          </span>
          <h1 className="font-serif-display text-4xl md:text-6xl font-extrabold mb-4 tracking-tight leading-[1.1]">
            Source fabrics directly<br className="hidden md:block" /> from <span className="text-emerald-300">verified suppliers</span>
          </h1>
          <p className="text-emerald-200 text-lg max-w-xl mx-auto">Browse, compare, and order — all in one elegant marketplace.</p>

          {/* Glass search container */}
          <form onSubmit={handleSearch} className="relative mt-10 max-w-xl mx-auto">
            <div className="flex gap-2 bg-white/10 backdrop-blur-xl border border-white/15 rounded-full p-1.5 shadow-lg">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-200" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search fabrics, e.g. 'breathable cotton'..."
                  className="w-full bg-transparent text-white placeholder-emerald-200 pl-11 pr-4 py-2.5 rounded-full focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-amber-400 text-emerald-950 px-6 py-2.5 rounded-full hover:from-amber-400 hover:to-amber-300 transition-all duration-200 hover:scale-105 active:scale-95 font-semibold"
              >
                Search
              </button>
            </div>
          </form>

          {/* Stat counters */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-12">
            <div>
              <p className="font-display text-2xl md:text-3xl font-extrabold text-amber-300">350K+</p>
              <p className="text-emerald-200 text-xs md:text-sm mt-1">Verified Suppliers</p>
            </div>
            <div>
              <p className="font-display text-2xl md:text-3xl font-extrabold text-amber-300">400K+</p>
              <p className="text-emerald-200 text-xs md:text-sm mt-1">Products Listed</p>
            </div>
            <div>
              <p className="font-display text-2xl md:text-3xl font-extrabold text-amber-300">600K+</p>
              <p className="text-emerald-200 text-xs md:text-sm mt-1">Trusted Buyers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="flex items-center gap-2 justify-center bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl py-3 px-2 text-center transition-colors hover:border-emerald-200">
          <ShieldCheckIcon className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span className="text-xs md:text-sm font-medium text-slate-700">Verified Suppliers</span>
        </div>
        <div className="flex items-center gap-2 justify-center bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl py-3 px-2 text-center transition-colors hover:border-emerald-200">
          <TruckIcon className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span className="text-xs md:text-sm font-medium text-slate-700">Reliable Fulfillment</span>
        </div>
        <div className="flex items-center gap-2 justify-center bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl py-3 px-2 text-center transition-colors hover:border-emerald-200">
          <SparklesIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="text-xs md:text-sm font-medium text-slate-700">AI-Powered Search</span>
        </div>
      </div>

      {/* Floating category chips */}
      <div className="flex gap-2 mb-10 flex-wrap justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm ${
              category === cat
                ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-emerald-700/20'
                : 'bg-white/70 backdrop-blur-sm text-slate-600 border border-slate-200/70 hover:border-emerald-300 hover:-translate-y-0.5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-40 md:bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-50">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg">No products found.</p>
          <p className="text-slate-300 text-sm mt-1">Try a different search or category.</p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <div className="mb-14">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="font-display text-2xl font-bold text-slate-900">Featured</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featured.map((product) => (
                  <ProductCard key={product._id} product={product} onAddToCart={handleAddToCart} />
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="font-display text-2xl font-bold text-slate-900">All Products</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {rest.map((product) => (
                  <ProductCard key={product._id} product={product} onAddToCart={handleAddToCart} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Discovery;