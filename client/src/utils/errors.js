// Turns any API/network error into a sentence that's safe to show a user.
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (error.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  if (error.isAxiosError && !error.response) return "Can't reach Vastra right now. Check your connection and try again.";
  if (error.response?.status === 429) return error.response.data?.error || 'Too many requests. Please wait a moment.';
  const message = error.response?.data?.error || error.message;
  return typeof message === 'string' && message.length < 200 ? message : fallback;
};
