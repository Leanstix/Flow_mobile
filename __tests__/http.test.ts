import api, { API_REQUEST_TIMEOUT_MS, ApiError, normalizeApiError } from '@/lib/http';

describe('API error normalization', () => {
  it('allows slow connections more than 20 seconds to complete', () => {
    expect(API_REQUEST_TIMEOUT_MS).toBe(60_000);
    expect(api.defaults.timeout).toBe(API_REQUEST_TIMEOUT_MS);
  });

  it('preserves API errors', () => {
    const error = new ApiError('No access', 403);
    expect(normalizeApiError(error)).toBe(error);
  });

  it('extracts backend field errors', () => {
    const error = normalizeApiError({ response: { status: 400, data: { email: ['This email is already registered.'] } } });
    expect(error.status).toBe(400);
    expect(error.message).toContain('already registered');
  });

  it('falls back to network error text', () => {
    expect(normalizeApiError({ message: 'Network Error' }).message).toBe('Network Error');
  });
});
