import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chatWithAssistant } from '../services/aiService';
import { getImageUrl } from '../utils/config';
import assistantIcon from '../assets/vastra-assistant-icon.png';

// Shown as clickable chips until the buyer sends their first message — gives
// people something concrete to tap instead of staring at an empty input.
const SUGGESTED_PROMPTS = [
  'Recommend fabrics for shirts',
  'Compare silk vs cotton',
  "What's good for upholstery?",
  'Show me breathable summer fabrics',
];

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Vastra Assistant. Ask me about fabrics, get recommendations, or compare products.", products: [] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newHistory = [...messages.map((m) => ({ role: m.role, content: m.content }))];
    setMessages((prev) => [...prev, { role: 'user', content: trimmed, products: [] }]);
    setInput('');
    setLoading(true);

    try {
      const data = await chatWithAssistant(trimmed, newHistory, null);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, products: data.referencedProducts || [] }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', products: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (prompt) => {
    sendMessage(prompt);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 md:bottom-6 right-6 w-14 h-14 rounded-full shadow-xl shadow-emerald-700/30 flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-800"
        aria-label="Toggle AI assistant"
      >
        {isOpen ? (
          <span className="text-2xl text-white">✕</span>
        ) : (
          <img src={assistantIcon} alt="" className="w-full h-full object-cover" />
        )}
      </button>

      <div
        className={`fixed bottom-40 md:bottom-24 right-6 w-[90vw] max-w-sm h-[70vh] max-h-[600px] bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 flex flex-col z-50 transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-950 text-white px-4 py-3 rounded-t-2xl flex items-center gap-2">
          <img src={assistantIcon} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          <span className="font-display font-semibold">Vastra Assistant</span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm ${
                    msg.role === 'user' ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.products?.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {msg.products.slice(0, 3).map((p) => (
                      <Link
                        key={p._id}
                        to={`/products/${p._id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 hover:border-slate-400 transition-colors"
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {p.images?.[0] ? (
                            <img src={getImageUrl(p.images[0])} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-slate-300 text-xs">–</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                          <p className="text-xs text-slate-400">₹{p.price}/unit</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSuggestionClick(prompt)}
                  className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 px-3 py-2 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            aria-label="Voice input"
          >
            🎤
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about fabrics..."
            className="flex-1 min-w-0 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-9 h-9 bg-gradient-to-br from-emerald-700 to-emerald-800 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:shadow-md hover:shadow-emerald-700/30 disabled:opacity-50"
          >
            →
          </button>
        </form>
      </div>
    </>
  );
}

export default ChatWidget;