export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Wikimedia pre-renders thumbnails at fixed widths; asking for one of these
// is served straight from their CDN cache.
const WIKIMEDIA_STEPS = [120, 250, 330, 500, 960, 1280];
const WIKIMEDIA_FILEPATH = /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//;

/**
 * Resolves a stored image path to a URL sized for where it is shown.
 * `width` is the pixel width worth downloading (already allowing for
 * high-density screens), so a 80px list thumbnail never pulls a full photo:
 * - database images ('/api/images/...') pick their 240px, 640px or full variant
 * - Wikimedia seed photos snap to the nearest thumbnail step at or above it
 * - legacy '/uploads/' files and any other URL are returned unchanged
 */
export const getImageUrl = (path, { width } = {}) => {
  if (!path) return null;
  if (path.startsWith('/api/images/')) {
    const variant = !width ? '' : width <= 250 ? '?size=small' : width <= 640 ? '?size=thumb' : '';
    return `${API_BASE_URL}${path}${variant}`;
  }
  if (width && WIKIMEDIA_FILEPATH.test(path)) {
    const step = WIKIMEDIA_STEPS.find((s) => s >= width) || WIKIMEDIA_STEPS[WIKIMEDIA_STEPS.length - 1];
    const url = new URL(path);
    url.searchParams.set('width', String(step));
    return url.toString();
  }
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
};