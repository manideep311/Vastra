import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyProducts, deleteProduct, updateProduct } from '../../services/productService';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const data = await getMyProducts();
    setProducts(data.products);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await deleteProduct(id);
    fetchProducts();
  };

  const toggleStatus = async (product) => {
    const newStatus = product.status === 'available' ? 'out_of_stock' : 'available';
    await updateProduct(product._id, { status: newStatus });
    fetchProducts();
  };

  if (loading) return <p className="text-slate-400 text-center py-16">Loading inventory...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">Inventory</h1>
        <Link
          to="/supplier/inventory/new"
          className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30"
        >
          <PlusIcon className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-400 text-center py-16">No products yet. Add your first one.</p>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 text-slate-500 text-left">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{product.name}</td>
                  <td className="p-4 text-slate-500 whitespace-nowrap">{product.category}</td>
                  <td className="p-4 text-slate-700 whitespace-nowrap">₹{product.price}/{product.unit || 'unit'}</td>
                  <td className="p-4 text-slate-700 whitespace-nowrap">{product.stock}</td>
                  <td className="p-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleStatus(product)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        product.status === 'available' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {product.status === 'available' ? 'Available' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/supplier/inventory/${product._id}/edit`} className="text-slate-400 hover:text-amber-700 transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(product._id)} className="text-slate-400 hover:text-red-600 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InventoryPage;