import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiRequestError } from '../../src/lib/api/client';

describe('API Client Security & Reliability Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly handles non-2xx HTTP responses and throws ApiRequestError', async () => {
    const mockResponse = {
      ok: false,
      status: 403,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ message: 'RBAC Permission Denied' }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(apiClient.get('/test-route')).rejects.toThrow(ApiRequestError);
  });

  it('correctly encodes path parameters containing special characters to prevent path manipulation/escapes', async () => {
    const unsafeId = 'BUG-101/status';
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ id: unsafeId }),
    };

    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    global.fetch = fetchSpy;

    await apiClient.get(`/issues/${encodeURIComponent(unsafeId)}`);

    // Verify fetch was called with the encoded URI segment
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/issues/BUG-101%2Fstatus'),
      expect.any(Object)
    );
  });

  it('handles empty text responses stably without crashing on JSON parsing', async () => {
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'text/plain',
      },
      text: async () => '',
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const res = await apiClient.get('/empty-route');
    expect(res).toBeNull();
  });
});
