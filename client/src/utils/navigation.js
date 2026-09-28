// Only same-app paths are allowed as post-login destinations.
export const safeRedirect = (from, fallback) =>
  typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : fallback;
