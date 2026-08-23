import { describe, expect, it, vi } from 'vitest';
import { handleWearReportRequest } from '@/application/api/wear-report-handler';
import { PRODUCTS } from '@/data/products';
import type { WearReport } from '@/domain/wear-report';
import { MemoryRateLimiter } from '@/infrastructure/rate-limit/rate-limiter';
import { StaticProductRepository } from '@/infrastructure/repositories/static-product-repository';
const valid = {
  productId: PRODUCTS[0]?.id,
  wearDays: 12,
  waterExposure: 'normal',
  manualWork: 'medio',
  prepUsed: true,
  lampUsed: true,
  removalReason: 'cambio',
};
const dependencies = (create = vi.fn()) => ({
  wearReports: { create, listWearDays: vi.fn() },
  products: new StaticProductRepository(PRODUCTS),
  rateLimiter: new MemoryRateLimiter(),
});
describe('wear report endpoint handler', () => {
  it('persiste un registro anónimo válido y devuelve confirmación real', async () => {
    const create = vi.fn();
    const response = await handleWearReportRequest(
      new Request('https://example.test/api/wear-reports', {
        method: 'POST',
        body: JSON.stringify(valid),
      }),
      dependencies(create),
    );
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('email');
    const created = create.mock.calls[0]?.[0] as WearReport | undefined;
    expect(created?.nailType).toBeNull();
  });
  it.each([0, 61])('rechaza wear_days=%s', async (wearDays) => {
    const response = await handleWearReportRequest(
      new Request('https://example.test/api/wear-reports', {
        method: 'POST',
        body: JSON.stringify({ ...valid, wearDays }),
      }),
      dependencies(),
    );
    expect(response.status).toBe(400);
  });
  it('acepta lampUsed null para productos sin lámpara', async () => {
    const response = await handleWearReportRequest(
      new Request('https://example.test/api/wear-reports', {
        method: 'POST',
        body: JSON.stringify({
          ...valid,
          productId: 'mylee-diva-sin-lampara',
          lampUsed: null,
        }),
      }),
      dependencies(),
    );
    expect(response.status).toBe(201);
  });
  it('absorbe el honeypot sin escribir', async () => {
    const create = vi.fn();
    const response = await handleWearReportRequest(
      new Request('https://example.test/api/wear-reports', {
        method: 'POST',
        body: JSON.stringify({ ...valid, website: 'spam' }),
      }),
      dependencies(create),
    );
    expect(response.status).toBe(202);
    expect(create).not.toHaveBeenCalled();
  });
  it('falla de forma controlada si D1 no está disponible', async () => {
    const create = vi.fn().mockRejectedValue(new Error('D1 unavailable'));
    const response = await handleWearReportRequest(
      new Request('https://example.test/api/wear-reports', {
        method: 'POST',
        body: JSON.stringify(valid),
      }),
      dependencies(create),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'No se pudo procesar la solicitud.',
    });
  });
});
