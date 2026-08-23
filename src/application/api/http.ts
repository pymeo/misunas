import { z } from 'zod';

export const MAX_JSON_BODY_BYTES = 8_192;

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  });
}

export async function readJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_JSON_BODY_BYTES) throw new PayloadTooLargeError();
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }
  return JSON.parse(text) as unknown;
}

export class PayloadTooLargeError extends Error {}

export function validationErrorResponse(error: unknown): Response {
  if (error instanceof PayloadTooLargeError)
    return jsonResponse({ error: 'Payload demasiado grande.' }, 413);
  if (error instanceof SyntaxError || error instanceof z.ZodError) {
    return jsonResponse({ error: 'Payload no válido.' }, 400);
  }
  return jsonResponse({ error: 'No se pudo procesar la solicitud.' }, 500);
}
