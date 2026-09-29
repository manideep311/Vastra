import { useState } from 'react';
import { getImageUrl } from '../../utils/config';

/**
 * Product photo that never shows a broken-image icon: lazy-loaded, decoded
 * off the main thread, fades in when ready, and falls back to a woven
 * placeholder if the file is missing. The parent sets the box size, so the
 * layout never shifts while images load.
 */
function ImageFrame({ url, alt, className, imgClassName, eager, sizes }) {
  const [status, setStatus] = useState(url ? 'loading' : 'error');

  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {status !== 'error' && (
        <img
          src={url}
          alt={alt}
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : undefined}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`h-full w-full object-cover transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
      {status !== 'loaded' && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${status === 'loading' ? 'skeleton rounded-none' : ''}`}
          style={
            status === 'error'
              ? {
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(22,33,28,0.05) 0 2px, transparent 2px 9px), repeating-linear-gradient(-45deg, rgba(22,33,28,0.05) 0 2px, transparent 2px 9px)',
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// Keyed by URL so switching images (e.g. in a gallery) restarts the fade-in.
// `width`: pixels worth downloading for this slot (see getImageUrl).
function ProductImage({ src, alt = '', className = '', imgClassName = '', eager = false, sizes, width }) {
  const url = getImageUrl(src, { width });
  return <ImageFrame key={url || 'none'} url={url} alt={alt} className={className} imgClassName={imgClassName} eager={eager} sizes={sizes} />;
}

export default ProductImage;
