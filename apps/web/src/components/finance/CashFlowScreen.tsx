"use client";
import { useCallback, useEffect, useState } from "react";
import { FinanceApi, clp, dateInput, numFmt, periodLabel } from "./api";
import { Card, ErrorBox, Field, Input, Stat, Warning, btnPrimary, btnSecondary, inputCls, tdCls, thCls, trCls } from "./ui";

interface CashItem {
  date: string;
  amount: number;
  label: string;
  overdue: boolean;
}

interface CashMonth {
  period: string;
  opening: number;
  fraction: number;
  sales: number;
  expenses: number;
  inflows: CashItem[];
  outflows: CashItem[];
  closing: number;
}

interface CashFlow {
  start: { date: string; amount: number | null };
  assumptions: { basis: string; monthlySales: number; monthlyExpenses: number; defaultSales: number; defaultExpenses: number };
  rows: CashMonth[];
  lowest: { period: string; closing: number } | null;
  beyond: { inflows: number; outflows: number };
  pendingTotals: { receivables: number; installments: number };
  warnings: string[];
  notes: string[];
}

interface Payment {
  id: string;
  installment: number;
  percent: number;
  dueDate: string;
  amountEur: number | null;
  amountClp: number;
  paidAt: string | null;
  paidAmountClp: number | null;
  notes: string | null;
}

interface OrderPayments {
  id: string;
  code: string;
  name: string;
  eurClpRate: number;
  factoryEur: number;
  factoryClp: number;
  factoryInvoiceDate: string | null;
  payments: Payment[];
}

interface Receivable {
  id: string;
  customer: string;
  invoiceNumber: string;
  date: string;
  dueDate: string | null;
  paidAt: string | null;
  totals: { netAmount: number };
}

const today = () => new Date().toISOString().slice(0, 10);
const plus30 = (d: string) => new Date(new Date(d).getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
const signCls = (n: number) => (n < 0 ? "text-red-600 dark:text-red-400" : "");

/** Proyección de caja: cuotas de importación (40/30/30) y cobros a mayoristas sobre la caja registrada. */
export default function CashFlowScreen({ api }: { api: FinanceApi }) {
  const [flow, setFlow] = useState<CashFlow | null>(null);
  const [orders, setOrders] = useState<OrderPayments[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [params, setParams] = useState({ months: "6", monthlySales: "", monthlyExpenses: "" });
  const [plan, setPlan] = useState({ orderId: "", invoiceDate: "", fxRate: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== ""));
      // En secuencia: la proyección ya hace varias consultas pesadas en paralelo
      setFlow(await api.get<CashFlow>(`/cashflow?${q}`));
      setOrders(await api.get<OrderPayments[]>("/payments"));
      setReceivables(await api.get<Receivable[]>("/wholesale"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, params]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const withPlan = orders.filter((o) => o.payments.length);
  const withoutPlan = orders.filter((o) => !o.payments.length && o.factoryClp > 0);
  const rows = flow?.rows || [];

  return (
    <div className="space-y-4">
      <ErrorBox message={error} onClose={() => setError(null)} />

      {flow && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            label="Caja registrada"
            value={flow.start.amount === null ? "Sin registrar" : clp(flow.start.amount)}
            hint={flow.start.amount === null ? "Regístrala en Aportes" : `Al ${dateInput(flow.start.date)}`}
          />
          <Stat
            label="Punto más bajo"
            value={flow.lowest ? clp(flow.lowest.closing) : "—"}
            hint={flow.lowest ? `Cierre de ${periodLabel(flow.lowest.period)}` : undefined}
            tone={flow.lowest ? (flow.lowest.closing < 0 ? "bad" : "good") : undefined}
          />
          <Stat label="Cuotas por pagar" value={clp(flow.pendingTotals.installments)} hint="Importaciones (estimado)" />
          <Stat label="Por cobrar" value={clp(flow.pendingTotals.receivables)} hint="Mayoristas, sin IVA" />
        </div>
      )}
      {flow?.warnings.map((w) => (
        <Warning key={w}>⚠️ {w}</Warning>
      ))}

      {flow && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Ventas tiendas / mes">
              <Input
                inputMode="numeric"
                placeholder={numFmt(flow.assumptions.defaultSales)}
                value={params.monthlySales}
                onChange={(e) => setParams({ ...params, monthlySales: e.target.value.replace(/\D/g, "") })}
                className="!w-44"
              />
            </Field>
            <Field label="Gastos / mes">
              <Input
                inputMode="numeric"
                placeholder={numFmt(flow.assumptions.defaultExpenses)}
                value={params.monthlyExpenses}
                onChange={(e) => setParams({ ...params, monthlyExpenses: e.target.value.replace(/\D/g, "") })}
                className="!w-44"
              />
            </Field>
            <Field label="Meses">
              <select className={`${inputCls} !w-24 cursor-pointer`} value={params.months} onChange={(e) => setParams({ ...params, months: e.target.value })}>
                {[3, 6, 9, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-gray-500 font-semibold pb-2">
              Vacío = {flow.assumptions.basis.toLowerCase()} ({clp(flow.assumptions.defaultSales)} ventas ·{" "}
              {clp(flow.assumptions.defaultExpenses)} gastos)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thCls}>Concepto</th>
                  {rows.map((r) => (
                    <th key={r.period} className={`${thCls} text-right`}>
                      {periodLabel(r.period)}
                      {r.fraction < 1 && <span className="block normal-case font-semibold">desde el {dateInput(flow.start.date).slice(8)}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <FlowRow label="Caja inicial" rows={rows} get={(r) => r.opening} strong />
                <FlowRow label="+ Ventas tiendas" rows={rows} get={(r) => r.sales} />
                <FlowRow label="− Gastos" rows={rows} get={(r) => -r.expenses} />
                <FlowRow label="+ Cobros mayoristas" rows={rows} get={(r) => r.inflows.reduce((s, x) => s + x.amount, 0)} />
                <FlowRow label="− Cuotas importación" rows={rows} get={(r) => -r.outflows.reduce((s, x) => s + x.amount, 0)} />
                <FlowRow label="Caja final" rows={rows} get={(r) => r.closing} strong />
              </tbody>
            </table>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 font-semibold space-y-1">
            {rows.flatMap((r) =>
              [...r.inflows.map((x) => ({ ...x, sign: "+" })), ...r.outflows.map((x) => ({ ...x, sign: "−" }))].map((x) => (
                <p key={`${r.period}-${x.label}`}>
                  {periodLabel(r.period)}: {x.sign} {clp(x.amount)} · {x.label} (vence {dateInput(x.date)})
                  {x.overdue && <span className="text-amber-600"> · vencido, no marcado como pagado/cobrado</span>}
                </p>
              )),
            )}
            {(flow.beyond.inflows > 0 || flow.beyond.outflows > 0) && (
              <p className="text-gray-400">
                Después del horizonte: cobros {clp(flow.beyond.inflows)} · pagos {clp(flow.beyond.outflows)}
              </p>
            )}
          </div>
          {flow.notes.map((n) => (
            <p key={n} className="text-xs text-gray-500 font-semibold">
              {n}
            </p>
          ))}
        </Card>
      )}

      <Card className="space-y-3">
        <h3 className="font-black">Cuotas de importación</h3>
        <p className="text-xs text-gray-500 font-semibold">
          40% al salir de España (fecha de la factura de España), 30% a 30 días y 30% a 60 días. El monto en CLP es estimado:
          ajústalo si el tipo de cambio cambia y anota lo pagado de verdad al marcarla.
        </p>
        {withoutPlan.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Pedido">
              <select className={`${inputCls} cursor-pointer !w-56`} value={plan.orderId} onChange={(e) => setPlan({ ...plan, orderId: e.target.value })}>
                <option value="">Elegir…</option>
                {withoutPlan.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} · {o.name} · {numFmt(o.factoryEur)} EUR
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha factura España">
              <Input type="date" value={plan.invoiceDate} onChange={(e) => setPlan({ ...plan, invoiceDate: e.target.value })} />
            </Field>
            <Field label="TC estimado (opcional)">
              <Input inputMode="decimal" placeholder="CLP por EUR" value={plan.fxRate} onChange={(e) => setPlan({ ...plan, fxRate: e.target.value })} className="!w-36" />
            </Field>
            <button
              className={btnPrimary}
              disabled={!plan.orderId || !plan.invoiceDate}
              onClick={() =>
                run(async () => {
                  await api.post(`/orders/${plan.orderId}/payments`, plan);
                  setPlan({ orderId: "", invoiceDate: "", fxRate: "" });
                })
              }
            >
              Generar cuotas
            </button>
          </div>
        )}
        {withPlan.map((o) => (
          <div key={o.id} className="overflow-x-auto">
            <p className="text-sm font-black mb-1">
              {o.code} · {o.name}{" "}
              <span className="text-xs text-gray-500 font-semibold">
                factura {numFmt(o.factoryEur)} EUR ({clp(o.factoryClp)} al TC del pedido)
              </span>
            </p>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thCls}>Cuota</th>
                  <th className={thCls}>Vence</th>
                  <th className={`${thCls} text-right`}>EUR</th>
                  <th className={`${thCls} text-right`}>CLP estimado</th>
                  <th className={thCls}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {o.payments.map((p) => (
                  <tr key={p.id} className={trCls}>
                    <td className={tdCls}>
                      {p.installment} · {Math.round(p.percent * 100)}%
                    </td>
                    <td className={tdCls}>
                      <input type="date" className={`${inputCls} !w-40 !py-1`} defaultValue={dateInput(p.dueDate)} onBlur={(e) => e.target.value !== dateInput(p.dueDate) && run(() => api.patch(`/payments/${p.id}`, { dueDate: e.target.value }))} />
                    </td>
                    <td className={`${tdCls} text-right`}>{p.amountEur === null ? "—" : numFmt(p.amountEur, 2)}</td>
                    <td className={`${tdCls} text-right`}>
                      <input
                        className={`${inputCls} !w-36 !py-1 text-right`}
                        inputMode="numeric"
                        defaultValue={Math.round(p.amountClp)}
                        onBlur={(e) => Number(e.target.value) !== Math.round(p.amountClp) && run(() => api.patch(`/payments/${p.id}`, { amountClp: e.target.value }))}
                      />
                    </td>
                    <td className={tdCls}>
                      {p.paidAt ? (
                        <span className="text-dfyf-green font-bold">
                          Pagada {dateInput(p.paidAt)}
                          {p.paidAmountClp !== null && ` · ${clp(p.paidAmountClp)}`}{" "}
                          <button className="text-xs text-gray-400 underline cursor-pointer" onClick={() => run(() => api.patch(`/payments/${p.id}`, { paidAt: null, paidAmountClp: null }))}>
                            deshacer
                          </button>
                        </span>
                      ) : (
                        <button
                          className={btnSecondary + " text-xs !py-1"}
                          onClick={() => {
                            const amount = prompt("Monto pagado en CLP", String(Math.round(p.amountClp)));
                            if (amount !== null) run(() => api.patch(`/payments/${p.id}`, { paidAt: today(), paidAmountClp: amount }));
                          }}
                        >
                          Marcar pagada hoy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <h3 className="font-black">Cobros a mayoristas</h3>
        <p className="text-xs text-gray-500 font-semibold">Vencimiento por defecto: 30 días desde la factura.</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Factura</th>
                <th className={thCls}>Emisión</th>
                <th className={thCls}>Vence</th>
                <th className={`${thCls} text-right`}>Neto</th>
                <th className={thCls}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((w) => {
                const due = dateInput(w.dueDate) || plus30(w.date);
                return (
                  <tr key={w.id} className={trCls}>
                    <td className={`${tdCls} font-bold`}>
                      {w.customer} N°{w.invoiceNumber}
                    </td>
                    <td className={tdCls}>{dateInput(w.date)}</td>
                    <td className={tdCls}>
                      <input type="date" className={`${inputCls} !w-40 !py-1`} defaultValue={due} onBlur={(e) => e.target.value !== due && run(() => api.patch(`/wholesale/${w.id}`, { dueDate: e.target.value }))} />
                    </td>
                    <td className={`${tdCls} text-right`}>{clp(w.totals.netAmount)}</td>
                    <td className={tdCls}>
                      {w.paidAt ? (
                        <span className="text-dfyf-green font-bold">
                          Cobrada {dateInput(w.paidAt)}{" "}
                          <button className="text-xs text-gray-400 underline cursor-pointer" onClick={() => run(() => api.patch(`/wholesale/${w.id}`, { paidAt: null }))}>
                            deshacer
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {due < today() && <span className="text-amber-600 text-xs font-bold">vencida</span>}
                          <input
                            type="date"
                            className={`${inputCls} !w-40 !py-1`}
                            title="Fecha de cobro"
                            onChange={(e) => e.target.value && run(() => api.patch(`/wholesale/${w.id}`, { paidAt: e.target.value }))}
                          />
                          <span className="text-xs text-gray-400">fecha de cobro</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FlowRow({ label, rows, get, strong }: { label: string; rows: CashMonth[]; get: (r: CashMonth) => number; strong?: boolean }) {
  return (
    <tr className={trCls}>
      <td className={`${tdCls} ${strong ? "font-black" : "font-semibold"}`}>{label}</td>
      {rows.map((r) => {
        const v = get(r);
        return (
          <td key={r.period} className={`${tdCls} text-right ${strong ? "font-black" : ""} ${signCls(v)}`}>
            {v === 0 && !strong ? "—" : clp(v)}
          </td>
        );
      })}
    </tr>
  );
}
