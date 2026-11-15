"use client";
import { useCallback, useEffect, useState } from "react";
import { EXPENSE_CATEGORY_LABELS, FinanceApi, clp, currentPeriod, numFmt, pct, periodLabel, shiftPeriod } from "./api";
import { Card, ErrorBox, Stat, Warning, btnSecondary, tdCls, thCls, trCls } from "./ui";

interface MonthlyRow {
  period: string;
  netSales: number;
  retailSales: number;
  wholesaleSales: number;
  pairsSold: number;
  wholesalePairs: number;
  unitsWithoutCost: number;
  costOfSales: number;
  wholesaleCost: number;
  grossMargin: number;
  grossMarginPct: number | null;
  operatingExpenses: number;
  fixedExpenses: number;
  expensesByCategory: Record<string, number>;
  operatingResult: number;
  financialCost: number;
  resultAfterFinancing: number;
  capex: number;
  operatingResultMA3: number | null;
  unitGrossMargin: number | null;
  breakEvenPairs: number | null;
}

interface Monthly {
  from: string;
  to: string;
  rows: MonthlyRow[];
  trend: { slopePerMonth: number | null };
}

interface Summary {
  asOfPeriod: string;
  contributionsTotal: number;
  capexTotal: number;
  stockValue: number;
  stockUnits: number;
  stockUnitsWithoutCost: number;
  operatingResultAccumulated: number;
  accumulatedFrom: string | null;
  cash: { amount: number; date: string } | null;
  netHole: number;
  payablesPending: number;
  receivablesPending: number;
  operatingResultMA3: number | null;
  monthsToRecover: number | null;
  recoverMessage: string | null;
  lastMonth: MonthlyRow | null;
  warnings: string[];
}

type Line = {
  label: string;
  get: (r: MonthlyRow) => string;
  strong?: boolean;
  indent?: boolean;
  tone?: (r: MonthlyRow) => string;
};

const signTone = (n: number) => (n < 0 ? "text-red-600 dark:text-red-400" : "text-dfyf-green");

export default function ResultScreen({ api }: { api: FinanceApi }) {
  // Por defecto: últimos 12 meses cerrados
  const [to, setTo] = useState(shiftPeriod(currentPeriod(), -1));
  const [from, setFrom] = useState(shiftPeriod(currentPeriod(), -12));
  const [monthly, setMonthly] = useState<Monthly | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([
        api.get<Monthly>(`/monthly?from=${from}&to=${to}`),
        api.get<Summary>("/summary"),
      ]);
      setMonthly(m);
      setSummary(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = monthly?.rows || [];
  const categories = [...new Set(rows.flatMap((r) => Object.keys(r.expensesByCategory)))].filter(
    (c) => c !== "CAPEX" && c !== "FINANCIAL_COST",
  );

  const lines: Line[] = [
    { label: "Ventas netas (sin IVA)", get: (r) => clp(r.netSales), strong: true },
    { label: "Tiendas", get: (r) => clp(r.retailSales), indent: true },
    { label: "Mayoristas", get: (r) => (r.wholesaleSales ? clp(r.wholesaleSales) : "—"), indent: true },
    { label: "Pares vendidos tiendas", get: (r) => numFmt(r.pairsSold) },
    { label: "Pares mayoristas", get: (r) => (r.wholesalePairs ? numFmt(r.wholesalePairs) : "—") },
    { label: "Costo de ventas", get: (r) => clp(-r.costOfSales) },
    {
      label: "de mayoristas",
      get: (r) => (r.wholesaleCost ? clp(-r.wholesaleCost) : "—"),
      indent: true,
    },
    { label: "Margen bruto", get: (r) => clp(r.grossMargin), strong: true },
    { label: "Margen bruto %", get: (r) => pct(r.grossMarginPct), indent: true },
    { label: "Gastos operacionales", get: (r) => clp(-r.operatingExpenses) },
    ...(showCategories
      ? categories.map<Line>((c) => ({
          label: EXPENSE_CATEGORY_LABELS[c] || c,
          get: (r) => (r.expensesByCategory[c] ? clp(-r.expensesByCategory[c]) : "—"),
          indent: true,
        }))
      : []),
    {
      label: "Resultado operacional",
      get: (r) => clp(r.operatingResult),
      strong: true,
      tone: (r) => signTone(r.operatingResult),
    },
    { label: "Promedio móvil 3m", get: (r) => clp(r.operatingResultMA3), indent: true },
    { label: "Costo financiero", get: (r) => (r.financialCost ? clp(-r.financialCost) : "—") },
    {
      label: "Resultado después de financiamiento",
      get: (r) => clp(r.resultAfterFinancing),
      strong: true,
      tone: (r) => signTone(r.resultAfterFinancing),
    },
    { label: "CAPEX (inversión, aparte)", get: (r) => (r.capex ? clp(r.capex) : "—") },
    { label: "Pares de equilibrio", get: (r) => numFmt(r.breakEvenPairs) },
    {
      label: "Pares sin costo vinculado",
      get: (r) => (r.unitsWithoutCost ? numFmt(r.unitsWithoutCost) : "—"),
      tone: (r) => (r.unitsWithoutCost ? "text-amber-600" : ""),
    },
  ];

  const last = summary?.lastMonth;
  const slope = monthly?.trend.slopePerMonth ?? null;

  return (
    <div className="space-y-4">
      <ErrorBox message={error} onClose={() => setError(null)} />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            label={`Equilibrio ${last ? periodLabel(last.period) : ""}`}
            value={last?.breakEvenPairs ? `${numFmt(last.breakEvenPairs)} pares` : "—"}
            hint={
              last
                ? `Reales: ${numFmt(last.pairsSold)} pares · margen/par ${clp(last.unitGrossMargin)}`
                : undefined
            }
            tone={last?.breakEvenPairs ? (last.pairsSold >= last.breakEvenPairs ? "good" : "bad") : undefined}
          />
          <Stat
            label="Hoyo neto"
            value={clp(summary.netHole)}
            hint={`Aportes ${clp(summary.contributionsTotal)} − caja ${clp(summary.cash?.amount ?? 0)} − stock ${clp(summary.stockValue)}${
              summary.payablesPending ? ` + cuotas por pagar ${clp(summary.payablesPending)}` : ""
            }${summary.receivablesPending ? ` − por cobrar ${clp(summary.receivablesPending)}` : ""}`}
            tone={summary.netHole > 0 ? "bad" : "good"}
          />
          <Stat
            label="Meses para recuperar"
            value={summary.monthsToRecover === null ? "No se recupera" : numFmt(summary.monthsToRecover, 1)}
            hint={
              summary.recoverMessage ||
              `Al ritmo del promedio móvil 3m: ${clp(summary.operatingResultMA3)} / mes`
            }
            tone={summary.monthsToRecover === null ? "bad" : "good"}
          />
          <Stat
            label="Resultado op. acumulado"
            value={clp(summary.operatingResultAccumulated)}
            hint={
              summary.accumulatedFrom
                ? `${periodLabel(summary.accumulatedFrom)} a ${periodLabel(summary.asOfPeriod)} · CAPEX ${clp(summary.capexTotal)}`
                : undefined
            }
            tone={summary.operatingResultAccumulated < 0 ? "bad" : "good"}
          />
        </div>
      )}
      {summary?.warnings.map((w) => (
        <Warning key={w}>⚠️ {w}</Warning>
      ))}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black">Resultado operacional mensual</h3>
            <p className="text-xs text-gray-500 font-semibold">
              Barras: resultado del mes · Línea: promedio móvil 3 meses
              {slope !== null && (
                <>
                  {" "}· Tendencia:{" "}
                  <span className={signTone(slope)}>
                    {slope >= 0 ? "▲" : "▼"} {clp(Math.abs(slope))} por mes
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="text-gray-500">Desde</span>
            <input type="month" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="border border-gray-200 dark:border-[#055740] rounded-xl px-2 py-1.5 bg-white dark:bg-[#033b2b]" />
            <span className="text-gray-500">Hasta</span>
            <input type="month" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="border border-gray-200 dark:border-[#055740] rounded-xl px-2 py-1.5 bg-white dark:bg-[#033b2b]" />
          </div>
        </div>
        <ResultChart rows={rows} />
      </Card>

      <Card className="p-0 sm:p-0 overflow-x-auto">
        <div className="flex justify-end p-2">
          <button className={btnSecondary + " text-xs"} onClick={() => setShowCategories(!showCategories)}>
            {showCategories ? "Ocultar detalle de gastos" : "Ver gastos por categoría"}
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className={`${thCls} sticky left-0 bg-white dark:bg-[#033b2b]`}>Concepto</th>
              {rows.map((r) => (
                <th key={r.period} className={`${thCls} text-right`}>
                  {periodLabel(r.period)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.label} className={trCls}>
                <td
                  className={`${tdCls} sticky left-0 bg-white dark:bg-[#033b2b] ${l.strong ? "font-black" : "font-semibold"} ${
                    l.indent ? "pl-6 text-gray-500 dark:text-gray-400 text-xs" : ""
                  }`}
                >
                  {l.label}
                </td>
                {rows.map((r) => (
                  <td
                    key={r.period}
                    className={`${tdCls} text-right ${l.strong ? "font-black" : ""} ${l.indent ? "text-xs text-gray-500" : ""} ${
                      l.tone ? l.tone(r) : ""
                    }`}
                  >
                    {l.get(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-gray-500 font-semibold">
        Ventas netas = tiendas (total / 1,19) + facturas de Ventas mayoristas. Costo de ventas al costo vigente de cada modelo
        (promedio ponderado de pedidos recibidos). Los pares de equilibrio se calculan solo con tiendas. El mes en curso puede
        estar incompleto.
      </p>
    </div>
  );
}

function ResultChart({ rows }: { rows: MonthlyRow[] }) {
  if (!rows.length) return <p className="text-sm text-gray-400">Sin datos</p>;
  const W = 720;
  const H = 240;
  const padL = 64;
  const padB = 28;
  const padT = 12;
  const values = rows.flatMap((r) => [r.operatingResult, r.operatingResultMA3 ?? 0]);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const y = (v: number) => padT + ((max - v) / span) * (H - padT - padB);
  const step = (W - padL) / rows.length;
  const barW = Math.max(4, step * 0.6);
  const x = (i: number) => padL + step * i + step / 2;
  const ticks = [max, (max + min) / 2, min];
  const millions = (v: number) => `${(v / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })}M`;
  const ma = rows
    .map((r, i) => (r.operatingResultMA3 === null ? null : `${x(i)},${y(r.operatingResultMA3)}`))
    .filter(Boolean)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Resultado operacional mensual">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="stroke-gray-200 dark:stroke-[#055740]" strokeDasharray="3 3" />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" className="fill-gray-400 text-[10px] font-bold">
            {millions(t)}
          </text>
        </g>
      ))}
      <line x1={padL} x2={W} y1={y(0)} y2={y(0)} className="stroke-gray-400 dark:stroke-gray-500" />
      {rows.map((r, i) => (
        <g key={r.period}>
          <rect
            x={x(i) - barW / 2}
            width={barW}
            y={Math.min(y(0), y(r.operatingResult))}
            height={Math.max(1, Math.abs(y(r.operatingResult) - y(0)))}
            rx={2}
            className={r.operatingResult >= 0 ? "fill-dfyf-green" : "fill-red-500/80"}
          >
            <title>{`${periodLabel(r.period)}: ${clp(r.operatingResult)}`}</title>
          </rect>
          {(rows.length <= 14 || i % 2 === 0) && (
            <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-gray-500 text-[10px] font-bold">
              {periodLabel(r.period)}
            </text>
          )}
        </g>
      ))}
      {ma && (
        <polyline points={ma} fill="none" strokeWidth={2.5} strokeLinejoin="round" className="stroke-gray-800 dark:stroke-gray-100" />
      )}
    </svg>
  );
}
