"use client";
import { useCallback, useEffect, useState } from "react";
import {
  COST_TYPE_LABELS,
  FinanceApi,
  ITEM_CATEGORY_LABELS,
  STATUS_LABELS,
  TRANSPORT_LABELS,
  clp,
  dateInput,
  numFmt,
  pct,
} from "./api";
import {
  Card,
  DocButtons,
  ErrorBox,
  Field,
  Input,
  Select,
  Warning,
  btnDanger,
  btnPrimary,
  btnSecondary,
  tdCls,
  thCls,
  trCls,
} from "./ui";

interface OrderTotals {
  pairs: number;
  units: number;
  factoryClp: number;
  extraCostsClp: number;
  totalCostNoVat: number;
  vatTotal: number;
  avgCostPerPair: number | null;
  warnings: string[];
}

interface OrderRow extends OrderTotals {
  id: string;
  code: string;
  name: string;
  season: string | null;
  transport: string;
  status: string;
  arrivalDate: string | null;
  eurClpRate: number;
}

interface Cost {
  id: string;
  type: string;
  supplier: string | null;
  documentNumber: string | null;
  date: string | null;
  currency: string;
  amount: number;
  fxRate: number;
  amountClp: number;
  vatAmount: number;
  documentUrl: string | null;
  notes: string | null;
}

interface Item {
  id: string;
  category: string;
  style: string | null;
  modelKey: string;
  quantityInvoiced: number;
  quantityReceived: number;
  unitCostEur: number;
  retailPrice: number | null;
  factoryCostClp: number;
  allocatedExtraClp: number;
  landedUnitCostClp: number;
  retailPriceRef: number | null;
  retailPriceSource: "PEDIDO" | "SHOPIFY" | null;
  retailNet: number | null;
  unitMargin: number | null;
  unitMarginPct: number | null;
}

interface OrderDetail extends Omit<OrderRow, keyof OrderTotals> {
  orderDate: string | null;
  notes: string | null;
  costs: Cost[];
  items: Item[];
  totals: OrderTotals;
}

const emptyOrder = {
  code: "",
  name: "",
  season: "",
  transport: "AIR",
  status: "DRAFT",
  orderDate: "",
  arrivalDate: "",
  eurClpRate: "",
  notes: "",
};

export default function OrdersScreen({ api }: { api: FinanceApi }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyOrder);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await api.get<OrderRow[]>("/orders"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      const o = await api.post<{ id: string }>("/orders", form);
      setCreating(false);
      setForm(emptyOrder);
      await load();
      setSelectedId(o.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (selectedId) {
    return <OrderDetailView api={api} id={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const totalPairs = orders.reduce((s, o) => s + o.pairs, 0);
  const totalCost = orders.reduce((s, o) => s + o.totalCostNoVat, 0);

  return (
    <div className="space-y-4">
      <ErrorBox message={error} onClose={() => setError(null)} />
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
          {orders.length} pedidos · {numFmt(totalPairs)} pares · {clp(totalCost)} sin IVA
        </p>
        <button className={btnPrimary} onClick={() => setCreating(!creating)}>
          {creating ? "Cancelar" : "+ Nuevo pedido"}
        </button>
      </div>

      {creating && (
        <Card className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Código">
            <Input value={form.code} placeholder="P9" onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Nombre" className="col-span-2 md:col-span-3">
            <Input value={form.name} placeholder="Pedido 9 - Avión ..." onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Temporada">
            <Input value={form.season} placeholder="SS27" onChange={(e) => setForm({ ...form, season: e.target.value })} />
          </Field>
          <Field label="Transporte">
            <Select options={TRANSPORT_LABELS} value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} />
          </Field>
          <Field label="Estado">
            <Select options={STATUS_LABELS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </Field>
          <Field label="Tipo de cambio EUR/CLP">
            <Input type="number" step="0.01" value={form.eurClpRate} onChange={(e) => setForm({ ...form, eurClpRate: e.target.value })} />
          </Field>
          <Field label="Fecha pedido">
            <Input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
          </Field>
          <Field label="Fecha llegada">
            <Input type="date" value={form.arrivalDate} onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })} />
          </Field>
          <Field label="Notas" className="col-span-2">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button className={btnPrimary} onClick={create}>
              Crear pedido
            </button>
          </div>
        </Card>
      )}

      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Código</th>
              <th className={thCls}>Nombre</th>
              <th className={thCls}>Temporada</th>
              <th className={thCls}>Transporte</th>
              <th className={thCls}>Estado</th>
              <th className={`${thCls} text-right`}>Pares</th>
              <th className={`${thCls} text-right`}>Costo total sin IVA</th>
              <th className={`${thCls} text-right`}>Costo prom. / par</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className={`${tdCls} text-center text-gray-400`}>Cargando…</td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={8} className={`${tdCls} text-center text-gray-400`}>Aún no hay pedidos</td>
              </tr>
            )}
            {orders.map((o) => (
              <tr
                key={o.id}
                className={`${trCls} hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer`}
                onClick={() => setSelectedId(o.id)}
              >
                <td className={`${tdCls} font-black`}>{o.code}</td>
                <td className={tdCls}>
                  {o.name}
                  {o.warnings.length > 0 && <span title={o.warnings.join("\n")}> ⚠️</span>}
                </td>
                <td className={tdCls}>{o.season || "—"}</td>
                <td className={tdCls}>{TRANSPORT_LABELS[o.transport]}</td>
                <td className={tdCls}>{STATUS_LABELS[o.status]}</td>
                <td className={`${tdCls} text-right`}>{numFmt(o.pairs)}</td>
                <td className={`${tdCls} text-right`}>{clp(o.totalCostNoVat)}</td>
                <td className={`${tdCls} text-right font-black`}>{clp(o.avgCostPerPair)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============================================================
// Detalle del pedido
// ============================================================

function OrderDetailView({ api, id, onBack }: { api: FinanceApi; id: string; onBack: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [tab, setTab] = useState<"costs" | "items">("costs");
  const [error, setError] = useState<string | null>(null);
  const [editingHeader, setEditingHeader] = useState(false);
  const [header, setHeader] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const o = await api.get<OrderDetail>(`/orders/${id}`);
      setOrder(o);
      setHeader({
        name: o.name,
        season: o.season || "",
        transport: o.transport,
        status: o.status,
        eurClpRate: String(o.eurClpRate),
        orderDate: dateInput(o.orderDate),
        arrivalDate: dateInput(o.arrivalDate),
        notes: o.notes || "",
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, id]);

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

  if (!order) {
    return (
      <div className="space-y-3">
        <button className={btnSecondary} onClick={onBack}>← Pedidos</button>
        <ErrorBox message={error} />
        {!error && <p className="text-sm text-gray-400">Cargando…</p>}
      </div>
    );
  }

  const t = order.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button className={btnSecondary} onClick={onBack}>← Pedidos</button>
          <div>
            <h2 className="text-lg font-black">
              {order.code} · {order.name}
            </h2>
            <p className="text-xs text-gray-500 font-bold">
              {TRANSPORT_LABELS[order.transport]} · {STATUS_LABELS[order.status]} · EUR {numFmt(order.eurClpRate, 2)}
              {order.season ? ` · ${order.season}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className={btnSecondary} onClick={() => setEditingHeader(!editingHeader)}>
            {editingHeader ? "Cancelar" : "Editar pedido"}
          </button>
          <button
            className={btnDanger}
            onClick={() => {
              if (confirm(`¿Eliminar el pedido ${order.code} con todos sus costos y modelos? No se puede deshacer.`)) {
                api.del(`/orders/${id}`).then(onBack, (e) => setError(e.message));
              }
            }}
          >
            Eliminar
          </button>
        </div>
      </div>

      <ErrorBox message={error} onClose={() => setError(null)} />

      {editingHeader && (
        <Card className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Nombre" className="col-span-2">
            <Input value={header.name} onChange={(e) => setHeader({ ...header, name: e.target.value })} />
          </Field>
          <Field label="Temporada">
            <Input value={header.season} onChange={(e) => setHeader({ ...header, season: e.target.value })} />
          </Field>
          <Field label="Tipo de cambio EUR/CLP">
            <Input type="number" step="0.01" value={header.eurClpRate} onChange={(e) => setHeader({ ...header, eurClpRate: e.target.value })} />
          </Field>
          <Field label="Transporte">
            <Select options={TRANSPORT_LABELS} value={header.transport} onChange={(e) => setHeader({ ...header, transport: e.target.value })} />
          </Field>
          <Field label="Estado">
            <Select options={STATUS_LABELS} value={header.status} onChange={(e) => setHeader({ ...header, status: e.target.value })} />
          </Field>
          <Field label="Fecha pedido">
            <Input type="date" value={header.orderDate} onChange={(e) => setHeader({ ...header, orderDate: e.target.value })} />
          </Field>
          <Field label="Fecha llegada">
            <Input type="date" value={header.arrivalDate} onChange={(e) => setHeader({ ...header, arrivalDate: e.target.value })} />
          </Field>
          <Field label="Notas" className="col-span-2 md:col-span-4">
            <Input value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} />
          </Field>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button
              className={btnPrimary}
              onClick={() => run(async () => { await api.patch(`/orders/${id}`, header); setEditingHeader(false); })}
            >
              Guardar
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniStat label="Pares calzado" value={numFmt(t.pairs)} />
        <MiniStat label="Valor fábrica" value={clp(t.factoryClp)} />
        <MiniStat label="Otros costos" value={clp(t.extraCostsClp)} />
        <MiniStat label="Costo total sin IVA" value={clp(t.totalCostNoVat)} />
        <MiniStat label="Costo prom. / par" value={clp(t.avgCostPerPair)} />
      </div>
      {t.vatTotal > 0 && (
        <p className="text-xs text-gray-500 font-semibold">IVA registrado (crédito fiscal, no suma al costo): {clp(t.vatTotal)}</p>
      )}
      {t.warnings.map((w) => (
        <Warning key={w}>⚠️ {w}</Warning>
      ))}

      <div className="flex gap-2">
        {(["costs", "items"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-sm font-black cursor-pointer ${
              tab === k ? "bg-dfyf-green text-white" : "bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740]"
            }`}
          >
            {k === "costs" ? `Costos (${order.costs.length})` : `Modelos (${order.items.length})`}
          </button>
        ))}
      </div>

      {tab === "costs" ? (
        <CostsTab api={api} order={order} run={run} setError={setError} />
      ) : (
        <ItemsTab api={api} order={order} run={run} />
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 sm:p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-black mt-0.5">{value}</p>
    </Card>
  );
}

// ---------------- Pestaña Costos ----------------

const emptyCost = {
  type: "FREIGHT",
  supplier: "",
  documentNumber: "",
  date: "",
  currency: "CLP",
  amount: "",
  fxRate: "1",
  vatAmount: "",
  notes: "",
};

function CostsTab({
  api,
  order,
  run,
  setError,
}: {
  api: FinanceApi;
  order: OrderDetail;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  setError: (m: string | null) => void;
}) {
  const [form, setForm] = useState(emptyCost);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const startEdit = (c: Cost) => {
    setEditingId(c.id);
    setForm({
      type: c.type,
      supplier: c.supplier || "",
      documentNumber: c.documentNumber || "",
      date: dateInput(c.date),
      currency: c.currency,
      amount: String(c.amount),
      fxRate: String(c.fxRate),
      vatAmount: c.vatAmount ? String(c.vatAmount) : "",
      notes: c.notes || "",
    });
  };

  const save = () =>
    run(async () => {
      const saved = editingId
        ? await api.patch<{ id: string }>(`/costs/${editingId}`, form)
        : await api.post<{ id: string }>(`/orders/${order.id}/costs`, form);
      if (file) {
        try {
          await api.upload("costs", saved.id, file);
        } catch (e) {
          setError(`El costo se guardó, pero el documento no se pudo subir: ${(e as Error).message}`);
        }
      }
      setForm(emptyCost);
      setEditingId(null);
      setFile(null);
    });

  const amountClp = (Number(form.amount) || 0) * (Number(form.fxRate) || 0);

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Tipo">
          <Select
            options={COST_TYPE_LABELS}
            value={form.type}
            onChange={(e) => {
              const type = e.target.value;
              // La factura de fábrica suele venir en EUR al tipo de cambio del pedido
              setForm(
                type === "FACTORY_INVOICE" && !editingId
                  ? { ...form, type, currency: "EUR", fxRate: String(order.eurClpRate) }
                  : { ...form, type },
              );
            }}
          />
        </Field>
        <Field label="Proveedor">
          <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
        </Field>
        <Field label="N° documento">
          <Input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Moneda">
          <Select
            options={["CLP", "EUR", "USD"]}
            value={form.currency}
            onChange={(e) =>
              setForm({
                ...form,
                currency: e.target.value,
                fxRate: e.target.value === "CLP" ? "1" : e.target.value === "EUR" ? String(order.eurClpRate) : "",
              })
            }
          />
        </Field>
        <Field label="Monto (sin IVA)">
          <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label="Tipo de cambio">
          <Input
            type="number"
            step="0.0001"
            value={form.fxRate}
            disabled={form.currency === "CLP"}
            onChange={(e) => setForm({ ...form, fxRate: e.target.value })}
          />
        </Field>
        <Field label="IVA (aparte, CLP)">
          <Input type="number" value={form.vatAmount} onChange={(e) => setForm({ ...form, vatAmount: e.target.value })} />
        </Field>
        <Field label="Notas" className="col-span-2">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <Field label="Documento (PDF, imagen, Excel)" className="col-span-2">
          <input
            type="file"
            accept=".pdf,image/*,.xlsx,.xls"
            className="text-xs font-semibold"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Field>
        <div className="col-span-2 md:col-span-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-gray-500">
            En CLP: {clp(amountClp)} {form.type === "IMPORT_VAT" && "· el IVA de importación NO suma al costo"}
          </p>
          <div className="flex gap-2">
            {editingId && (
              <button className={btnSecondary} onClick={() => { setEditingId(null); setForm(emptyCost); }}>
                Cancelar
              </button>
            )}
            <button className={btnPrimary} onClick={save}>
              {editingId ? "Guardar cambios" : "+ Agregar costo"}
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Tipo</th>
              <th className={thCls}>Proveedor / doc.</th>
              <th className={thCls}>Fecha</th>
              <th className={`${thCls} text-right`}>Monto</th>
              <th className={`${thCls} text-right`}>CLP sin IVA</th>
              <th className={`${thCls} text-right`}>IVA</th>
              <th className={thCls}>Documento</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {order.costs.map((c) => (
              <tr key={c.id} className={`${trCls} ${c.type === "IMPORT_VAT" ? "opacity-60" : ""}`}>
                <td className={`${tdCls} font-bold`} title={c.notes || ""}>{COST_TYPE_LABELS[c.type]}</td>
                <td className={tdCls}>
                  {[c.supplier, c.documentNumber].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className={tdCls}>{c.date ? new Date(c.date).toLocaleDateString("es-CL") : "—"}</td>
                <td className={`${tdCls} text-right`}>
                  {c.currency} {numFmt(c.amount, c.currency === "CLP" ? 0 : 2)}
                </td>
                <td className={`${tdCls} text-right font-bold`}>{clp(c.amountClp)}</td>
                <td className={`${tdCls} text-right`}>{c.vatAmount ? clp(c.vatAmount) : "—"}</td>
                <td className={tdCls}>
                  <DocButtons
                    hasDoc={!!c.documentUrl}
                    onOpen={() => api.openDocument("costs", c.id).catch((e) => setError(e.message))}
                    onUpload={(f) => run(() => api.upload("costs", c.id, f))}
                  />
                </td>
                <td className={`${tdCls} text-right`}>
                  <button className={btnSecondary + " !px-2 !py-1 text-xs"} onClick={() => startEdit(c)}>
                    Editar
                  </button>{" "}
                  <button
                    className={btnDanger}
                    onClick={() => confirm("¿Eliminar este costo?") && run(() => api.del(`/costs/${c.id}`))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {order.costs.length === 0 && (
              <tr>
                <td colSpan={8} className={`${tdCls} text-center text-gray-400`}>Sin costos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------- Pestaña Modelos ----------------

const emptyItem = {
  category: "FOOTWEAR",
  style: "",
  model: "",
  color: "",
  quantityInvoiced: "",
  quantityReceived: "",
  unitCostEur: "",
  retailPrice: "",
};

function ItemsTab({
  api,
  order,
  run,
}: {
  api: FinanceApi;
  order: OrderDetail;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyItem);
  const [edits, setEdits] = useState<Record<string, Partial<Record<keyof Item, string>>>>({});

  const setEdit = (id: string, key: keyof Item, value: string) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const saveRow = (id: string) =>
    run(async () => {
      await api.patch(`/items/${id}`, edits[id]);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

  const cell = (item: Item, key: keyof Item, width = "w-20") => (
    <input
      type="number"
      className={`${width} border border-transparent hover:border-gray-200 focus:border-dfyf-green dark:hover:border-[#055740] rounded-lg px-1.5 py-1 text-sm text-right bg-transparent`}
      value={
        edits[item.id]?.[key] ??
        (item[key] === null ? "" : String(Math.round(Number(item[key]) * 10000) / 10000))
      }
      onChange={(e) => setEdit(item.id, key, e.target.value)}
    />
  );

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 md:grid-cols-8 gap-3 items-end">
        <Field label="Categoría">
          <Select options={ITEM_CATEGORY_LABELS} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </Field>
        <Field label="Estilo">
          <Input value={form.style} placeholder="Bailarina" onChange={(e) => setForm({ ...form, style: e.target.value })} />
        </Field>
        <Field label="Modelo">
          <Input value={form.model} placeholder="Amatista" onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </Field>
        <Field label="Color">
          <Input value={form.color} placeholder="black" onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </Field>
        <Field label="Facturados">
          <Input type="number" value={form.quantityInvoiced} onChange={(e) => setForm({ ...form, quantityInvoiced: e.target.value })} />
        </Field>
        <Field label="Recibidos">
          <Input type="number" value={form.quantityReceived} placeholder="= facturados" onChange={(e) => setForm({ ...form, quantityReceived: e.target.value })} />
        </Field>
        <Field label="EUR / par">
          <Input type="number" step="0.01" value={form.unitCostEur} onChange={(e) => setForm({ ...form, unitCostEur: e.target.value })} />
        </Field>
        <button
          className={btnPrimary}
          onClick={() => run(async () => { await api.post(`/orders/${order.id}/items`, form); setForm(emptyItem); })}
        >
          + Agregar
        </button>
      </Card>

      <p className="text-xs text-gray-500 font-semibold">
        Costo puesto en tienda = precio fábrica + otros costos prorrateados por valor de fábrica, sin IVA, repartido entre los pares
        recibidos. Las celdas numéricas se pueden editar; guarda cada fila con ✓. El PVP en gris viene de Shopify.
      </p>

      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Modelo</th>
              <th className={thCls}>Cat.</th>
              <th className={`${thCls} text-right`}>Fact.</th>
              <th className={`${thCls} text-right`}>Recib.</th>
              <th className={`${thCls} text-right`}>EUR / par</th>
              <th className={`${thCls} text-right`}>Fábrica CLP</th>
              <th className={`${thCls} text-right`}>+ Prorrateo</th>
              <th className={`${thCls} text-right`}>Costo puesto</th>
              <th className={`${thCls} text-right`}>PVP c/IVA</th>
              <th className={`${thCls} text-right`}>PVP neto</th>
              <th className={`${thCls} text-right`}>Margen</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => {
              const dirty = !!edits[i.id];
              return (
                <tr key={i.id} className={`${trCls} ${i.quantityReceived < i.quantityInvoiced ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
                  <td className={`${tdCls} font-bold`}>
                    {i.modelKey}
                    {i.style && <span className="text-xs text-gray-400 font-semibold"> · {i.style}</span>}
                  </td>
                  <td className={`${tdCls} text-xs`}>{ITEM_CATEGORY_LABELS[i.category]}</td>
                  <td className={`${tdCls} text-right`}>{cell(i, "quantityInvoiced", "w-14")}</td>
                  <td className={`${tdCls} text-right`}>{cell(i, "quantityReceived", "w-14")}</td>
                  <td className={`${tdCls} text-right`}>{cell(i, "unitCostEur")}</td>
                  <td className={`${tdCls} text-right`}>{clp(i.factoryCostClp)}</td>
                  <td className={`${tdCls} text-right`}>{clp(i.allocatedExtraClp)}</td>
                  <td className={`${tdCls} text-right font-black`}>{clp(i.landedUnitCostClp)}</td>
                  <td className={`${tdCls} text-right ${i.retailPriceSource === "SHOPIFY" ? "text-gray-400" : ""}`}>
                    <input
                      type="number"
                      className="w-24 border border-transparent hover:border-gray-200 focus:border-dfyf-green dark:hover:border-[#055740] rounded-lg px-1.5 py-1 text-sm text-right bg-transparent"
                      placeholder={i.retailPriceRef ? String(i.retailPriceRef) : ""}
                      value={edits[i.id]?.retailPrice ?? (i.retailPrice === null ? "" : String(i.retailPrice))}
                      onChange={(e) => setEdit(i.id, "retailPrice", e.target.value)}
                    />
                  </td>
                  <td className={`${tdCls} text-right`}>{clp(i.retailNet)}</td>
                  <td
                    className={`${tdCls} text-right font-bold ${
                      i.unitMargin !== null && i.unitMargin < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {i.unitMargin === null ? "—" : `${clp(i.unitMargin)} · ${pct(i.unitMarginPct)}`}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    {dirty && (
                      <button className="px-2 py-1 rounded-lg text-xs font-black text-white bg-dfyf-green cursor-pointer" onClick={() => saveRow(i.id)}>
                        ✓
                      </button>
                    )}{" "}
                    <button
                      className={btnDanger}
                      onClick={() => confirm(`¿Eliminar ${i.modelKey}?`) && run(() => api.del(`/items/${i.id}`))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {order.items.length === 0 && (
              <tr>
                <td colSpan={12} className={`${tdCls} text-center text-gray-400`}>Sin modelos cargados</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
