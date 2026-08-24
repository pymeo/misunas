export interface RelatedContentLink {
  href: string;
  title: string;
  description: string;
}

/**
 * Relaciones declarativas entre contenidos, en vez de repetir bloques de
 * enlaces "También te puede interesar" a mano en cada vista (Fase 10). Cada
 * clave es la `canonicalPath` de la página de origen; el valor son sus
 * destinos realmente relacionados (máximo 3-5, nunca un bloque gigante).
 * `RelatedLinks.astro` es el único componente que lee este mapa.
 */
export const CONTENT_RELATIONS: Record<string, RelatedContentLink[]> = {
  '/es/tornos-unas/': [
    {
      href: '/es/aspiradores-polvo-unas/',
      title: 'Aspiradores de polvo',
      description:
        'El polvo que genera un torno se controla mejor con un aspirador de sobremesa cerca de la mano.',
    },
    {
      href: '/es/impresoras-unas-3d/',
      title: 'Impresoras de uñas 3D',
      description:
        'Una vez preparada la uña, imprime el diseño en segundos con una impresora digital.',
    },
    {
      href: '/es/encuentra-tus-unas/',
      title: 'Encuentra tus uñas',
      description:
        'Si buscas tiras semicuradas en vez de maquinaria, empieza aquí.',
    },
  ],
  '/es/aspiradores-polvo-unas/': [
    {
      href: '/es/tornos-unas/',
      title: 'Tornos para uñas',
      description:
        'Un aspirador cerca de la mano controla mejor el polvo que genera un torno al limar gel o acrílico.',
    },
    {
      href: '/es/impresoras-unas-3d/',
      title: 'Impresoras de uñas 3D',
      description:
        'Con la uña ya limpia de polvo, imprime el diseño en segundos con una impresora digital.',
    },
    {
      href: '/es/encuentra-tus-unas/',
      title: 'Encuentra tus uñas',
      description:
        'Si buscas tiras semicuradas en vez de maquinaria, empieza aquí.',
    },
  ],
  '/es/impresoras-unas-3d/': [
    {
      href: '/es/impresoras-unas-3d/como-funcionan/',
      title: 'Cómo funcionan',
      description:
        'Qué hay detrás del término "impresora 3D" y qué imprime realmente sobre la uña.',
    },
    {
      href: '/es/impresoras-unas-3d/4800-vs-12000-dpi/',
      title: '4800 vs 12000 DPI',
      description:
        'Qué cambia realmente la resolución indicada en el resultado final.',
    },
    {
      href: '/es/impresoras-unas-3d/cartuchos-y-consumibles/',
      title: 'Cartuchos y consumibles',
      description: 'Qué gastas de verdad más allá del precio de la máquina.',
    },
    {
      href: '/es/calculadora-rentabilidad-impresora-unas/',
      title: 'Calculadora de rentabilidad',
      description: 'Estima cuántos servicios necesitas para amortizarla.',
    },
  ],
  '/es/impresoras-unas-3d/como-funcionan/': [
    {
      href: '/es/impresoras-unas-3d/',
      title: 'Ver la comparativa',
      description:
        'Vuelve al Top 3 y a la comparación completa de impresoras investigadas.',
    },
    {
      href: '/es/impresoras-unas-3d/4800-vs-12000-dpi/',
      title: '4800 vs 12000 DPI',
      description:
        'Cómo se traduce la resolución en el resultado sobre la uña.',
    },
    {
      href: '/es/impresoras-unas-3d/cartuchos-y-consumibles/',
      title: 'Cartuchos y consumibles',
      description:
        'Qué consumibles necesita el proceso que acabas de entender.',
    },
  ],
  '/es/impresoras-unas-3d/precio/': [
    {
      href: '/es/impresoras-unas-3d/',
      title: 'Ver la comparativa',
      description:
        'Compara formato, resolución y funciones de las impresoras investigadas.',
    },
    {
      href: '/es/impresoras-unas-3d/profesionales/',
      title: 'Para profesionales',
      description: 'Qué pesa más en un uso de salón frente a uno doméstico.',
    },
    {
      href: '/es/calculadora-rentabilidad-impresora-unas/',
      title: 'Calculadora de rentabilidad',
      description: 'Estima cuánto tardarías en amortizar la inversión.',
    },
  ],
  '/es/impresoras-unas-3d/profesionales/': [
    {
      href: '/es/impresoras-unas-3d/',
      title: 'Ver la comparativa',
      description:
        'Compara las impresoras investigadas por formato y funciones.',
    },
    {
      href: '/es/calculadora-rentabilidad-impresora-unas/',
      title: 'Calculadora de rentabilidad',
      description: 'Calcula el margen y las semanas para amortizar la máquina.',
    },
    {
      href: '/es/impresoras-unas-3d/cartuchos-y-consumibles/',
      title: 'Cartuchos y consumibles',
      description: 'El coste que más pesa en el día a día de un salón.',
    },
  ],
  '/es/impresoras-unas-3d/4800-vs-12000-dpi/': [
    {
      href: '/es/impresoras-unas-3d/',
      title: 'Ver la comparativa',
      description:
        'Compara los modelos investigados con cada resolución indicada.',
    },
    {
      href: '/es/impresoras-unas-3d/como-funcionan/',
      title: 'Cómo funcionan',
      description: 'Qué papel juega la resolución dentro del proceso completo.',
    },
  ],
  '/es/impresoras-unas-3d/cartuchos-y-consumibles/': [
    {
      href: '/es/impresoras-unas-3d/',
      title: 'Ver la comparativa',
      description: 'Compara las impresoras investigadas.',
    },
    {
      href: '/es/calculadora-rentabilidad-impresora-unas/',
      title: 'Calculadora de rentabilidad',
      description:
        'Introduce tu propio coste de consumible y calcula el margen.',
    },
    {
      href: '/es/impresoras-unas-3d/profesionales/',
      title: 'Para profesionales',
      description:
        'Cómo gestionar el gasto de consumibles con varias clientas a la semana.',
    },
  ],
  '/es/calculadora-rentabilidad-impresora-unas/': [
    {
      href: '/es/impresoras-unas-3d/',
      title: 'Ver la comparativa',
      description: 'Compara las impresoras investigadas antes de decidir.',
    },
    {
      href: '/es/impresoras-unas-3d/cartuchos-y-consumibles/',
      title: 'Cartuchos y consumibles',
      description: 'Entiende mejor el coste que acabas de introducir.',
    },
    {
      href: '/es/impresoras-unas-3d/profesionales/',
      title: 'Para profesionales',
      description: 'Contexto adicional si vas a usarla en un salón.',
    },
  ],
};

export function getRelatedContent(path: string): RelatedContentLink[] {
  return CONTENT_RELATIONS[path] ?? [];
}
