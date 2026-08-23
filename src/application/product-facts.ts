import type { Product } from '@/domain/product';

export interface ProductFactRow {
  label: string;
  value: string;
}

const TYPE_LABELS: Record<Product['productType'], string> = {
  semi_cured_uv: 'Gel semicurado UV/LED',
  starter_kit_uv: 'Kit semicurado con lámpara',
  pre_cured_no_lamp: 'Gel precured sin lámpara',
  nail_wrap: 'Nail wraps',
  press_on: 'Press-on',
  uv_led_lamp: 'Lámpara UV/LED',
  polish: 'Esmalte',
  gel_polish: 'Esmalte de gel',
  remover: 'Removedor',
  cuticle_care: 'Cuidado de cutículas',
  manicure_kit: 'Kit de manicura',
  file_buffer: 'Lima o pulidor',
  nail_drill: 'Torno',
  nail_dust_collector: 'Aspirador de polvo',
  nail_art: 'Nail art',
  nail_care: 'Cuidado de uñas',
  accessory: 'Accesorio',
};

export function getProductTypeLabel(
  productType: Product['productType'],
): string {
  return TYPE_LABELS[productType];
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function yesNoRow(
  label: string,
  value: boolean | null | undefined,
): ProductFactRow | null {
  return isPresent(value) ? { label, value: value ? 'Sí' : 'No' } : null;
}

function getSemicuradasRows(product: Product): ProductFactRow[] {
  const rows: ProductFactRow[] = [
    { label: 'Tipo', value: TYPE_LABELS[product.productType] },
  ];
  if (product.stripCount !== undefined)
    rows.push({ label: 'Tiras', value: String(product.stripCount) });
  rows.push({
    label: 'Lámpara',
    value: product.requiresLamp ? 'Necesaria' : 'No necesaria',
  });
  rows.push({
    label: 'Incluida',
    value: product.includesLamp ? 'Sí' : 'No',
  });
  return rows;
}

function getNailDrillRows(product: Product): ProductFactRow[] {
  const specs =
    product.technicalSpecs?.kind === 'nail_drill'
      ? product.technicalSpecs
      : null;
  const rows: ProductFactRow[] = [
    { label: 'Tipo', value: TYPE_LABELS[product.productType] },
  ];
  if (isPresent(specs?.maxRpm))
    rows.push({
      label: 'Velocidad máxima',
      value: `${specs.maxRpm.toLocaleString('es-ES')} RPM`,
    });
  if (isPresent(specs?.accessoryCount))
    rows.push({ label: 'Accesorios', value: String(specs.accessoryCount) });
  const rechargeable = yesNoRow('Recargable', specs?.rechargeable);
  if (rechargeable) rows.push(rechargeable);
  const usb = yesNoRow('USB', specs?.usbPowered);
  if (usb) rows.push(usb);
  if (isPresent(specs?.pedalIncluded))
    rows.push({
      label: 'Pedal',
      value: specs.pedalIncluded ? 'Incluido' : 'No incluido',
    });
  if (isPresent(specs?.bidirectional))
    rows.push({
      label: 'Giro',
      value: specs.bidirectional ? 'Bidireccional' : 'Unidireccional',
    });
  if (isPresent(specs?.display))
    rows.push({ label: 'Pantalla', value: specs.display });
  return rows;
}

function getDustCollectorRows(product: Product): ProductFactRow[] {
  const specs =
    product.technicalSpecs?.kind === 'nail_dust_collector'
      ? product.technicalSpecs
      : null;
  const rows: ProductFactRow[] = [
    { label: 'Tipo', value: TYPE_LABELS[product.productType] },
  ];
  if (isPresent(specs?.powerWatts))
    rows.push({ label: 'Potencia', value: `${specs.powerWatts} W` });
  if (isPresent(specs?.suctionPa))
    rows.push({ label: 'Succión', value: `${specs.suctionPa} Pa` });
  if (isPresent(specs?.suctionLevels))
    rows.push({ label: 'Niveles', value: String(specs.suctionLevels) });
  if (specs?.reusableFilter === true) {
    rows.push({ label: 'Filtro', value: 'Reutilizable' });
  } else if (isPresent(specs?.disposableFilterCount)) {
    rows.push({
      label: 'Filtro',
      value: `${specs.disposableFilterCount} filtros desechables`,
    });
  } else if (specs?.reusableFilter === false) {
    rows.push({ label: 'Filtro', value: 'Desechable' });
  }
  const rechargeable = yesNoRow('Recargable', specs?.rechargeable);
  if (rechargeable) rows.push(rechargeable);
  const light = yesNoRow('Luz', specs?.integratedLight);
  if (light) rows.push(light);
  return rows;
}

/**
 * Fuente única de las filas mostradas en ProductFacts (ficha) y en
 * ProductComparison (comparador), para que nunca diverjan entre sí.
 * Nunca incluye una fila cuyo dato subyacente sea null/undefined.
 */
export function getProductFactRows(product: Product): ProductFactRow[] {
  if (product.productType === 'nail_drill') return getNailDrillRows(product);
  if (product.productType === 'nail_dust_collector')
    return getDustCollectorRows(product);
  return getSemicuradasRows(product);
}
