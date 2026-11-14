"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EXPENSE_CATEGORY_LABELS, FinanceApi, clp, currentPeriod, dateInput, periodLabel, shiftPeriod } from "./api";
import {
  Card,
  DocButtons,
  ErrorBox,
  Field,
  Input,
  Select,
  btnDanger,
  btnPrimary,
  btnSecondary,
  tdCls,
  thCls,
  trCls,
} from "./ui";

interface Expense {
  id: string;
  date: string;
  period: string;
  category: string;
  kind: string;
  supplier: string | null;
  description: string;
  amountNet: number;
  vatAmount: number;
  paymentMethod: string | null;
  documentUrl: string | null;
  notes: string | null;
  amortizeMonths: number | null;
}

const KIND_LABELS = { FIXED: "Fijo", VARIABLE: "Variable" };

const emptyForm = (period: string) => ({
  period,
  date: "",
  category: "RENT",
  kind: "FIXED",
  supplier: "",
  description: "",
  amountNet: "",
  vatAmount: "",
  paymentMethod: "",
  amortizeMonths: "",
  notes: "",
});

export default function ExpensesScreen({ api }: { api: FinanceApi }) {
  const [period, setPeriod] = useState(currentPeriod());
  const [category, setCategory] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState(emptyForm(currentPeriod()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ from: period, to: period });
      if (category) q.set("category", category);
      setExpenses(await api.get<Expense[]>(`/expenses?${q}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, period, category]);

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

  const save = () =>
    run(async () => {
      const saved = editingId
        ? await api.patch<{ id: string }>(`/expenses/${editingId}`, form)
        : await api.post<{ id: string }>("/expenses", form);
      if (file) {
        try {
          await api.upload("expenses", saved.id, file);
        } catch (e) {
          setError(`El gasto se guardó, pero el documento no se pudo subir: ${(e as Error).message}`);
        }
      }
      setEditingId(null);
      setFile(null);
      setForm(emptyForm(period));
      setShowForm(false);
    });

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setShowForm(true);
    setForm({
      period: e.period,
      date: dateInput(e.date),
      category: e.category,
      kind: e.kind,
      supplier: e.supplier || "",
      description: e.description,
      amountNet: String(e.amountNet),
      vatAmount: e.vatAmount ? String(e.vatAmount) : "",
      paymentMethod: e.paymentMethod || "",
      amortizeMonths: e.amortizeMonths ? String(e.amortizeMonths) : "",
      notes: e.notes || "",
    });
  };

  const duplicate = () =>
    run(async () => {
      const r = await api.post<{ created: number; skipped: number; from: string }>("/expenses/duplicate-fixed", { period });
      setInfo(
        `Se copiaron ${r.created} gasto(s) fijo(s) desde ${periodLabel(r.from)}` +
          (r.skipped ? ` (${r.skipped} ya existían y se omitieron)` : "") +
          ". Revisa los montos antes de cerrar el mes.",
      );
    });

  const totals = useMemo(() => {
    const opex = expenses.filter((e) => e.category !== "CAPEX" && e.category !== "FINANCIAL_COST");
    return {
      operating: opex.reduce((s, e) => s + e.amountNet, 0),
      fixed: opex.filter((e) => e.kind === "FIXED").reduce((s, e) => s + e.amountNet, 0),
      capex: expenses.filter((e) => e.category === "CAPEX").reduce((s, e) => s + e.amountNet, 0),
      financial: expenses.filter((e) => e.category === "FINANCIAL_COST").reduce((s, e) => s + e.amountNet, 0),
      vat: expenses.reduce((s, e) => s + (e.vatAmount || 0), 0),
    };
  }, [expenses]);

  return (
    <div className="space-y-4">
      <ErrorBox message={error} onClose={() => setError(null)} />
      {info && (
        <div className="p-3 rounded-xl bg-dfyf-green/10 border border-dfyf-green/30 text-dfyf-green text-sm font-bold flex justify-between">
          <span>{info}</span>
          <button className="cursor-pointer" onClick={() => setInfo(null)}>✕</button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnSecondary} onClick={() => setPeriod(shiftPeriod(period, -1))}>‹</button>
          <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="border border-gray-200 dark:border-[#055740] rounded-xl px-3 py-2 text-sm font-bold bg-white dark:bg-[#033b2b]" />
          <button className={btnSecondary} onClick={() => setPeriod(shiftPeriod(period, 1))}>›</button>
          <Select
            className="!w-auto"
            options={{ "": "Todas las categorías", ...EXPENSE_CATEGORY_LABELS }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnSecondary} onClick={duplicate} title="Copia los gastos fijos del mes anterior a este mes">
            ⧉ Duplicar fijos de {periodLabel(shiftPeriod(period, -1))}
          </button>
          <button
            className={btnPrimary}
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setForm(emptyForm(period));
            }}
          >
            {showForm ? "Cancelar" : "+ Nuevo gasto"}
          </button>
        </div>
      </div>

      {showForm && (
        <Card className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Mes al que se imputa">
            <Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
          </Field>
          <Field label="Fecha documento">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Categoría">
            <Select options={EXPENSE_CATEGORY_LABELS} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <Select options={KIND_LABELS} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
          </Field>
          <Field label="Descripción" className="col-span-2">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Proveedor">
            <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          </Field>
          <Field label="Medio de pago">
            <Input value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} />
          </Field>
          <Field label="Monto neto (sin IVA)">
            <Input type="number" value={form.amountNet} onChange={(e) => setForm({ ...form, amountNet: e.target.value })} />
          </Field>
          <Field label="IVA (aparte)">
            <Input type="number" value={form.vatAmount} onChange={(e) => setForm({ ...form, vatAmount: e.target.value })} />
          </Field>
          <Field label="Amortizar en (meses)">
            <Input type="number" min={1} placeholder="Opcional (ej. canon)" value={form.amortizeMonths} onChange={(e) => setForm({ ...form, amortizeMonths: e.target.value })} />
          </Field>
          <Field label="Notas">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Field label="Documento (PDF, imagen, Excel)" className="col-span-2">
            <input type="file" accept=".pdf,image/*,.xlsx,.xls" className="text-xs font-semibold" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
          <div className="col-span-2 flex justify-end items-end">
            <button className={btnPrimary} onClick={save}>
              {editingId ? "Guardar cambios" : "Guardar gasto"}
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-3">
          <p className="text-[10px] font-black uppercase text-gray-500">Gasto operacional</p>
          <p className="text-base font-black">{clp(totals.operating)}</p>
        </Card>
        <Card className="p-3 sm:p-3">
          <p className="text-[10px] font-black uppercase text-gray-500">De ellos fijos</p>
          <p className="text-base font-black">{clp(totals.fixed)}</p>
        </Card>
        <Card className="p-3 sm:p-3">
          <p className="text-[10px] font-black uppercase text-gray-500">CAPEX (aparte)</p>
          <p className="text-base font-black">{clp(totals.capex)}</p>
        </Card>
        <Card className="p-3 sm:p-3">
          <p className="text-[10px] font-black uppercase text-gray-500">Costo financiero (aparte)</p>
          <p className="text-base font-black">{clp(totals.financial)}</p>
        </Card>
      </div>

      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Categoría</th>
              <th className={thCls}>Descripción</th>
              <th className={thCls}>Tipo</th>
              <th className={thCls}>Proveedor</th>
              <th className={`${thCls} text-right`}>Neto</th>
              <th className={`${thCls} text-right`}>IVA</th>
              <th className={thCls}>Documento</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className={trCls}>
                <td className={`${tdCls} font-bold`}>{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                <td className={`${tdCls} whitespace-normal min-w-48`} title={e.notes || ""}>
                  {e.description}
                  {e.amortizeMonths && e.amortizeMonths > 1 && (
                    <span className="text-xs text-gray-400 font-semibold"> · amortizado en {e.amortizeMonths} meses</span>
                  )}
                </td>
                <td className={tdCls}>{KIND_LABELS[e.kind as keyof typeof KIND_LABELS]}</td>
                <td className={tdCls}>{e.supplier || "—"}</td>
                <td className={`${tdCls} text-right font-bold`}>{clp(e.amountNet)}</td>
                <td className={`${tdCls} text-right`}>{e.vatAmount ? clp(e.vatAmount) : "—"}</td>
                <td className={tdCls}>
                  <DocButtons
                    hasDoc={!!e.documentUrl}
                    onOpen={() => api.openDocument("expenses", e.id).catch((err) => setError(err.message))}
                    onUpload={(f) => run(() => api.upload("expenses", e.id, f))}
                  />
                </td>
                <td className={`${tdCls} text-right`}>
                  <button className={btnSecondary + " !px-2 !py-1 text-xs"} onClick={() => startEdit(e)}>
                    Editar
                  </button>{" "}
                  <button className={btnDanger} onClick={() => confirm("¿Eliminar este gasto?") && run(() => api.del(`/expenses/${e.id}`))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={8} className={`${tdCls} text-center text-gray-400`}>
                  Sin gastos en {periodLabel(period)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {totals.vat > 0 && (
        <p className="text-xs text-gray-500 font-semibold">IVA del mes (crédito fiscal F29, no es gasto): {clp(totals.vat)}</p>
      )}
    </div>
  );
}
