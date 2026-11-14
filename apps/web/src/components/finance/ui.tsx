"use client";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from "react";

// Piezas visuales compartidas del Módulo Finanzas (mismo estilo que el resto del POS).

export const inputCls =
  "w-full border border-gray-200 dark:border-[#055740] rounded-xl px-3 py-2 text-sm bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-dfyf-green/40";

export const btnPrimary =
  "px-4 py-2 rounded-xl bg-dfyf-green text-white text-sm font-black shadow-md shadow-dfyf-green/20 hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed";

export const btnSecondary =
  "px-3 py-2 rounded-xl border border-gray-200 dark:border-[#055740] text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50";

export const btnDanger =
  "px-2 py-1 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ""}`} />;
}

export function Select({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: Record<string, string> | string[] }) {
  const entries = Array.isArray(options) ? options.map((o) => [o, o]) : Object.entries(options);
  return (
    <select {...props} className={`${inputCls} cursor-pointer ${props.className || ""}`}>
      {entries.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function ErrorBox({ message, onClose }: { message: string | null; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold flex justify-between gap-2">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="cursor-pointer">
          ✕
        </button>
      )}
    </div>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "bad" }) {
  const toneCls =
    tone === "good" ? "text-dfyf-green" : tone === "bad" ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white";
  return (
    <Card>
      <p className="text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-xl sm:text-2xl font-black mt-1 ${toneCls}`}>{value}</p>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">{hint}</p>}
    </Card>
  );
}

export const thCls =
  "px-3 py-2 text-left text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap";
export const tdCls = "px-3 py-2 text-sm text-gray-800 dark:text-gray-100 whitespace-nowrap";
export const trCls = "border-t border-gray-100 dark:border-[#055740]";

export function DocButtons({
  hasDoc,
  onUpload,
  onOpen,
}: {
  hasDoc: boolean;
  onUpload: (file: File) => void;
  onOpen: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {hasDoc && (
        <button onClick={onOpen} className="px-2 py-1 rounded-lg text-xs font-bold text-dfyf-green hover:bg-dfyf-green/10 cursor-pointer">
          📎 Ver
        </button>
      )}
      <label className="px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer">
        {hasDoc ? "Reemplazar" : "⬆ Adjuntar"}
        <input
          type="file"
          accept=".pdf,image/*,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
      </label>
    </span>
  );
}
