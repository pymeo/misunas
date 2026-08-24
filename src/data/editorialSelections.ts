import { PRODUCTS } from '@/data/products';
import type { Product } from '@/domain/product';

export interface EditorialAlternative {
  label: string;
  productId: string;
}

export interface EditorialPick {
  productId: string;
  rank: 1 | 2 | 3;
  badge: string;
  verdict: string;
  bestFor: string[];
  reasons: string[];
  shortReason: string;
  alternative?: EditorialAlternative;
}

export interface QuickChoice {
  question: string;
  answer: string;
  productId?: string;
}

export interface CategoryEditorial {
  category: Product['category'];
  eyebrow: string;
  title: string;
  intro: string;
  picks: EditorialPick[];
  quickChoices: QuickChoice[];
}

export const EDITORIAL_SELECTIONS: CategoryEditorial[] = [
  {
    category: 'tornos',
    eyebrow: 'Nuestra selección',
    title: 'Los tornos que miraríamos primero',
    intro:
      'Comparamos velocidad, accesorios, alimentación y pedal de los ocho tornos investigados. Estas son las tres opciones que elegiríamos según el uso.',
    picks: [
      {
        productId: 'kredioo-torno-profesional-35000-rpm',
        rank: 1,
        badge: 'Nuestra elección',
        verdict:
          'Es el modelo que elegiríamos como opción general dentro de esta selección. Combina una velocidad máxima de 35.000 RPM con un conjunto amplio de accesorios, pantalla y giro bidireccional, por lo que encaja especialmente bien si quieres un torno completo sin irte a un equipo mucho más especializado.',
        bestFor: ['Uso doméstico frecuente', 'Gel', 'Acrílico'],
        reasons: [
          '35.000 RPM',
          '11 accesorios',
          'Giro bidireccional',
          'Pantalla LED',
        ],
        shortReason:
          'Lo elegiríamos si quieres un torno completo para usar en casa con frecuencia.',
        alternative: {
          label: 'Si buscas principalmente portabilidad',
          productId: 'engerwall-torno-portatil-35000-rpm',
        },
      },
      {
        productId: 'engerwall-torno-portatil-35000-rpm',
        rank: 2,
        badge: 'Mejor portátil',
        verdict:
          'Lo escogeríamos si la portabilidad pesa mucho en tu decisión. Mantiene una velocidad máxima de 35.000 RPM pero añade batería, por lo que resulta más cómodo para moverlo o trabajar sin depender constantemente de un enchufe.',
        bestFor: ['Movilidad', 'Trabajar sin cable', 'Salón y casa'],
        reasons: ['35.000 RPM', 'Recargable', 'Pantalla LCD'],
        shortReason:
          'Lo elegiríamos si quieres moverlo entre casa y salón sin depender de un enchufe.',
        alternative: {
          label: 'Si quieres controlar la velocidad con el pie',
          productId: 'nailgirls-torno-35000-rpm-pedal',
        },
      },
      {
        productId: 'nailgirls-torno-35000-rpm-pedal',
        rank: 3,
        badge: 'Mejor con pedal',
        verdict:
          'Una opción especialmente interesante si quieres controlar el torno con pedal y buscas una configuración más parecida a una mesa de manicura.',
        bestFor: ['Uso tipo salón', 'Control con el pie', 'Sesiones largas'],
        reasons: ['35.000 RPM', 'Pedal incluido', '11 accesorios'],
        shortReason:
          'Lo elegiríamos si prefieres tener las manos libres mientras trabajas.',
        alternative: {
          label: 'Si prefieres un modelo más ligero para casa',
          productId: 'kredioo-torno-profesional-35000-rpm',
        },
      },
    ],
    quickChoices: [
      {
        question: 'Si es tu primer torno',
        answer: 'BICKON: 20.000 RPM con 6 accesorios, pensado para empezar.',
        productId: 'bickon-torno-20000-rpm-6-en-1',
      },
      {
        question: 'Si quieres el más equilibrado',
        answer: 'Kredioo',
        productId: 'kredioo-torno-profesional-35000-rpm',
      },
      {
        question: 'Si quieres trabajar sin cable',
        answer: 'ENGERWALL',
        productId: 'engerwall-torno-portatil-35000-rpm',
      },
      {
        question: 'Si quieres pedal',
        answer: 'NAILGIRLS',
        productId: 'nailgirls-torno-35000-rpm-pedal',
      },
    ],
  },
  {
    category: 'aspiradores-polvo-unas',
    eyebrow: 'Nuestra selección',
    title: 'Los aspiradores que miraríamos primero',
    intro:
      'Comparamos potencia, succión, niveles y filtro de los ocho aspiradores investigados. Estas son las tres opciones que elegiríamos según el uso.',
    picks: [
      {
        productId: 'jodsone-colector-polvo-120w-3-niveles',
        rank: 1,
        badge: 'Nuestra elección',
        verdict:
          'Es la opción más equilibrada de nuestra selección si buscas un colector para utilizar con frecuencia. Combina la potencia indicada de 120 W con tres niveles y un filtro reutilizable, tres características especialmente útiles para adaptar el equipo al trabajo que estés haciendo.',
        bestFor: ['Uso frecuente', 'Salón', 'Manicura en casa'],
        reasons: ['120 W', '3 niveles de velocidad', 'Filtro reutilizable'],
        shortReason:
          'Lo elegiríamos si buscas un aspirador equilibrado para usar a menudo.',
        alternative: {
          label: 'Si priorizas la potencia indicada por encima de todo',
          productId: 'adonafy-extractor-polvo-unas-120w',
        },
      },
      {
        productId: 'adonafy-extractor-polvo-unas-120w',
        rank: 2,
        badge: 'Para uso frecuente',
        verdict:
          'Una alternativa muy interesante si priorizas una potencia indicada alta y un sistema de filtro reutilizable sin necesitar demasiados extras.',
        bestFor: ['Uso intensivo', 'Salón'],
        reasons: ['120 W', 'Filtro reutilizable'],
        shortReason:
          'Lo elegiríamos si quieres potencia indicada alta sin extras.',
        alternative: {
          label: 'Si quieres niveles de velocidad ajustables',
          productId: 'jodsone-colector-polvo-120w-3-niveles',
        },
      },
      {
        productId: 'freeup-aspirador-polvo-filtro-luz-led',
        rank: 3,
        badge: 'Más completo en funciones',
        verdict:
          'Destaca frente a otras opciones de la selección por combinar aspiración con iluminación integrada y filtro reutilizable. Lo miraríamos especialmente si quieres reducir accesorios separados sobre la mesa.',
        bestFor: ['Manicura de precisión', 'Sobremesa con poco espacio'],
        reasons: [
          'Filtro reutilizable',
          'Luz LED integrada',
          'Motor sin escobillas',
        ],
        shortReason:
          'Lo elegiríamos si quieres luz integrada y menos accesorios sueltos.',
        alternative: {
          label: 'Si buscas la opción más equilibrada',
          productId: 'jodsone-colector-polvo-120w-3-niveles',
        },
      },
    ],
    quickChoices: [
      {
        question: 'Si quieres nuestra opción general',
        answer: 'JODSONE',
        productId: 'jodsone-colector-polvo-120w-3-niveles',
      },
      {
        question: 'Si priorizas potencia indicada',
        answer: 'Adonafy',
        productId: 'adonafy-extractor-polvo-unas-120w',
      },
      {
        question: 'Si quieres luz integrada',
        answer: 'FREEUP',
        productId: 'freeup-aspirador-polvo-filtro-luz-led',
      },
      {
        question: 'Si buscas la opción más sencilla',
        answer: 'CRIS NAILS: pensado para manicura y pedicura sin extras.',
        productId: 'cris-nails-aspirador-polvo-manicura',
      },
    ],
  },
  {
    category: 'impresoras-unas',
    eyebrow: 'Nuestra selección',
    title: 'Las impresoras de uñas 3D que miraríamos primero',
    intro:
      'Comparamos formato, resolución indicada, Wi‑Fi/app y reconocimiento de la forma de la uña de las ocho impresoras investigadas. Estas son las tres opciones que elegiríamos según el uso.',
    picks: [
      {
        productId: 'sunseota-impresora-unas-3d-smart',
        rank: 1,
        badge: 'Nuestra elección premium',
        verdict:
          'La miraríamos primero para un uso avanzado o de salón: combina pantalla táctil, control digital, carga de diseños propios y un planteamiento claramente más completo que las opciones mini.',
        bestFor: ['salon', 'nail-art-personalizado', 'usuario-avanzado'],
        reasons: [
          'Pantalla táctil',
          'Diseños personalizados',
          'Formato de sobremesa',
          'Funciones integradas',
        ],
        shortReason:
          'La opción más completa de la selección para quien busca una impresora de uñas seria y visualmente impactante.',
        alternative: {
          label: 'Si priorizas la portabilidad',
          productId: 'factildfulzhan-impresora-unas-portatil-4800dpi',
        },
      },
      {
        productId: 'factildfulzhan-impresora-unas-portatil-4800dpi',
        rank: 2,
        badge: 'Mejor portátil',
        verdict:
          'La elegiríamos cuando la portabilidad importe: su ficha destaca 4800 DPI, reconocimiento inteligente e impresión rápida en un formato pensado para mover entre casa, viajes o salón.',
        bestFor: ['portabilidad', 'uso-domestico', 'manicurista-movil'],
        reasons: [
          '4800 DPI indicados',
          'Reconocimiento inteligente',
          'Formato portátil',
          'Impresión rápida indicada',
        ],
        shortReason:
          'Una alternativa llamativa si quieres una impresora compacta sin renunciar a reconocimiento inteligente.',
        alternative: {
          label: 'Si priorizas la conectividad Wi‑Fi',
          productId: 'menglanchang-impresora-unas-wifi-4800dpi',
        },
      },
      {
        productId: 'menglanchang-impresora-unas-wifi-4800dpi',
        rank: 3,
        badge: 'Mejor conectividad',
        verdict:
          'Nos parece especialmente atractiva para quien quiere una experiencia conectada: la ficha combina Wi‑Fi, reconocimiento de la forma de la uña y resolución indicada de 4800 DPI.',
        bestFor: ['wifi', 'personalizacion', 'uso-domestico'],
        reasons: [
          'Wi‑Fi',
          'Reconocimiento de forma',
          '4800 DPI indicados',
          'Formato ligero',
        ],
        shortReason:
          'Interesante si priorizas Wi‑Fi, reconocimiento automático y un proceso de impresión muy digital.',
        alternative: {
          label: 'Si prefieres pantalla táctil y más funciones',
          productId: 'sunseota-impresora-unas-3d-smart',
        },
      },
    ],
    quickChoices: [
      {
        question: 'Si quieres la opción más completa',
        answer: 'Sunseota: pantalla táctil y formato de sobremesa.',
        productId: 'sunseota-impresora-unas-3d-smart',
      },
      {
        question: 'Si priorizas portabilidad',
        answer: 'factildfulzhan',
        productId: 'factildfulzhan-impresora-unas-portatil-4800dpi',
      },
      {
        question: 'Si priorizas Wi‑Fi',
        answer: 'menglanchang',
        productId: 'menglanchang-impresora-unas-wifi-4800dpi',
      },
      {
        question: 'Si buscas el formato más pequeño',
        answer: 'GEJLELDS: mini y portátil.',
        productId: 'gejlelds-impresora-unas-3d-mini',
      },
    ],
  },
  {
    category: 'unas-semicuradas',
    eyebrow: 'Nuestra selección',
    title: 'Nuestras 3 favoritas según lo que busques',
    intro:
      'Comparamos formato, número de tiras y necesidad de lámpara de los diez productos investigados. Estas son las tres opciones que elegiríamos según lo que busques.',
    picks: [
      {
        productId: 'aokitec-kit-semicurado-lampara',
        rank: 1,
        badge: 'Mejor kit para empezar',
        verdict:
          'Es nuestra elección si empiezas desde cero: el kit incluye lámpara UV/LED y 32 tiras en varios tamaños, por lo que no necesitas comprar nada más para tu primera aplicación.',
        bestFor: ['Primera vez', 'Kit completo', 'Sin comprar lámpara aparte'],
        reasons: ['Lámpara incluida', '32 tiras', 'Formato kit'],
        shortReason:
          'Lo elegiríamos si no tienes lámpara y quieres empezar con todo incluido.',
        alternative: {
          label: 'Si buscas específicamente una francesa',
          productId: 'jmeowio-francesa-rosa',
        },
      },
      {
        productId: 'nailog-maze',
        rank: 2,
        badge: 'Más tiras y tamaños',
        verdict:
          'La elegiríamos si ya tienes lámpara y quieres margen para encontrar el tamaño exacto de cada uña: trae 34 tiras con diseño floral en varios tamaños.',
        bestFor: ['Ya tienes lámpara', 'Variedad de tamaños', 'Diseño floral'],
        reasons: ['34 tiras', 'Varios tamaños', 'Diseño floral'],
        shortReason:
          'Lo elegiríamos si ya tienes lámpara y buscas variedad de tamaños.',
        alternative: {
          label: 'Si prefieres un acabado más discreto',
          productId: 'jmeowio-francesa-rosa',
        },
      },
      {
        productId: 'jmeowio-francesa-rosa',
        rank: 3,
        badge: 'Nuestra francesa favorita',
        verdict:
          'Es nuestra favorita entre las francesas de la selección: un acabado natural y rosado que encaja bien con eventos o con un uso más discreto en el día a día.',
        bestFor: ['Francesa', 'Acabado natural', 'Eventos'],
        reasons: ['Francesa', 'Acabado natural', '20 tiras'],
        shortReason:
          'Lo elegiríamos si buscas una francesa natural para el día a día o un evento.',
        alternative: {
          label: 'Si no quieres usar lámpara',
          productId: 'mylee-diva-sin-lampara',
        },
      },
    ],
    quickChoices: [
      {
        question: 'Si empiezas desde cero',
        answer: 'Aokitec: kit con lámpara incluida.',
        productId: 'aokitec-kit-semicurado-lampara',
      },
      {
        question: 'Si ya tienes lámpara',
        answer: 'NAILOG Maze: 34 tiras y varios tamaños.',
        productId: 'nailog-maze',
      },
      {
        question: 'Si quieres una francesa',
        answer: 'JMEOWIO French Pink.',
        productId: 'jmeowio-francesa-rosa',
      },
      {
        question: 'Si no quieres lámpara',
        answer: 'Mylee Diva: formato precured, distinto del gel semicurado UV.',
        productId: 'mylee-diva-sin-lampara',
      },
    ],
  },
];

export function getCategoryEditorial(
  category: Product['category'],
): CategoryEditorial | undefined {
  return EDITORIAL_SELECTIONS.find((entry) => entry.category === category);
}

export function getEditorialPick(productId: string): EditorialPick | undefined {
  for (const entry of EDITORIAL_SELECTIONS)
    for (const pick of entry.picks)
      if (pick.productId === productId) return pick;
  return undefined;
}

export interface ResolvedEditorialPick {
  pick: EditorialPick;
  product: Product;
}

/**
 * Empareja cada pick con su Product real y descarta silenciosamente
 * cualquier pick cuyo producto ya no esté activo/aprobado, para que un
 * cambio de catálogo nunca deje un enlace roto en una página publicada.
 */
export function getResolvedPicks(
  category: Product['category'],
): ResolvedEditorialPick[] {
  const editorial = getCategoryEditorial(category);
  if (!editorial) return [];
  const resolved: ResolvedEditorialPick[] = [];
  for (const pick of editorial.picks) {
    const product = PRODUCTS.find(
      (candidate) =>
        candidate.id === pick.productId &&
        candidate.active &&
        candidate.editorialStatus === 'approved',
    );
    if (product) resolved.push({ pick, product });
  }
  return resolved.sort((a, b) => a.pick.rank - b.pick.rank);
}

export function getResolvedAlternative(
  pick: EditorialPick,
): Product | undefined {
  if (!pick.alternative) return undefined;
  return PRODUCTS.find(
    (candidate) =>
      candidate.id === pick.alternative?.productId &&
      candidate.active &&
      candidate.editorialStatus === 'approved',
  );
}

export interface ResolvedQuickChoice extends QuickChoice {
  product?: Product;
}

export function getResolvedQuickChoices(
  category: Product['category'],
): ResolvedQuickChoice[] {
  const editorial = getCategoryEditorial(category);
  if (!editorial) return [];
  return editorial.quickChoices.map((choice) => {
    const product = choice.productId
      ? PRODUCTS.find(
          (candidate) =>
            candidate.id === choice.productId &&
            candidate.active &&
            candidate.editorialStatus === 'approved',
        )
      : undefined;
    return { ...choice, ...(product ? { product } : {}) };
  });
}
