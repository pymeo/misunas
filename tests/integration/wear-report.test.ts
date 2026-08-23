import { describe, expect, it, vi } from 'vitest';
import { handleWearReportRequest } from '@/application/api/wear-report-handler';
import { SAMPLE_PRODUCTS } from '@/data/products.sample';
import { MemoryRateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { StaticProductRepository } from '@/infrastructure/repositories/static-product-repository';

describe('wear report endpoint handler', () => {
  it('validates and persists a data-minimized report', async () => {
    const create = vi.fn();
    const response = await handleWearReportRequest(
      new Request('https://example.test/api/wear-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: SAMPLE_PRODUCTS[0]?.id,
          wearDays: 12,
          nailType: 'normal',
          waterExposure: 'media',
          manualWork: false,
          prepUsed: true,
          lampUsed: true,
          removalReason: 'cambio',
        }),
      }),
      {
        wearReports: { create, listWearDays: vi.fn() },
        products: new StaticProductRepository(SAMPLE_PRODUCTS),
        rateLimiter: new MemoryRateLimiter(),
      },
    );
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('name');
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('email');
  });

  it('rejects invalid ranges', async () => {
    const response = await handleWearReportRequest(
      new Request('https://example.test/api/wear-reports', {
        method: 'POST',
        body: JSON.stringify({ productId: 'x', wearDays: 999 }),
      }),
      {
        wearReports: { create: vi.fn(), listWearDays: vi.fn() },
        products: new StaticProductRepository(SAMPLE_PRODUCTS),
        rateLimiter: new MemoryRateLimiter(),
      },
    );
    expect(response.status).toBe(400);
  });
});
