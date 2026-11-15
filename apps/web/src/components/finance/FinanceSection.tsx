"use client";
import { useMemo, useState } from "react";
import { FinanceApi } from "./api";
import OrdersScreen from "./OrdersScreen";
import ExpensesScreen from "./ExpensesScreen";
import ContributionsScreen from "./ContributionsScreen";
import ResultScreen from "./ResultScreen";
import ProductCostsScreen from "./ProductCostsScreen";
import WholesaleScreen from "./WholesaleScreen";

const SCREENS = [
  { key: "result", label: "📈 Resultado" },
  { key: "orders", label: "📦 Pedidos" },
  { key: "wholesale", label: "🏬 Ventas mayoristas" },
  { key: "expenses", label: "🧾 Gastos" },
  { key: "contributions", label: "🤝 Aportes" },
  { key: "productCosts", label: "🏷️ Costos por producto" },
] as const;

type ScreenKey = (typeof SCREENS)[number]["key"];

/** Sección "Finanzas" (solo Administrador). Montos sin IVA. */
export default function FinanceSection({ userId }: { userId: string }) {
  const api = useMemo(() => new FinanceApi(userId), [userId]);
  const [screen, setScreen] = useState<ScreenKey>("result");

  return (
    <div className="h-full overflow-y-auto pr-2 pb-12">
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Finanzas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Costo real por par, gastos y resultado mensual. Todo sin IVA. Incluye tiendas y ventas mayoristas (Paris, Falabella).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCREENS.map((s) => (
            <button
              key={s.key}
              onClick={() => setScreen(s.key)}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer ${
                screen === s.key
                  ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20"
                  : "bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {screen === "result" && <ResultScreen api={api} />}
        {screen === "orders" && <OrdersScreen api={api} />}
        {screen === "wholesale" && <WholesaleScreen api={api} />}
        {screen === "expenses" && <ExpensesScreen api={api} />}
        {screen === "contributions" && <ContributionsScreen api={api} />}
        {screen === "productCosts" && <ProductCostsScreen api={api} />}
      </div>
    </div>
  );
}
