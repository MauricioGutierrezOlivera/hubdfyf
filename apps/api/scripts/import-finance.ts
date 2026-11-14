/**
 * Carga inicial del Módulo Finanzas desde CSV (docs/carga-inicial/).
 *
 * Uso (desde apps/api):
 *   npx ts-node --transpile-only scripts/import-finance.ts            → simula, no escribe
 *   npx ts-node --transpile-only scripts/import-finance.ts --apply    → escribe en la base
 *   Opciones: --dir <carpeta>  --allow-remote (requerido si la base NO es localhost)
 *
 * Idempotente: cada fila importada lleva un importKey estable ("csv:..."). Correrlo de nuevo
 * actualiza esas filas, borra las filas "csv:" que ya no estén en el CSV y NUNCA toca
 * lo que se haya cargado a mano en la aplicación (importKey vacío).
 *
 * Archivos esperados:
 *   import_orders.csv          code,name,transport,arrival_month,eur_clp_rate,fx_source,status
 *   import_order_costs.csv     order_code,type,currency,amount,fx_rate,amount_clp,vat_amount,notes
 *   import_order_items.csv     order_code,category,style,model_key,quantity_received,line_total_eur,landed_unit_cost_clp
 *   expenses.csv               period,category,kind,description,amount_net,source
 *   capital_contributions.csv  period,partner,amount
 * Columnas opcionales aceptadas: quantity_invoiced, retail_price (items); amortize_months, vat_amount (gastos).
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import {
  ExpenseCategory,
  ExpenseKind,
  FinanceCurrency,
  ImportCostType,
  ImportItemCategory,
  ImportOrderStatus,
  ImportTransport,
} from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { FinanceService } from '../src/finance/finance.service';
import { FinanceStorageService } from '../src/finance/finance-storage.service';
import { computeItemCosts, isValidPeriod, normalizeKey } from '../src/finance/finance-calc';

type Row = Record<string, string>;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALLOW_REMOTE = args.includes('--allow-remote');
const dirIdx = args.indexOf('--dir');
const DIR = path.resolve(dirIdx >= 0 ? args[dirIdx + 1] : path.join(__dirname, '../../../docs/carga-inicial'));

const errors: string[] = [];

function readCsv(file: string, required = true): Promise<Row[]> {
  const full = path.join(DIR, file);
  if (!fs.existsSync(full)) {
    if (required) errors.push(`No existe ${full}`);
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    const rows: Row[] = [];
    fs.createReadStream(full)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace(/^﻿/, '') }))
      .on('data', (r: Row) => rows.push(r))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function where(file: string, i: number) {
  return `${file} fila ${i + 2}`; // +2: encabezado y base 1
}

function numberOf(v: string | undefined, ctx: string, opts: { optional?: boolean } = {}): number | null {
  if (v === undefined || v.trim() === '') {
    if (!opts.optional) errors.push(`${ctx}: valor vacío`);
    return null;
  }
  const n = Number(v.trim());
  if (!Number.isFinite(n)) {
    errors.push(`${ctx}: "${v}" no es número`);
    return null;
  }
  return n;
}

function enumOf<T extends string>(v: string | undefined, values: readonly T[], ctx: string): T {
  const s = (v || '').trim().toUpperCase() as T;
  if (!values.includes(s)) errors.push(`${ctx}: "${v}" no es válido (${values.join(', ')})`);
  return s;
}

function periodDate(p: string, ctx: string): Date {
  if (!isValidPeriod(p)) errors.push(`${ctx}: período "${p}" debe ser YYYY-MM`);
  return new Date(`${p}-01T12:00:00.000Z`);
}

/** Genera claves únicas aunque haya filas repetidas (agrega #2, #3...). */
function keyer() {
  const seen = new Map<string, number>();
  return (base: string) => {
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  };
}

async function main() {
  const url = process.env.DATABASE_URL || '';
  const host = (() => {
    try {
      return new URL(url.replace(/^prisma\+postgres/, 'http')).hostname;
    } catch {
      return '?';
    }
  })();
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
  console.log(`Base de datos: ${host} ${isLocal ? '(local)' : '(REMOTA)'}`);
  console.log(`Carpeta CSV:   ${DIR}`);
  console.log(`Modo:          ${APPLY ? 'APLICAR (escribe en la base)' : 'SIMULACIÓN (no escribe)'}\n`);
  if (APPLY && !isLocal && !ALLOW_REMOTE) {
    console.error('La base no es local. Para escribir en una base remota agrega --allow-remote.');
    process.exit(1);
  }

  const [ordersCsv, costsCsv, itemsCsv, expensesCsv, contribCsv] = await Promise.all([
    readCsv('import_orders.csv'),
    readCsv('import_order_costs.csv'),
    readCsv('import_order_items.csv'),
    readCsv('expenses.csv', false),
    readCsv('capital_contributions.csv', false),
  ]);

  // ---------- Validación y armado (sin tocar la base) ----------
  const orders = ordersCsv.map((r, i) => {
    const ctx = where('import_orders.csv', i);
    const code = (r.code || '').trim();
    if (!code) errors.push(`${ctx}: falta code`);
    const season = (r.name || '').match(/\b(SS|FW)\d{2}\b/i)?.[0].toUpperCase() ?? null;
    return {
      code,
      name: (r.name || '').trim() || code,
      season,
      transport: enumOf(r.transport, Object.values(ImportTransport), ctx),
      arrivalDate: r.arrival_month ? periodDate(r.arrival_month.trim(), ctx) : null,
      eurClpRate: numberOf(r.eur_clp_rate, ctx) ?? 0,
      status: r.status ? enumOf(r.status, Object.values(ImportOrderStatus), ctx) : ImportOrderStatus.RECEIVED,
      notes: r.fx_source ? `Tipo de cambio: ${r.fx_source.trim()}` : null,
    };
  });
  const orderCodes = new Set(orders.map((o) => o.code));
  if (orderCodes.size !== orders.length) errors.push('import_orders.csv: hay códigos de pedido repetidos');

  const costKey = keyer();
  const costs = costsCsv.map((r, i) => {
    const ctx = where('import_order_costs.csv', i);
    const code = (r.order_code || '').trim();
    if (!orderCodes.has(code)) errors.push(`${ctx}: pedido "${code}" no está en import_orders.csv`);
    const type = enumOf(r.type, Object.values(ImportCostType), ctx);
    const amount = numberOf(r.amount, ctx) ?? 0;
    const fxRate = numberOf(r.fx_rate, ctx, { optional: true }) ?? 1;
    const csvClp = numberOf(r.amount_clp, ctx, { optional: true });
    if (csvClp !== null && Math.abs(csvClp - amount * fxRate) > 1) {
      errors.push(`${ctx}: amount_clp ${csvClp} no calza con amount × fx_rate = ${amount * fxRate}`);
    }
    return {
      code,
      importKey: costKey(`csv:cost:${code}:${type}`),
      type,
      currency: enumOf(r.currency || 'CLP', Object.values(FinanceCurrency), ctx),
      amount,
      fxRate,
      amountClp: amount * fxRate,
      vatAmount: numberOf(r.vat_amount, ctx, { optional: true }) ?? 0,
      notes: r.notes?.trim() || null,
    };
  });

  const itemKey = keyer();
  const items = itemsCsv.map((r, i) => {
    const ctx = where('import_order_items.csv', i);
    const code = (r.order_code || '').trim();
    if (!orderCodes.has(code)) errors.push(`${ctx}: pedido "${code}" no está en import_orders.csv`);
    const category = enumOf(r.category || 'FOOTWEAR', Object.values(ImportItemCategory), ctx);
    const modelKey = normalizeKey(r.model_key || '');
    if (!modelKey) errors.push(`${ctx}: falta model_key`);
    const received = numberOf(r.quantity_received, ctx) ?? 0;
    const invoiced = numberOf(r.quantity_invoiced, ctx, { optional: true }) ?? received;
    const lineEur = numberOf(r.line_total_eur, ctx) ?? 0;
    if (invoiced <= 0) errors.push(`${ctx}: cantidad facturada debe ser > 0`);
    const style = (r.style || '').trim();
    return {
      code,
      importKey: itemKey(`csv:item:${code}:${category}:${modelKey}`),
      category,
      style: style && style.toUpperCase() !== category ? style : null,
      modelKey,
      quantityInvoiced: invoiced,
      quantityReceived: received,
      unitCostEur: invoiced > 0 ? lineEur / invoiced : 0,
      retailPrice: numberOf(r.retail_price, ctx, { optional: true }),
      expectedLanded: numberOf(r.landed_unit_cost_clp, ctx, { optional: true }),
    };
  });

  const expKey = keyer();
  const expenses = expensesCsv.map((r, i) => {
    const ctx = where('expenses.csv', i);
    const period = (r.period || '').trim();
    const category = enumOf(r.category, Object.values(ExpenseCategory), ctx);
    const description = (r.description || '').trim();
    if (!description) errors.push(`${ctx}: falta description`);
    return {
      importKey: expKey(`csv:exp:${period}:${category}:${normalizeKey(description)}`),
      date: periodDate(period, ctx),
      period,
      category,
      kind: enumOf(r.kind || 'FIXED', Object.values(ExpenseKind), ctx),
      description,
      amountNet: numberOf(r.amount_net, ctx) ?? 0,
      vatAmount: numberOf(r.vat_amount, ctx, { optional: true }) ?? 0,
      amortizeMonths: numberOf(r.amortize_months, ctx, { optional: true }),
      notes: r.source?.trim() ? `Fuente: ${r.source.trim()}` : null,
    };
  });

  const capKey = keyer();
  const contributions = contribCsv.map((r, i) => {
    const ctx = where('capital_contributions.csv', i);
    const period = (r.period || '').trim();
    const partner = (r.partner || '').trim() || 'Socios';
    return {
      importKey: capKey(`csv:cap:${period}:${normalizeKey(partner)}`),
      date: periodDate(period, ctx),
      partner,
      amount: numberOf(r.amount, ctx) ?? 0,
    };
  });

  // Verificación: el costo calculado por la app debe calzar con el del CSV
  const fxByCode = new Map(orders.map((o) => [o.code, o.eurClpRate]));
  let maxDiff = 0;
  for (const code of orderCodes) {
    const its = items.filter((i) => i.code === code);
    const res = computeItemCosts(its, costs.filter((c) => c.code === code), fxByCode.get(code) || 0);
    its.forEach((it, idx) => {
      if (it.expectedLanded === null) return;
      const diff = Math.abs(res[idx].landedUnitCostClp - it.expectedLanded);
      maxDiff = Math.max(maxDiff, diff);
      if (diff > 2) {
        errors.push(
          `${code} ${it.modelKey}: costo calculado ${Math.round(res[idx].landedUnitCostClp)} ≠ CSV ${it.expectedLanded}`,
        );
      }
    });
  }

  console.log(`Pedidos: ${orders.length} · Costos: ${costs.length} · Modelos: ${items.length}`);
  console.log(`Gastos: ${expenses.length} · Aportes: ${contributions.length}`);
  console.log(`Diferencia máxima costo calculado vs CSV: ${maxDiff.toFixed(1)} CLP por par`);

  if (errors.length) {
    console.error(`\n${errors.length} error(es); no se escribió nada:`);
    errors.slice(0, 50).forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  if (!APPLY) {
    console.log('\nSimulación OK. Para escribir en la base agrega --apply.');
    return;
  }

  // ---------- Escritura ----------
  const prisma = new PrismaService();
  const finance = new FinanceService(prisma, new FinanceStorageService());
  try {
    const orderIds = new Map<string, string>();
    for (const o of orders) {
      const { code, ...data } = o;
      const saved = await prisma.importOrder.upsert({ where: { code }, create: { code, ...data }, update: data });
      orderIds.set(code, saved.id);
    }

    const costKeys = costs.map((c) => c.importKey);
    const itemKeys = items.map((i) => i.importKey);
    await prisma.$transaction([
      ...costs.map(({ code, importKey, ...data }) =>
        prisma.importOrderCost.upsert({
          where: { importKey },
          create: { ...data, importKey, orderId: orderIds.get(code)! },
          update: { ...data, orderId: orderIds.get(code)! },
        }),
      ),
      prisma.importOrderCost.deleteMany({
        where: { importKey: { startsWith: 'csv:', notIn: costKeys } },
      }),
      ...items.map(({ code, importKey, expectedLanded: _e, ...data }) =>
        prisma.importOrderItem.upsert({
          where: { importKey },
          create: { ...data, importKey, orderId: orderIds.get(code)! },
          update: { ...data, orderId: orderIds.get(code)! },
        }),
      ),
      prisma.importOrderItem.deleteMany({
        where: { importKey: { startsWith: 'csv:', notIn: itemKeys } },
      }),
    ]);

    if (expensesCsv.length) {
      await prisma.$transaction([
        ...expenses.map(({ importKey, ...data }) =>
          prisma.expense.upsert({ where: { importKey }, create: { ...data, importKey }, update: data }),
        ),
        prisma.expense.deleteMany({
          where: { importKey: { startsWith: 'csv:', notIn: expenses.map((e) => e.importKey) } },
        }),
      ]);
    }
    if (contribCsv.length) {
      await prisma.$transaction([
        ...contributions.map(({ importKey, ...data }) =>
          prisma.capitalContribution.upsert({ where: { importKey }, create: { ...data, importKey }, update: data }),
        ),
        prisma.capitalContribution.deleteMany({
          where: { importKey: { startsWith: 'csv:', notIn: contributions.map((c) => c.importKey) } },
        }),
      ]);
    }

    for (const id of orderIds.values()) await finance.recalcOrder(id, { skipLinks: true });
    const links = await finance.recomputeCostLinks();
    const linked = await prisma.productCostLink.count();
    console.log(`\nListo. Vínculos producto↔costo cambiados: ${links.changed} · total vinculados: ${linked}`);
  } finally {
    await prisma.$disconnect();
    await (prisma as unknown as { pool: { end(): Promise<void> } }).pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
