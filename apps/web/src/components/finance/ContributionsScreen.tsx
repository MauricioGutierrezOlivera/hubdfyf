"use client";
import { useCallback, useEffect, useState } from "react";
import { FinanceApi, clp, dateInput } from "./api";
import { Card, ErrorBox, Field, Input, btnDanger, btnPrimary, btnSecondary, tdCls, thCls, trCls } from "./ui";

interface Contribution {
  id: string;
  date: string;
  partner: string;
  amount: number;
  notes: string | null;
}

interface Cash {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
}

const emptyForm = { date: "", partner: "", amount: "", notes: "" };

export default function ContributionsScreen({ api }: { api: FinanceApi }) {
  const [rows, setRows] = useState<Contribution[]>([]);
  const [cash, setCash] = useState<Cash[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [cashForm, setCashForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, k] = await Promise.all([api.get<Contribution[]>("/contributions"), api.get<Cash[]>("/cash")]);
      setRows(c);
      setCash(k);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);

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

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byPartner = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.partner] = (acc[r.partner] || 0) + r.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <ErrorBox message={error} onClose={() => setError(null)} />

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 space-y-3">
          <h3 className="font-black">{editingId ? "Editar aporte" : "Registrar aporte de socios"}</h3>
          <p className="text-xs text-gray-500 font-semibold">
            Los aportes son inversión, no ingreso. Las cuotas de créditos personales no se registran aquí ni como gasto;
            sus intereses van en Gastos → Costo financiero.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Fecha">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Socio">
              <Input value={form.partner} list="finance-partners" onChange={(e) => setForm({ ...form, partner: e.target.value })} />
              <datalist id="finance-partners">
                {Object.keys(byPartner).map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
            <Field label="Monto CLP">
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Notas">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            {editingId && (
              <button className={btnSecondary} onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                Cancelar
              </button>
            )}
            <button
              className={btnPrimary}
              onClick={() =>
                run(async () => {
                  if (editingId) await api.patch(`/contributions/${editingId}`, form);
                  else await api.post("/contributions", form);
                  setEditingId(null);
                  setForm(emptyForm);
                })
              }
            >
              {editingId ? "Guardar cambios" : "+ Agregar aporte"}
            </button>
          </div>
        </Card>

        <Card className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">Aportes acumulados</p>
          <p className="text-2xl font-black">{clp(total)}</p>
          {Object.entries(byPartner).map(([p, v]) => (
            <div key={p} className="flex justify-between text-sm font-semibold">
              <span className="text-gray-500">{p}</span>
              <span>{clp(v)}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Fecha</th>
              <th className={thCls}>Socio</th>
              <th className={`${thCls} text-right`}>Monto</th>
              <th className={thCls}>Notas</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={trCls}>
                <td className={tdCls}>{new Date(r.date).toLocaleDateString("es-CL")}</td>
                <td className={`${tdCls} font-bold`}>{r.partner}</td>
                <td className={`${tdCls} text-right font-bold`}>{clp(r.amount)}</td>
                <td className={`${tdCls} whitespace-normal`}>{r.notes || ""}</td>
                <td className={`${tdCls} text-right`}>
                  <button
                    className={btnSecondary + " !px-2 !py-1 text-xs"}
                    onClick={() => {
                      setEditingId(r.id);
                      setForm({ date: dateInput(r.date), partner: r.partner, amount: String(r.amount), notes: r.notes || "" });
                    }}
                  >
                    Editar
                  </button>{" "}
                  <button className={btnDanger} onClick={() => confirm("¿Eliminar este aporte?") && run(() => api.del(`/contributions/${r.id}`))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className={`${tdCls} text-center text-gray-400`}>Sin aportes registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-black">Caja actual</h3>
        <p className="text-xs text-gray-500 font-semibold">
          Saldo real en banco/caja a una fecha. Se usa el más reciente para calcular el hoyo neto en Resultado.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <Field label="Fecha">
            <Input type="date" value={cashForm.date} onChange={(e) => setCashForm({ ...cashForm, date: e.target.value })} />
          </Field>
          <Field label="Saldo CLP">
            <Input type="number" value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })} />
          </Field>
          <Field label="Notas">
            <Input value={cashForm.notes} onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })} />
          </Field>
          <button
            className={btnPrimary}
            onClick={() => run(async () => { await api.post("/cash", cashForm); setCashForm({ ...cashForm, amount: "", notes: "" }); })}
          >
            Registrar caja
          </button>
        </div>
        {cash.length > 0 && (
          <table className="w-full">
            <tbody>
              {cash.map((c, idx) => (
                <tr key={c.id} className={trCls}>
                  <td className={tdCls}>
                    {new Date(c.date).toLocaleDateString("es-CL")}
                    {idx === 0 && <span className="ml-2 text-xs font-black text-dfyf-green">vigente</span>}
                  </td>
                  <td className={`${tdCls} text-right font-bold`}>{clp(c.amount)}</td>
                  <td className={tdCls}>{c.notes || ""}</td>
                  <td className={`${tdCls} text-right`}>
                    <button className={btnDanger} onClick={() => confirm("¿Eliminar este registro de caja?") && run(() => api.del(`/cash/${c.id}`))}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
