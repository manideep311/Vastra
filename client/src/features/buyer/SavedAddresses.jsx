import { useState } from 'react';
import { updateAddress, deleteAddress } from '../../services/buyerService';
import { InlineError, Spinner } from '../../components/ui/States';
import { getErrorMessage } from '../../utils/errors';

// Delivery addresses saved at checkout. Checkout pre-fills the default one, so
// this is where a buyer corrects or removes it.
function AddressRow({ address, onSaved }) {
  const [mode, setMode] = useState('view'); // view | edit | confirm-delete
  const [form, setForm] = useState({ address: address.address, contact: address.contact });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action, fallback) => {
    setBusy(true);
    setError('');
    try {
      const { profile } = await action();
      onSaved(profile);
      setMode('view');
    } catch (err) {
      setError(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    run(() => updateAddress(address._id, { address: form.address.trim(), contact: form.contact.trim() }), "Couldn't save this address.");
  };

  const fieldId = (name) => `address-${address._id}-${name}`;

  if (mode === 'edit') {
    return (
      <li className="py-4">
        <form onSubmit={save} className="space-y-3" noValidate>
          <div>
            <label htmlFor={fieldId('address')} className="label">
              Address
            </label>
            <textarea
              id={fieldId('address')}
              rows={2}
              maxLength={500}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label htmlFor={fieldId('contact')} className="label">
              Contact number
            </label>
            <input
              id={fieldId('contact')}
              type="tel"
              maxLength={30}
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              className="input"
            />
          </div>
          {error && <InlineError>{error}</InlineError>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
              {busy && <Spinner className="h-3.5 w-3.5" />}
              Save
            </button>
            <button type="button" disabled={busy} onClick={() => setMode('view')} className="btn btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          {address.label || 'Address'}
          {address.isDefault && address.label !== 'Default' && <span className="ml-2 text-xs font-normal text-muted">Default</span>}
        </p>
        <p className="mt-0.5 whitespace-pre-line text-sm text-ink-2">{address.address}</p>
        <p className="mt-0.5 text-sm text-muted">{address.contact}</p>
        {error && (
          <div className="mt-2">
            <InlineError>{error}</InlineError>
          </div>
        )}
      </div>
      {mode === 'confirm-delete' ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-2">Delete this address?</span>
          <button type="button" disabled={busy} onClick={() => run(() => deleteAddress(address._id), "Couldn't delete this address.")} className="btn btn-danger btn-sm">
            {busy && <Spinner className="h-3.5 w-3.5" />}
            Delete
          </button>
          <button type="button" disabled={busy} onClick={() => setMode('view')} className="btn btn-ghost btn-sm">
            Keep
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('edit')} className="btn btn-secondary btn-sm">
            Edit
          </button>
          <button type="button" onClick={() => setMode('confirm-delete')} className="btn btn-ghost btn-sm">
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

function SavedAddresses({ addresses, onChange }) {
  return (
    <section className="mt-10" aria-labelledby="saved-addresses">
      <h2 id="saved-addresses" className="section-title">
        Delivery addresses
      </h2>
      {addresses.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No saved addresses yet. You can save one at checkout.</p>
      ) : (
        <ul className="card mt-3 divide-y divide-line px-5">
          {addresses.map((address) => (
            <AddressRow key={address._id} address={address} onSaved={onChange} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default SavedAddresses;
