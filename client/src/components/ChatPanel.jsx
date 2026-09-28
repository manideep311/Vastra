import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useMatch } from 'react-router-dom';
import { ArrowUpIcon, MicrophoneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { chatWithAssistant } from '../services/aiService';
import { getErrorMessage } from '../utils/errors';
import { formatINR } from '../utils/pricing';
import ProductImage from './ui/ProductImage';
import assistantIcon from '../assets/vastra-assistant-icon.webp';

const GREETING = {
  role: 'assistant',
  content: "Hi, I'm the Vastra Assistant. Tell me what you're making and I'll find fabrics that fit — with prices, MOQs and stock from the live catalog.",
  products: [],
};

const SUGGESTED_PROMPTS = [
  'Breathable fabric for summer shirts',
  'Compare silk and cotton for sarees',
  "What's good for upholstery?",
  'Low-MOQ options under ₹300/meter',
];

const PRODUCT_PROMPTS = ['What is this fabric best used for?', 'Is there bulk pricing on this?'];

const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function ChatPanel({ open, onClose }) {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const productMatch = useMatch('/products/:id');
  const contextProductId = productMatch?.params.id;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const toggleVoiceInput = () => {
    if (!SpeechRecognition) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const sendMessage = useCallback(
    async (text, { productId } = {}) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      // Earlier turns give the model context; failed turns and the greeting are left out.
      const history = messages
        .filter((m) => m !== GREETING && !m.failed)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev.filter((m) => !m.failed), { role: 'user', content: trimmed, products: [] }]);
      setInput('');
      setLoading(true);

      try {
        const data = await chatWithAssistant(trimmed, history, productId || null);
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, products: data.referencedProducts || [] }]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            failed: true,
            retry: { text: trimmed, productId },
            content: getErrorMessage(err, "I couldn't reach the catalog just now."),
            products: [],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  const resetConversation = () => {
    setMessages([GREETING]);
    setInput('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isFresh = messages.length === 1;

  return (
    <div
      role="dialog"
      aria-label="Vastra Assistant"
      aria-hidden={!open}
      inert={!open || undefined}
      className={`fixed inset-x-2 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-50 flex h-[min(34rem,calc(100dvh-12rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_64px_-24px_rgba(22,33,28,0.45)] transition-[opacity,transform] duration-200 ease-out sm:left-auto sm:right-4 sm:w-[23rem] md:bottom-24 md:right-6 ${
        open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-[0.97] opacity-0'
      }`}
    >
      <header className="flex items-center gap-3 border-b border-line bg-brand-strong px-4 py-3 text-white">
        <img src={assistantIcon} alt="" width="32" height="32" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/15" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight">Vastra Assistant</p>
          <p className="text-[11px] text-emerald-100/75">Answers from the live catalog</p>
        </div>
        {!isFresh && (
          <button type="button" onClick={resetConversation} className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Start a new conversation" title="New conversation">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
        {messages.map((msg, i) => (
          <div key={i} className={`flex animate-fade-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[88%]">
              <div
                className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-br-md bg-brand text-white'
                    : msg.failed
                      ? 'rounded-bl-md border border-danger/20 bg-danger-soft text-danger'
                      : 'rounded-bl-md bg-surface-2 text-ink'
                }`}
              >
                {msg.content}
              </div>
              {msg.failed && (
                <button
                  type="button"
                  onClick={() => sendMessage(msg.retry.text, { productId: msg.retry.productId })}
                  disabled={loading}
                  className="mt-1.5 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                >
                  Try again
                </button>
              )}
              {msg.products?.length > 0 && (
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {msg.products.slice(0, 3).map((p) => (
                    <li key={p._id}>
                      <Link to={`/products/${p._id}`} onClick={onClose} className="flex items-center gap-3 bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2">
                        <ProductImage src={p.images?.[0]} className="h-11 w-11 flex-shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-ink">{p.name}</span>
                          <span className="block text-xs text-muted">
                            <span className="font-semibold tabular-nums text-ink-2">{formatINR(p.price)}</span>/{p.unit || 'unit'}
                            {p.moq > 1 && ` · MOQ ${p.moq}`}
                            {(p.status !== 'available' || p.stock <= 0) && <span className="text-danger"> · Out of stock</span>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start" aria-label="Assistant is typing">
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3.5">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${d * 180}ms` }} />
              ))}
            </div>
          </div>
        )}

        {isFresh && !loading && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {contextProductId &&
              PRODUCT_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt, { productId: contextProductId })}
                  className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-strong transition-colors hover:border-accent/60"
                >
                  {prompt}
                </button>
              ))}
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-brand/40 hover:text-brand"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-3">
        {SpeechRecognition && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`icon-btn h-9 w-9 flex-shrink-0 ${isListening ? 'bg-danger text-white hover:bg-danger hover:text-white' : ''}`}
            aria-label={isListening ? 'Stop voice input' : 'Speak your question'}
            aria-pressed={isListening}
          >
            <MicrophoneIcon className="h-4.5 w-4.5" />
          </button>
        )}
        <label htmlFor="assistant-input" className="sr-only">
          Ask the assistant
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
          type="text"
          value={input}
          maxLength={1000}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening…' : 'Ask about fabrics, MOQs, pricing…'}
          className="input h-10 min-w-0 flex-1 rounded-full"
          autoComplete="off"
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary h-10 w-10 flex-shrink-0 px-0" aria-label="Send message">
          <ArrowUpIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
