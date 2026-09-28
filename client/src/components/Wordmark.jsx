import { Link } from 'react-router-dom';

// The VASTRA wordmark with its tagline. `tone="light"` for dark backgrounds.
// showTagline: true | false | 'md' (tagline from the md breakpoint up).
function Wordmark({ to = '/home', tone = 'dark', tag, showTagline = true, className = '' }) {
  const light = tone === 'light';
  return (
    <Link to={to} className={`group inline-flex items-center gap-2.5 leading-none ${className}`} aria-label="Vastra home">
      <span className="flex flex-col">
        <span className={`font-serif-display text-[1.35rem] font-semibold tracking-[0.08em] ${light ? 'text-white' : 'text-ink'}`}>
          VASTRA
        </span>
        {showTagline && (
          <span className={`mt-1 text-[10px] font-medium tracking-[0.06em] ${showTagline === 'md' ? 'hidden md:block' : ''} ${light ? 'text-amber-200/90' : 'text-muted'}`}>
            Where Tradition Meets Trade
          </span>
        )}
      </span>
      {tag && <span className="badge bg-accent-soft text-accent-strong">{tag}</span>}
    </Link>
  );
}

export default Wordmark;
