export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Handles both our own uploaded images (relative paths like "/uploads/x.png")
// and external image URLs (e.g. placeholder/demo images) without double-prefixing.
export const getImageUrl = (path) => {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
};