import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/20/solid';
import Wordmark from './Wordmark';

/**
 * Split-screen frame for sign-in and registration: an editorial fabric panel
 * on large screens, the form alone on small ones.
 */
export function AuthLayout({ heading, subheading, children }) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-strong lg:block" aria-hidden="true">
        <picture>
          <source srcSet="/hero-fabric-patchwork.webp" type="image/webp" />
          <img src="/hero-fabric-patchwork.jpg" alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-strong via-brand-strong/70 to-brand-strong/20" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Wordmark to="/" tone="light" />
          <div>
            <p className="max-w-md font-serif-display text-4xl font-semibold leading-[1.15]">{heading}</p>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/75">{subheading}</p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Wordmark to="/" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, describedBy, invalid, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        required
        maxLength={128}
        className="input pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
    </div>
  );
}
