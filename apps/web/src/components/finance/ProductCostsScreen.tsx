"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FinanceApi, clp, numFmt } from "./api";
import { Card, ErrorBox, Input, btnDanger, btnPrimary, btnSecondary, tdCls, thCls, trCls } from "./ui";

interface Group {
  name: string;
  style: string | null;
  status: string;
  price: number;
  variants: number;
  stock: number;
  salesLines: number;
  modelKey: string | null;
  unitCost: number | null;
  matchSource: "AUTO" | "MANUAL" | null;
}

interface ProductCosts {
  models: { modelKey: string; unitCost: number }[];
  unmatched: Group[];
  matched: Group[];
}

export default function ProductCostsScreen({ api }: { api: FinanceApi }) {
  const [data, setData] = useState<ProductCosts | null>(null);
  const [view, setView] = useState<"unmatched" | "matched">("unmatched");
  const [search, setSearch] = useState("");
  const [onlyStock, setOnlyStock] = useState(true);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<ProductCosts>("/product-costs"));
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

  const list = useMemo(() => {
    const source = view === "unmatched" ? data?.unmatched || [] : data?.matched || [];
    const q = search.trim().toLowerCase();
    return source
      .filter((g) => !onlyStock || view === "matched" || g.stock > 0 || g.salesLines > 0)
      .filter((g) => !q || g.name.toLowerCase().includes(q) || (g.modelKey || "").includes(q))
      .slice(0, 300);
  }, [data, view, search, onlyStock]);

  if (!data) return <ErrorBox message={error} />;

  const unmatchedStock = data.unmatched.reduce((s, g) => s + g.stock, 0);

  return (
    <div className="space-y-4">
      <ErrorBox message={error} onClose={() => setError(null)} />
      <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
        Cada producto de Shopify toma el costo promedio ponderado del modelo importado que calza con su nombre. Los que no
        calzan se asignan aquí a mano (aplica a todas sus tallas). Sin costo, sus ventas se reportan como &quot;pares sin costo&quot;.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setView("unmatched")}
            className={`px-4 py-2 rounded-xl text-sm font-black cursor-pointer ${view === "unmatched" ? "bg-dfyf-green text-white" : "bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740]"}`}
          >
            Sin costo ({data.unmatched.length} · {numFmt(unmatchedStock)} u. en stock)
          </button>
          <button
            onClick={() => setView("matched")}
            className={`px-4 py-2 rounded-xl text-sm font-black cursor-pointer ${view === "matched" ? "bg-dfyf-green text-white" : "bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740]"}`}
          >
            Con costo ({data.matched.length})
          </button>
        </div>
        <div className="flex items-center gap-3">
          {view === "unmatched" && (
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} />
              Solo con stock o ventas
            </label>
          )}
          <Input placeholder="Buscar producto o modelo…" value={search} onChange={(e) => setSearch(e.target.value)} className="!w-64" />
          <button className={btnSecondary} onClick={() => run(() => api.post("/product-costs/recompute"))} title="Vuelve a buscar coincidencias">
            ↻ Recalcular
          </button>
        </div>
      </div>

      <datalist id="finance-model-keys">
        {data.models.map((m) => (
          <option key={m.modelKey} value={m.modelKey}>
            {clp(m.unitCost)}
          </option>
        ))}
      </datalist>

      <Card className="p-0 sm:p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Producto Shopify</th>
              <th className={`${thCls} text-right`}>PVP</th>
              <th className={`${thCls} text-right`}>Tallas</th>
              <th className={`${thCls} text-right`}>Stock</th>
              <th className={`${thCls} text-right`}>Líneas venta</th>
              <th className={thCls}>{view === "unmatched" ? "Asignar modelo importado" : "Modelo"}</th>
              <th className={`${thCls} text-right`}>Costo</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((g) => {
              const selected = choice[g.name] || "";
              const preview = data.models.find((m) => m.modelKey === selected.trim().toLowerCase());
              return (
                <tr key={g.name} className={`${trCls} ${g.status !== "active" ? "opacity-60" : ""}`}>
                  <td className={`${tdCls} font-bold whitespace-normal min-w-56`}>
                    {g.name}
                    {g.status !== "active" && <span className="text-xs text-gray-400"> · inactivo</span>}
                  </td>
                  <td className={`${tdCls} text-right`}>{clp(g.price)}</td>
                  <td className={`${tdCls} text-right`}>{g.variants}</td>
                  <td className={`${tdCls} text-right`}>{numFmt(g.stock)}</td>
                  <td className={`${tdCls} text-right`}>{numFmt(g.salesLines)}</td>
                  <td className={tdCls}>
                    {view === "unmatched" ? (
                      <input
                        list="finance-model-keys"
                        placeholder="ej. amatista black"
                        value={selected}
                        onChange={(e) => setChoice({ ...choice, [g.name]: e.target.value })}
                        className="w-48 border border-gray-200 dark:border-[#055740] rounded-lg px-2 py-1 text-sm bg-white dark:bg-[#033b2b]"
                      />
                    ) : (
                      <span>
                        {g.modelKey}
                        <span className={`ml-2 text-[10px] font-black ${g.matchSource === "MANUAL" ? "text-amber-600" : "text-gray-400"}`}>
                          {g.matchSource === "MANUAL" ? "MANUAL" : "AUTO"}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className={`${tdCls} text-right font-black`}>
                    {view === "unmatched" ? (preview ? clp(preview.unitCost) : "—") : clp(g.unitCost)}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    {view === "unmatched" ? (
                      <button
                        className={btnPrimary + " !px-3 !py-1 text-xs"}
                        disabled={!preview}
                        onClick={() => run(() => api.post("/product-costs/assign", { productName: g.name, modelKey: selected }))}
                      >
                        Asignar
                      </button>
                    ) : (
                      g.matchSource === "MANUAL" && (
                        <button
                          className={btnDanger}
                          onClick={() => run(() => api.post("/product-costs/unassign", { productName: g.name }))}
                        >
                          Quitar
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className={`${tdCls} text-center text-gray-400`}>Nada que mostrar</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {list.length === 300 && <p className="text-xs text-gray-400">Mostrando los primeros 300; usa el buscador.</p>}
    </div>
  );
}
