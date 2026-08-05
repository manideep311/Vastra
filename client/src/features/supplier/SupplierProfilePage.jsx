import { useState, useEffect } from 'react';
import { getSupplierProfile, updateSupplierProfile } from '../../services/supplierService';

function SupplierProfilePage() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSupplierProfile().then((data) => setForm(data.profile));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateSupplierProfile({
      businessName: form.businessName,
      businessAddress: form.businessAddress,
      operatingHours: form.operatingHours,
      contactInfo: form.contactInfo,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!form) return <p className="text-slate-400 text-center py-16">Loading profile...</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">Business Profile</h1>
      <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 space-y-4 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
          <input
            type="text"
            value={form.businessName || ''}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
          <input
            type="text"
            value={form.contactInfo?.phone || ''}
            onChange={(e) => setForm({ ...form, contactInfo: { ...form.contactInfo, phone: e.target.value } })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
          <textarea
            rows={2}
            value={form.businessAddress || ''}
            onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Operating Hours</label>
          <input
            type="text"
            value={form.operatingHours || ''}
            onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.01] active:scale-95"
        >
          {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export default SupplierProfilePage;