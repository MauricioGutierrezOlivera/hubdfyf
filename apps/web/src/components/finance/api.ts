// Cliente del Módulo Finanzas: todas las llamadas llevan x-user-id (la API valida que sea Administrador).

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type DocKind = "costs" | "expenses" | "wholesale";

export class FinanceApi {
  constructor(private userId: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const isForm = body instanceof FormData;
    const res = await fetch(`${API_BASE_URL}/finance${path}`, {
      method,
      headers: {
        "x-user-id": this.userId,
        ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    if (!res.ok) {
      let message = `Error ${res.status}`;
      try {
        const data = await res.json();
        message = Array.isArray(data.message) ? data.message.join(", ") : data.message || message;
      } catch {}
      throw new Error(message);
    }
    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body ?? {});
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>("PATCH", path, body);
  }
  del<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  upload(kind: DocKind, id: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.request<{ documentUrl: string }>("POST", `/${kind}/${id}/document`, form);
  }

  async openDocument(kind: DocKind, id: string) {
    const { url } = await this.get<{ url: string }>(`/${kind}/${id}/document`);
    window.open(url, "_blank", "noopener");
  }
}

// ---------------- Formato ----------------

export const clp = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("es-CL")}`;

export const numFmt = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined
    ? "—"
    : n.toLocaleString("es-CL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const pct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${(n * 100).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`;

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const periodLabel = (p: string) => {
  const [y, m] = p.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};

export const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const shiftPeriod = (p: string, n: number) => {
  const [y, m] = p.split("-").map(Number);
  const idx = y * 12 + m - 1 + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
};

export const dateInput = (d: string | null | undefined) => (d ? d.slice(0, 10) : "");

// ---------------- Etiquetas ----------------

export const COST_TYPE_LABELS: Record<string, string> = {
  FACTORY_INVOICE: "Factura fábrica",
  FREIGHT: "Flete",
  INSURANCE: "Seguro",
  CUSTOMS_AGENT: "Agente de aduana",
  DUTIES: "Derechos / aranceles",
  LOCAL_TRANSPORT: "Transporte local",
  BANK_FEES: "Comisiones bancarias",
  OTHER: "Otro",
  IMPORT_VAT: "IVA importación (no es costo)",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  RENT: "Arriendo",
  COMMON_EXPENSES: "Gastos comunes",
  SALARIES: "Sueldos",
  COMMISSIONS: "Comisiones",
  MARKETING: "Marketing",
  ACCOUNTING: "Contabilidad",
  FRANCHISE_FEE: "Canon",
  UTILITIES: "Servicios (internet, teléfono)",
  SUPPLIES: "Insumos",
  EVENTS: "Eventos",
  BANK_FEES: "Comisiones bancarias",
  SHIPPING: "Despachos",
  INSURANCE: "Seguros",
  TAXES_OTHER: "Patente / otros impuestos",
  CAPEX: "Inversión apertura (CAPEX)",
  FINANCIAL_COST: "Costo financiero",
  OTHER: "Otro",
};

export const ITEM_CATEGORY_LABELS: Record<string, string> = {
  FOOTWEAR: "Calzado",
  ACCESSORY: "Accesorio",
  PACKAGING: "Packaging",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_TRANSIT: "En tránsito",
  RECEIVED: "Recibido",
};

export const TRANSPORT_LABELS: Record<string, string> = { AIR: "Avión", SEA: "Barco" };
