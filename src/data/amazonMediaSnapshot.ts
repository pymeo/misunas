import { CREATORS_API_CACHE_TTL_MS } from '@/config/amazonCreators';
import {
  amazonMediaSnapshotSchema,
  type AmazonMediaSnapshot,
  type AmazonMediaSnapshotEntry,
} from '@/domain/amazonMediaSnapshot';
import rawSnapshot from '@/data/generated/amazon-media-snapshot.json';

/**
 * Punto de entrada del build al snapshot de Amazon.
 *
 * El fichero JSON lo genera `npm run amazon:sync` y no está en Git (ver
 * `.gitignore`); `scripts/amazon-prepare.mjs` garantiza que existe uno vacío
 * en cualquier checkout limpio, de modo que `npm ci && npm run build`
 * funcione sin credenciales y sin Amazon — en ese caso simplemente no hay
 * entradas y todo el catálogo usa el fallback editorial de siempre.
 *
 * Dos filtros antes de que un dato llegue a una plantilla:
 *  1. **Validación de esquema.** Un JSON corrupto o de un formato antiguo se
 *     descarta entero en vez de romper el build.
 *  2. **Frescura.** Amazon autoriza conservar Images/ItemInfo/DetailPageURL
 *     un día; una entrada cuyo `fetchedAt` supere `CREATORS_API_CACHE_TTL_MS`
 *     se ignora como si no existiera. Así, aunque alguien fuerce un build con
 *     un snapshot viejo, nunca se publica un dato fuera de política.
 */

export interface SnapshotLoadResult {
  snapshot: AmazonMediaSnapshot | null;
  /** Entradas válidas Y frescas, indexadas por ASIN. */
  byAsin: Map<string, AmazonMediaSnapshotEntry>;
  staleAsins: string[];
  /** Motivo por el que no hay datos utilizables, para informes y para el gate. */
  problem: string | null;
}

export function loadAmazonMediaSnapshot(
  raw: unknown = rawSnapshot,
  now: number = Date.now(),
  ttlMs: number = CREATORS_API_CACHE_TTL_MS,
): SnapshotLoadResult {
  const parsed = amazonMediaSnapshotSchema.safeParse(raw);
  if (!parsed.success)
    return {
      snapshot: null,
      byAsin: new Map(),
      staleAsins: [],
      problem: `El snapshot de Amazon no valida (${parsed.error.issues[0]?.message ?? 'forma inesperada'}); se ignora y se usa el fallback editorial.`,
    };

  const byAsin = new Map<string, AmazonMediaSnapshotEntry>();
  const staleAsins: string[] = [];
  for (const entry of parsed.data.entries) {
    const age = now - Date.parse(entry.fetchedAt);
    if (Number.isNaN(age) || age > ttlMs) {
      staleAsins.push(entry.asin);
      continue;
    }
    byAsin.set(entry.asin.toUpperCase(), entry);
  }

  return {
    snapshot: parsed.data,
    byAsin,
    staleAsins,
    problem:
      staleAsins.length > 0
        ? `${String(staleAsins.length)} entrada(s) del snapshot superan la TTL de 24 h autorizada por Amazon y se han ignorado. Ejecuta "npm run amazon:sync".`
        : null,
  };
}

const loaded = loadAmazonMediaSnapshot();

export const AMAZON_MEDIA_SNAPSHOT = loaded;

export function getAmazonSnapshotEntry(
  asin: string | undefined,
): AmazonMediaSnapshotEntry | null {
  if (!asin) return null;
  return loaded.byAsin.get(asin.toUpperCase()) ?? null;
}
