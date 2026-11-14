// Cálculos puros del Módulo Finanzas (sin base de datos), para poder probarlos aislados.
// Reglas en docs/modulo-finanzas.md. Todos los montos en CLP sin IVA.

export const IVA_RATE = 0.19;
export const CHILE_TZ = 'America/Santiago';

/** "Amatista Black" / "AMATISTA  bláck" → "amatista black" */
export function normalizeKey(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Período "YYYY-MM" de una fecha según la hora de Chile. */
export function periodOf(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  return `${y}-${m}`;
}

export function isValidPeriod(p: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}

export function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** Lista de períodos desde `from` hasta `to`, ambos incluidos. */
export function periodRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let p = from; p <= to; p = addMonths(p, 1)) out.push(p);
  return out;
}

// ------------------------------------------------------------
// Costo puesto en tienda de un pedido
// ------------------------------------------------------------

export interface CostInput {
  type: string;
  amountClp: number;
}

export interface ItemInput {
  quantityInvoiced: number;
  quantityReceived: number;
  unitCostEur: number;
}

export interface ItemCostResult {
  factoryCostClp: number; // precio fábrica unitario en CLP (según factura)
  allocatedExtraClp: number; // costos no-fábrica asignados, por par recibido
  landedUnitCostClp: number; // costo puesto en tienda por par recibido
}

/** Costos que se prorratean: todo menos la factura de fábrica y el IVA de importación. */
export function extraCostsClp(costs: CostInput[]): number {
  return costs
    .filter((c) => c.type !== 'FACTORY_INVOICE' && c.type !== 'IMPORT_VAT')
    .reduce((s, c) => s + (c.amountClp || 0), 0);
}

/**
 * Prorrateo por valor de fábrica. El valor de fábrica de cada ítem se calcula
 * sobre lo facturado; si llegaron menos pares, ese costo total se reparte entre
 * los pares recibidos. Un ítem sin pares recibidos queda en 0.
 */
export function computeItemCosts(
  items: ItemInput[],
  costs: CostInput[],
  eurClpRate: number,
): ItemCostResult[] {
  const extras = extraCostsClp(costs);
  const factoryValues = items.map((i) => i.unitCostEur * i.quantityInvoiced * eurClpRate);
  const factoryTotal = factoryValues.reduce((s, v) => s + v, 0);

  return items.map((item, idx) => {
    const factoryCostClp = item.unitCostEur * eurClpRate;
    if (item.quantityReceived <= 0) {
      return { factoryCostClp, allocatedExtraClp: 0, landedUnitCostClp: 0 };
    }
    const share = factoryTotal > 0 ? factoryValues[idx] / factoryTotal : 0;
    const allocatedExtraClp = (share * extras) / item.quantityReceived;
    const factoryPerReceived = factoryValues[idx] / item.quantityReceived;
    return {
      factoryCostClp,
      allocatedExtraClp,
      landedUnitCostClp: factoryPerReceived + allocatedExtraClp,
    };
  });
}

// ------------------------------------------------------------
// Costo promedio ponderado por modelo
// ------------------------------------------------------------

export interface ReceivedItem {
  modelKey: string;
  quantityReceived: number;
  landedUnitCostClp: number;
}

/** modelKey → costo promedio ponderado por pares recibidos. */
export function weightedAverageByModel(items: ReceivedItem[]): Map<string, number> {
  const acc = new Map<string, { cost: number; qty: number }>();
  for (const i of items) {
    if (i.quantityReceived <= 0) continue;
    const a = acc.get(i.modelKey) || { cost: 0, qty: 0 };
    a.cost += i.landedUnitCostClp * i.quantityReceived;
    a.qty += i.quantityReceived;
    acc.set(i.modelKey, a);
  }
  const out = new Map<string, number>();
  for (const [k, a] of acc) out.set(k, a.cost / a.qty);
  return out;
}

/**
 * Busca el modelKey que calza con el nombre de un producto de Shopify:
 * el nombre normalizado debe contener el modelKey como palabras completas.
 * Si varios calzan, gana el más largo ("amatista black" sobre "amatista").
 */
export function matchModelKey(productName: string, modelKeys: string[]): string | null {
  const name = ` ${normalizeKey(productName)} `;
  let best: string | null = null;
  for (const key of modelKeys) {
    if (!key) continue;
    if (name.includes(` ${key} `) && (!best || key.length > best.length)) best = key;
  }
  return best;
}

// ------------------------------------------------------------
// Resultado mensual
// ------------------------------------------------------------

export interface ExpenseInput {
  period: string;
  category: string;
  kind: string;
  amountNet: number;
  amortizeMonths?: number | null;
}

export interface ExpenseByPeriod {
  operating: number;
  fixed: number;
  capex: number;
  financial: number;
  byCategory: Record<string, number>;
}

/**
 * Reparte cada gasto en los períodos donde se imputa. Si tiene amortizeMonths,
 * se divide en partes iguales desde su período (ej. canon). CAPEX y costo
 * financiero van aparte y no son gasto operacional.
 */
export function expensesByPeriod(expenses: ExpenseInput[]): Map<string, ExpenseByPeriod> {
  const out = new Map<string, ExpenseByPeriod>();
  const get = (p: string) => {
    let e = out.get(p);
    if (!e) {
      e = { operating: 0, fixed: 0, capex: 0, financial: 0, byCategory: {} };
      out.set(p, e);
    }
    return e;
  };
  for (const exp of expenses) {
    const months = exp.amortizeMonths && exp.amortizeMonths > 1 ? exp.amortizeMonths : 1;
    const part = exp.amountNet / months;
    for (let k = 0; k < months; k++) {
      const e = get(addMonths(exp.period, k));
      e.byCategory[exp.category] = (e.byCategory[exp.category] || 0) + part;
      if (exp.category === 'CAPEX') e.capex += part;
      else if (exp.category === 'FINANCIAL_COST') e.financial += part;
      else {
        e.operating += part;
        if (exp.kind === 'FIXED') e.fixed += part;
      }
    }
  }
  return out;
}

/** Promedio móvil de 3 meses (null mientras no haya 3 meses). */
export function movingAverage3(values: number[]): (number | null)[] {
  return values.map((_, i) => (i < 2 ? null : (values[i] + values[i - 1] + values[i - 2]) / 3));
}

/** Pendiente de la recta de mínimos cuadrados (CLP por mes). */
export function linearSlope(values: (number | null)[]): number | null {
  const pts = values
    .map((y, x) => ({ x, y }))
    .filter((p): p is { x: number; y: number } => p.y !== null);
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const num = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return den === 0 ? null : num / den;
}

/** Pares de equilibrio = gastos fijos / margen bruto unitario. */
export function breakEvenPairs(fixedExpenses: number, unitMargin: number | null): number | null {
  if (!unitMargin || unitMargin <= 0) return null;
  return fixedExpenses / unitMargin;
}

/** Meses para recuperar el hoyo; null si al ritmo actual no se recupera. */
export function monthsToRecover(hole: number, monthlyResult: number | null): number | null {
  if (hole <= 0) return 0;
  if (!monthlyResult || monthlyResult <= 0) return null;
  return hole / monthlyResult;
}
