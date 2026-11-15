"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { FinanceApi, clp, dateInput, numFmt, pct, periodLabel } from "./api";
import {
  Card,
  DocButtons,
  ErrorBox,
  Field,
  Input,
  Warning,
  btnDanger,
  btnPrimary,
  btnSecondary,
  inputCls,
  tdCls,
  thCls,
  trCls,
} from "./ui";

interface WholesaleLine {
  id: string;
  description: string;
  modelKey: string;
  quantity: number;
  unitPriceNet: number;
  unitCost: number | null;
}

interface WholesaleSale {
  id: string;
  customer: string;
  invoiceNumber: string;
  date: string;
  period: string;
  vatAmount: number;
  documentUrl: string | null;
  notes: string | null;
  lines: WholesaleLine[];
  totals: { pairs: number; netAmount: number; cost: number; margin: number; marginPct: number | null };
  warnings: string[];
}

type LineForm = { description: string; modelKey: string; quantity: string; unitPriceNet: string };

const emptyLine = (): LineForm => ({ description: "", modelKey: "", quantity: "", unitPriceNet: "" });
const emptyForm = () => ({ customer: "Paris", invoiceNumber: "", date: "", vatAmount: "", notes: "" });

/**
 * Facturas a mayoristas (Paris, Falabella). Los pares salen de los pedidos de importación ya
 * registrados: no es un gasto nuevo; su costo pasa a "costo de ventas" en el mes de la factura.
 */
export default function WholesaleScreen({ api }: { api: FinanceApi }) {
  const [sales, setSales] = useState<WholesaleSale[]>([]);
  const [models, setModels] = useState<{ modelKey: string; unitCost: number }[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSales(await api.get<WholesaleSale[]>("/wholesale"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    load();
    api
      .get<{ models: { modelKey: string; unitCost: number }[] }>("/product-costs")
      .then((d) => setModels(d.models))
      .catch(() => {});
  }, [api, load]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reset = () => {
    setEditingId(null);
    setFile(null);
    setForm(emptyForm());
    setLines([emptyLine()]);
    setShowForm(false);
  };

  const save = () =>
    run(async () => {
      const body = { ...form, lines: lines.filter((l) => l.modelKey || l.quantity || l.unitPriceNet) };
      const saved = editingId
        ? await api.patch<{ id: string }>(`/wholesale/${editingId}`, body)
        : await api.post<{ id: string }>("/wholesale", body);
      if (file) {
        try {
          await api.upload("wholesale", saved.id, file);
        } catch (e) {
          setError(`La factura se guardó, pero el documento no se pudo subir: ${(e as Error).message}`);
        }
      }
      reset();
    });

  const startEdit = (s: WholesaleSale) => {
    setEditingId(s.id);
    setShowForm(true);
    setForm({
      customer: s.customer,
      invoiceNumber: s.invoiceNumber,
      date: dateInput(s.date),
      vatAmount: s.vatAmount ? String(s.vatAmount) : "",
      notes: s.notes || "",
    });
    setLines(
      s.lines.map((l) => ({
        description: l.description,
        modelKey: l.modelKey,
        quantity: String(l.quantity),
        unitPriceNet: String(l.unitPriceNet),
      })),
    );
  };

  const setLine = (idx: number, patch: Partial<LineForm>) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const formNet = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPriceNet) || 0), 0);
  const total = sales.reduce(
    (acc, s) => ({
      pairs: acc.pairs + s.totals.pairs,
      net: acc.net + s.totals.netAmount,
      cost: acc.cost + s.totals.cost,
    }),
    { pairs: 0, net: 0, cost: 0 },
  );

  return (
    <div className="space-y-4">
      <ErrorBox message={error} onClose={() => setError(null)} />
      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
        Facturas a Paris, Falabella u otros mayoristas. Los pares salen de los pedidos de importación (no es un gasto
        nuevo): el ingreso y el costo de esos pares cuentan en el Resultado del mes de la factura.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
          {sales.length} facturas · {numFmt(total.pairs)} pares · venta {clp(total.net)} · margen {clp(total.net - total.cost)}
        </p>
        {!showForm && (
          <button className={btnPrimary} onClick={() => setShowForm(true)}>
            + Nueva factura
          </button>
        )}
      </div>

      {showForm && (
        <Card className="space-y-4">
          <h3 className="font-black">{editingId ? "Editar factura" : "Nueva factura mayorista"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Cliente">
              <Input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} list="wholesale-customers" />
            </Field>
            <Field label="N° factura">
              <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </Field>
            <Field label="Fecha emisión">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="IVA (informativo)">
              <Input inputMode="numeric" value={form.vatAmount} onChange={(e) => setForm({ ...form, vatAmount: e.target.value })} />
            </Field>
          </div>
          <datalist id="wholesale-customers">
            <option value="Paris" />
            <option value="Falabella" />
          </datalist>
          <datalist id="wholesale-model-keys">
            {models.map((m) => (
              <option key={m.modelKey} value={m.modelKey}>
                {clp(m.unitCost)}
              </option>
            ))}
          </datalist>

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Modelos (precio unitario neto, sin IVA)
            </p>
            {lines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 items-center">
                <input className={inputCls} placeholder="Texto de la factura" value={l.description} onChange={(e) => setLine(idx, { description: e.target.value })} />
                <input className={inputCls} placeholder="Modelo de importación" list="wholesale-model-keys" value={l.modelKey} onChange={(e) => setLine(idx, { modelKey: e.target.value })} />
                <input className={inputCls} placeholder="Pares" inputMode="numeric" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} />
                <input className={inputCls} placeholder="Precio neto" inputMode="numeric" value={l.unitPriceNet} onChange={(e) => setLine(idx, { unitPriceNet: e.target.value })} />
                <button className={btnDanger} onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== idx) : [emptyLine()]))}>
                  Quitar
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button className={btnSecondary + " text-xs"} onClick={() => setLines((ls) => [...ls, emptyLine()])}>
                + Agregar modelo
              </button>
              <span className="text-sm font-black">Neto: {clp(formNet)}</span>
            </div>
          </div>

          <Field label="Notas">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <label className={btnSecondary}>
              {file ? `📎 ${file.name}` : "⬆ Adjuntar factura (PDF)"}
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button className={btnPrimary} onClick={save}>
              Guardar
            </button>
            <button className={btnSecondary} onClick={reset}>
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Fecha</th>
              <th className={thCls}>Cliente</th>
              <th className={thCls}>Factura</th>
              <th className={`${thCls} text-right`}>Pares</th>
              <th className={`${thCls} text-right`}>Venta neta</th>
              <th className={`${thCls} text-right`}>Costo</th>
              <th className={`${thCls} text-right`}>Margen</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr className={trCls}>
                <td className={`${tdCls} text-gray-400`} colSpan={8}>
                  Sin facturas registradas
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <Fragment key={s.id}>
                <tr className={`${trCls} cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5`} onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                  <td className={tdCls}>
                    {dateInput(s.date)} <span className="text-xs text-gray-400">({periodLabel(s.period)})</span>
                  </td>
                  <td className={`${tdCls} font-bold`}>{s.customer}</td>
                  <td className={tdCls}>N° {s.invoiceNumber}</td>
                  <td className={`${tdCls} text-right`}>{numFmt(s.totals.pairs)}</td>
                  <td className={`${tdCls} text-right font-bold`}>{clp(s.totals.netAmount)}</td>
                  <td className={`${tdCls} text-right`}>{clp(-s.totals.cost)}</td>
                  <td className={`${tdCls} text-right font-bold text-dfyf-green`}>
                    {clp(s.totals.margin)} <span className="text-xs text-gray-400">{pct(s.totals.marginPct)}</span>
                  </td>
                  <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                    <DocButtons
                      hasDoc={!!s.documentUrl}
                      onUpload={(f) => run(() => api.upload("wholesale", s.id, f))}
                      onOpen={() => api.openDocument("wholesale", s.id).catch((e) => setError(e.message))}
                    />
                    <button className={btnSecondary + " text-xs !py-1 ml-1"} onClick={() => startEdit(s)}>
                      Editar
                    </button>
                    <button
                      className={btnDanger}
                      onClick={() => confirm(`¿Eliminar la factura ${s.invoiceNumber} de ${s.customer}?`) && run(() => api.del(`/wholesale/${s.id}`))}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
                {openId === s.id && (
                  <tr className="bg-gray-50 dark:bg-white/5">
                    <td colSpan={8} className="px-3 py-2 space-y-2">
                      {s.warnings.map((w) => (
                        <Warning key={w}>⚠️ {w}</Warning>
                      ))}
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className={thCls}>Factura dice</th>
                            <th className={thCls}>Modelo</th>
                            <th className={`${thCls} text-right`}>Pares</th>
                            <th className={`${thCls} text-right`}>Precio neto</th>
                            <th className={`${thCls} text-right`}>Costo/par</th>
                            <th className={`${thCls} text-right`}>Margen/par</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.lines.map((l) => (
                            <tr key={l.id} className={trCls}>
                              <td className={tdCls}>{l.description}</td>
                              <td className={`${tdCls} text-gray-500`}>{l.modelKey}</td>
                              <td className={`${tdCls} text-right`}>{numFmt(l.quantity)}</td>
                              <td className={`${tdCls} text-right`}>{clp(l.unitPriceNet)}</td>
                              <td className={`${tdCls} text-right ${l.unitCost === null ? "text-amber-600" : ""}`}>
                                {l.unitCost === null ? "sin costo" : clp(l.unitCost)}
                              </td>
                              <td className={`${tdCls} text-right`}>{l.unitCost === null ? "—" : clp(l.unitPriceNet - l.unitCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {s.notes && <p className="text-xs text-gray-500 font-semibold">Notas: {s.notes}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
