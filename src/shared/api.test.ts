import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: client }));

import { fetchAllPages, mapWithConcurrency, withRetryOn429 } from './api';

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

beforeEach(() => {
    client.get.mockReset();
    vi.useRealTimers();
});

describe('fetchAllPages', () => {
    it('reads pages until a short one', async () => {
        client.get
            .mockResolvedValueOnce([1, 2])
            .mockResolvedValueOnce([3, 2])
            .mockResolvedValueOnce([4]);
        await expect(fetchAllPages('/x?a=1', 2)).resolves.toEqual([1, 2, 3, 2, 4]);
        expect(client.get).toHaveBeenNthCalledWith(1, '/x?a=1&limit=2&page=1');
        expect(client.get).toHaveBeenNthCalledWith(3, '/x?a=1&limit=2&page=3');
    });

    it('stops on an empty page', async () => {
        client.get.mockResolvedValueOnce([1, 2]).mockResolvedValueOnce([]);
        await expect(fetchAllPages('/x', 2)).resolves.toEqual([1, 2]);
        expect(client.get).toHaveBeenNthCalledWith(1, '/x?limit=2&page=1');
    });

    it('throws at the page cap instead of returning a truncated list', async () => {
        client.get.mockResolvedValue([1]);
        await expect(fetchAllPages('/x', 1)).rejects.toThrow(/unvollständig/);
    });

    it('throws when a page fails', async () => {
        client.get.mockResolvedValueOnce([1]).mockRejectedValueOnce(httpError(500));
        await expect(fetchAllPages('/x', 1)).rejects.toThrow('HTTP 500');
    });
});

describe('withRetryOn429', () => {
    it('retries a 429 and returns the eventual answer', async () => {
        vi.useFakeTimers();
        const call = vi.fn().mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce('ok');
        const result = withRetryOn429(call);
        await vi.runAllTimersAsync();
        await expect(result).resolves.toBe('ok');
        expect(call).toHaveBeenCalledTimes(2);
    });

    it('raises every other failure at once', async () => {
        const call = vi.fn().mockRejectedValue(httpError(500));
        await expect(withRetryOn429(call)).rejects.toThrow('HTTP 500');
        expect(call).toHaveBeenCalledOnce();
    });

    it('gives up after the last attempt', async () => {
        vi.useFakeTimers();
        const call = vi.fn().mockRejectedValue(httpError(429));
        const result = withRetryOn429(call, 3);
        const settled = expect(result).rejects.toThrow('HTTP 429');
        await vi.runAllTimersAsync();
        await settled;
        expect(call).toHaveBeenCalledTimes(3);
    });
});

describe('mapWithConcurrency', () => {
    it('keeps the input order and never exceeds the limit', async () => {
        let inFlight = 0;
        let peak = 0;
        const result = await mapWithConcurrency([5, 1, 3, 2, 4], 2, async (n) => {
            inFlight += 1;
            peak = Math.max(peak, inFlight);
            await new Promise((r) => setTimeout(r, n));
            inFlight -= 1;
            return n * 10;
        });
        expect(result).toEqual([50, 10, 30, 20, 40]);
        expect(peak).toBe(2);
    });
});
