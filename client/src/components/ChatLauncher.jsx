import { lazy, Suspense, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import assistantIcon from '../assets/vastra-assistant-icon.webp';

// The conversation UI (and its prompt logic) is only downloaded the first time
// someone opens the assistant — browsing the catalog never pays for it.
const loadPanel = () => import('./ChatPanel');
const ChatPanel = lazy(loadPanel);

function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // keep the conversation after first open

  const toggle = () => {
    setMounted(true);
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={loadPanel}
        onFocus={loadPanel}
        aria-label={open ? 'Close Vastra Assistant' : 'Open Vastra Assistant'}
        aria-expanded={open}
        className={`fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-[0_10px_28px_-10px_rgba(12,58,43,0.6)] ring-1 ring-black/5 transition-transform duration-200 hover:scale-105 active:scale-95 md:bottom-6 md:right-6 ${
          open ? 'bg-ink text-white' : 'bg-brand'
        }`}
      >
        {open ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <img src={assistantIcon} alt="" width="56" height="56" className="h-full w-full object-cover" />
        )}
      </button>

      {mounted && (
        <Suspense fallback={null}>
          <ChatPanel open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

export default ChatLauncher;
