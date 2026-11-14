import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CostMatchSource,
  ExpenseCategory,
  ExpenseKind,
  FinanceCurrency,
  ImportCostType,
  ImportItemCategory,
  ImportOrderStatus,
  ImportTransport,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isProductSockOrAccessory } from '../sales/sales.service';
import {
  IVA_RATE,
  addMonths,
  breakEvenPairs,
  computeItemCosts,
  expensesByPeriod,
  extraCostsClp,
  isValidPeriod,
  linearSlope,
  matchModelKey,
  monthsToRecover,
  movingAverage3,
  normalizeKey,
  periodOf,
  periodRange,
  weightedAverageByModel,
} from './finance-calc';
import { FinanceStorageService, UploadedDocument } from './finance-storage.service';
import { compact, date, int, num, oneOf, str } from './finance-input';

type Body = Record<string, unknown>;

const TRANSPORTS = Object.values(ImportTransport);
const ORDER_STATUSES = Object.values(ImportOrderStatus);
const COST_TYPES = Object.values(ImportCostType);
const CURRENCIES = Object.values(FinanceCurrency);
const ITEM_CATEGORIES = Object.values(ImportItemCategory);
const EXPENSE_CATEGORIES = Object.values(ExpenseCategory);
const EXPENSE_KINDS = Object.values(ExpenseKind);

const round = (n: number) => Math.round(n);

export interface MonthlyRow {
  period: string;
  netSales: number;
  pairsSold: number;
  unitsWithoutCost: number;
  costOfSales: number;
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

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FinanceStorageService,
  ) {}

  // ============================================================
  // Pedidos de importación
  // ============================================================

  private orderTotals(order: {
    eurClpRate: number;
    costs: { type: ImportCostType; amountClp: number; vatAmount: number }[];
    items: {
      category: ImportItemCategory;
      quantityInvoiced: number;
      quantityReceived: number;
      unitCostEur: number;
      landedUnitCostClp: number;
    }[];
  }) {
    const extras = extraCostsClp(order.costs);
    const itemsFactoryClp = order.items.reduce(
      (s, i) => s + i.unitCostEur * i.quantityInvoiced * order.eurClpRate,
      0,
    );
    const invoiceFactoryClp = order.costs
      .filter((c) => c.type === 'FACTORY_INVOICE')
      .reduce((s, c) => s + c.amountClp, 0);
    const footwear = order.items.filter((i) => i.category === 'FOOTWEAR');
    const pairs = footwear.reduce((s, i) => s + i.quantityReceived, 0);
    const footwearCost = footwear.reduce((s, i) => s + i.landedUnitCostClp * i.quantityReceived, 0);
    // Si aún no hay modelos cargados, el costo total sale de la factura
    const totalCostNoVat = (order.items.length ? itemsFactoryClp : invoiceFactoryClp) + extras;
    const warnings: string[] = [];
    if (order.items.length && invoiceFactoryClp > 0) {
      const diff = itemsFactoryClp - invoiceFactoryClp;
      if (Math.abs(diff) > Math.max(1000, invoiceFactoryClp * 0.005)) {
        warnings.push(
          `La suma de los modelos (${round(itemsFactoryClp)} CLP) no calza con la factura de fábrica (${round(invoiceFactoryClp)} CLP)`,
        );
      }
    }
    const missing = order.items.filter((i) => i.quantityReceived < i.quantityInvoiced);
    if (missing.length) {
      warnings.push(`${missing.length} modelo(s) con menos pares recibidos que facturados`);
    }
    return {
      pairs,
      units: order.items.reduce((s, i) => s + i.quantityReceived, 0),
      factoryClp: round(order.items.length ? itemsFactoryClp : invoiceFactoryClp),
      extraCostsClp: round(extras),
      totalCostNoVat: round(totalCostNoVat),
      vatTotal: round(order.costs.reduce((s, c) => s + (c.vatAmount || 0), 0)),
      avgCostPerPair: pairs > 0 ? round(footwearCost / pairs) : null,
      warnings,
    };
  }

  async listOrders() {
    const orders = await this.prisma.importOrder.findMany({
      include: { costs: true, items: true },
      orderBy: [{ arrivalDate: 'asc' }, { code: 'asc' }],
    });
    return orders.map(({ costs, items, ...o }) => ({
      ...o,
      ...this.orderTotals({ eurClpRate: o.eurClpRate, costs, items }),
    }));
  }

  async getOrder(id: string) {
    const order = await this.prisma.importOrder.findUnique({
      where: { id },
      include: {
        costs: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
        items: { orderBy: [{ category: 'asc' }, { modelKey: 'asc' }] },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    // PVP de referencia: si el modelo no tiene PVP cargado, se usa el precio de Shopify
    const products = await this.prisma.product.findMany({
      where: { status: 'active' },
      select: { name: true, price: true },
    });
    const keys = [...new Set(order.items.map((i) => i.modelKey))];
    const priceByKey = new Map<string, number>();
    for (const p of products) {
      const k = matchModelKey(p.name, keys);
      if (k) priceByKey.set(k, Math.max(priceByKey.get(k) || 0, p.price));
    }

    const items = order.items.map((i) => {
      const retail = i.retailPrice ?? priceByKey.get(i.modelKey) ?? null;
      const retailNet = retail ? retail / (1 + IVA_RATE) : null;
      const margin = retailNet !== null && i.landedUnitCostClp > 0 ? retailNet - i.landedUnitCostClp : null;
      return {
        ...i,
        retailPriceRef: retail,
        retailPriceSource: i.retailPrice != null ? 'PEDIDO' : retail ? 'SHOPIFY' : null,
        retailNet: retailNet !== null ? round(retailNet) : null,
        unitMargin: margin !== null ? round(margin) : null,
        unitMarginPct: margin !== null && retailNet ? margin / retailNet : null,
      };
    });
    return { ...order, items, totals: this.orderTotals(order) };
  }

  private orderData(body: Body, creating: boolean) {
    return compact({
      code: str(body, 'code', { required: creating }) ?? undefined,
      name: str(body, 'name', { required: creating }) ?? undefined,
      season: str(body, 'season'),
      transport: oneOf(body, 'transport', TRANSPORTS, { required: creating }),
      orderDate: date(body, 'orderDate'),
      arrivalDate: date(body, 'arrivalDate'),
      eurClpRate: num(body, 'eurClpRate', { required: creating, min: 0 }),
      status: oneOf(body, 'status', ORDER_STATUSES),
      notes: str(body, 'notes'),
    });
  }

  async createOrder(body: Body) {
    const data = this.orderData(body, true) as Prisma.ImportOrderCreateInput;
    try {
      return await this.prisma.importOrder.create({ data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException(`Ya existe un pedido con código ${data.code}`);
      }
      throw e;
    }
  }

  async updateOrder(id: string, body: Body) {
    await this.ensureOrder(id);
    const order = await this.prisma.importOrder.update({ where: { id }, data: this.orderData(body, false) });
    // Cambia el tipo de cambio o el estado → cambian los costos por par
    await this.recalcOrder(id);
    return order;
  }

  async deleteOrder(id: string) {
    const order = await this.prisma.importOrder.findUnique({ where: { id }, include: { costs: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    await this.prisma.importOrder.delete({ where: { id } });
    for (const c of order.costs) if (c.documentUrl) await this.storage.remove(c.documentUrl);
    await this.recomputeCostLinks();
    return { ok: true };
  }

  private async ensureOrder(id: string) {
    const o = await this.prisma.importOrder.findUnique({ where: { id }, select: { id: true } });
    if (!o) throw new NotFoundException('Pedido no encontrado');
  }

  // ---------------- Costos del pedido ----------------

  private costData(body: Body, creating: boolean) {
    const currency = oneOf(body, 'currency', CURRENCIES) ?? (creating ? 'CLP' : undefined);
    const amount = num(body, 'amount', { required: creating });
    let fxRate = num(body, 'fxRate', { min: 0 });
    if (creating && fxRate === undefined) {
      if (currency !== 'CLP') throw new BadRequestException('Falta el tipo de cambio (fxRate)');
      fxRate = 1;
    }
    return compact({
      type: oneOf(body, 'type', COST_TYPES, { required: creating }),
      supplier: str(body, 'supplier'),
      documentNumber: str(body, 'documentNumber'),
      date: date(body, 'date'),
      currency,
      amount,
      fxRate,
      vatAmount: num(body, 'vatAmount', { min: 0 }),
      notes: str(body, 'notes'),
    });
  }

  async createCost(orderId: string, body: Body) {
    await this.ensureOrder(orderId);
    const data = this.costData(body, true);
    const cost = await this.prisma.importOrderCost.create({
      data: {
        ...(data as Omit<Prisma.ImportOrderCostUncheckedCreateInput, 'orderId' | 'amountClp'>),
        orderId,
        amountClp: (data.amount as number) * (data.fxRate as number),
      },
    });
    await this.recalcOrder(orderId);
    return cost;
  }

  async updateCost(id: string, body: Body) {
    const current = await this.prisma.importOrderCost.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Costo no encontrado');
    const data = this.costData(body, false);
    const amount = (data.amount as number | undefined) ?? current.amount;
    const fxRate = (data.fxRate as number | undefined) ?? current.fxRate;
    const cost = await this.prisma.importOrderCost.update({
      where: { id },
      data: { ...data, amountClp: amount * fxRate },
    });
    await this.recalcOrder(current.orderId);
    return cost;
  }

  async deleteCost(id: string) {
    const current = await this.prisma.importOrderCost.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Costo no encontrado');
    await this.prisma.importOrderCost.delete({ where: { id } });
    if (current.documentUrl) await this.storage.remove(current.documentUrl);
    await this.recalcOrder(current.orderId);
    return { ok: true };
  }

  // ---------------- Modelos del pedido ----------------

  private itemData(body: Body, creating: boolean) {
    const style = str(body, 'style');
    const model = str(body, 'model');
    const color = str(body, 'color');
    let modelKey = str(body, 'modelKey');
    if (modelKey) modelKey = normalizeKey(modelKey);
    else if (creating) {
      modelKey = normalizeKey([model, color].filter(Boolean).join(' '));
      if (!modelKey) throw new BadRequestException('Indica el modelo y color (o el modelKey)');
    }
    const received = int(body, 'quantityReceived', { min: 0 });
    let invoiced = int(body, 'quantityInvoiced', { min: 0 });
    if (creating && invoiced === undefined) invoiced = received;
    if (creating && invoiced === undefined) throw new BadRequestException('Falta la cantidad facturada');
    const sizeBreakdown = body.sizeBreakdown;
    if (sizeBreakdown !== undefined && sizeBreakdown !== null && typeof sizeBreakdown !== 'object') {
      throw new BadRequestException('sizeBreakdown debe ser un objeto {"36": 1, ...}');
    }
    return compact({
      category: oneOf(body, 'category', ITEM_CATEGORIES),
      style,
      model,
      color,
      modelKey: modelKey ?? undefined,
      quantityInvoiced: invoiced,
      quantityReceived: received ?? (creating ? invoiced : undefined),
      unitCostEur: num(body, 'unitCostEur', { required: creating, min: 0 }),
      retailPrice: body.retailPrice === null || body.retailPrice === '' ? null : num(body, 'retailPrice', { min: 0 }),
      sizeBreakdown:
        sizeBreakdown === null ? Prisma.JsonNull : (sizeBreakdown as Prisma.InputJsonValue | undefined),
    });
  }

  async createItem(orderId: string, body: Body) {
    await this.ensureOrder(orderId);
    const item = await this.prisma.importOrderItem.create({
      data: {
        ...(this.itemData(body, true) as Omit<Prisma.ImportOrderItemUncheckedCreateInput, 'orderId'>),
        orderId,
      },
    });
    await this.recalcOrder(orderId);
    return item;
  }

  async updateItem(id: string, body: Body) {
    const current = await this.prisma.importOrderItem.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Modelo no encontrado');
    const item = await this.prisma.importOrderItem.update({ where: { id }, data: this.itemData(body, false) });
    await this.recalcOrder(current.orderId);
    return item;
  }

  async deleteItem(id: string) {
    const current = await this.prisma.importOrderItem.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Modelo no encontrado');
    await this.prisma.importOrderItem.delete({ where: { id } });
    await this.recalcOrder(current.orderId);
    return { ok: true };
  }

  /** Recalcula el costo puesto en tienda de cada modelo del pedido y los costos vigentes. */
  async recalcOrder(orderId: string, opts: { skipLinks?: boolean } = {}) {
    const order = await this.prisma.importOrder.findUnique({
      where: { id: orderId },
      include: { costs: true, items: true },
    });
    if (!order) return;
    const results = computeItemCosts(order.items, order.costs, order.eurClpRate);
    await this.prisma.$transaction(
      order.items.map((item, idx) =>
        this.prisma.importOrderItem.update({ where: { id: item.id }, data: results[idx] }),
      ),
    );
    if (!opts.skipLinks) await this.recomputeCostLinks();
  }

  // ============================================================
  // Costo vigente por producto (promedio ponderado)
  // ============================================================

  /** Promedio ponderado por modelKey usando solo pedidos RECIBIDOS. */
  private async modelAverages() {
    const items = await this.prisma.importOrderItem.findMany({
      where: { order: { status: 'RECEIVED' }, category: { not: 'PACKAGING' } },
      select: { modelKey: true, quantityReceived: true, landedUnitCostClp: true },
    });
    return weightedAverageByModel(items);
  }

  /**
   * Vuelve a calcular ProductCostLink para todas las variantes:
   * - vínculos MANUAL: se mantiene el modelKey y se actualiza el costo.
   * - el resto: se busca coincidencia por nombre; sin coincidencia se borra el vínculo.
   */
  async recomputeCostLinks() {
    const averages = await this.modelAverages();
    const keys = [...averages.keys()];
    const [products, links] = await Promise.all([
      this.prisma.product.findMany({ select: { id: true, name: true } }),
      this.prisma.productCostLink.findMany(),
    ]);
    const linkByProduct = new Map(links.map((l) => [l.productId, l]));
    const ops: Prisma.PrismaPromise<unknown>[] = [];

    for (const p of products) {
      const link = linkByProduct.get(p.id);
      if (link?.matchSource === 'MANUAL') {
        const cost = averages.get(link.modelKey);
        if (cost === undefined) {
          // El modelo ya no tiene pedidos recibidos: se mantiene la asignación con el último costo
          continue;
        }
        if (Math.abs(cost - link.unitCost) > 0.01) {
          ops.push(this.prisma.productCostLink.update({ where: { id: link.id }, data: { unitCost: cost } }));
        }
        continue;
      }
      const key = matchModelKey(p.name, keys);
      if (!key) {
        if (link) ops.push(this.prisma.productCostLink.delete({ where: { id: link.id } }));
        continue;
      }
      const cost = averages.get(key)!;
      if (!link) {
        ops.push(
          this.prisma.productCostLink.create({
            data: { productId: p.id, modelKey: key, unitCost: cost, matchSource: 'AUTO' },
          }),
        );
      } else if (link.modelKey !== key || Math.abs(link.unitCost - cost) > 0.01) {
        ops.push(
          this.prisma.productCostLink.update({ where: { id: link.id }, data: { modelKey: key, unitCost: cost } }),
        );
      }
    }
    for (let i = 0; i < ops.length; i += 500) {
      await this.prisma.$transaction(ops.slice(i, i + 500));
    }
    return { changed: ops.length };
  }

  /** Pantalla "Costos por producto": modelos con costo y productos agrupados por nombre. */
  async productCosts() {
    const averages = await this.modelAverages();
    const products = await this.prisma.product.findMany({
      select: {
        id: true,
        name: true,
        style: true,
        status: true,
        price: true,
        costLink: true,
        inventory: { select: { quantity: true } },
        _count: { select: { saleItems: true } },
      },
    });
    const groups = new Map<
      string,
      {
        name: string;
        style: string | null;
        status: string;
        price: number;
        variants: number;
        stock: number;
        salesLines: number;
        modelKey: string | null;
        unitCost: number | null;
        matchSource: CostMatchSource | null;
      }
    >();
    for (const p of products) {
      const g = groups.get(p.name) || {
        name: p.name,
        style: p.style,
        status: p.status,
        price: p.price,
        variants: 0,
        stock: 0,
        salesLines: 0,
        modelKey: null,
        unitCost: null,
        matchSource: null,
      };
      g.variants += 1;
      g.stock += p.inventory.reduce((s, i) => s + Math.max(0, i.quantity), 0);
      g.salesLines += p._count.saleItems;
      if (p.status === 'active') g.status = 'active';
      if (p.costLink) {
        g.modelKey = p.costLink.modelKey;
        g.unitCost = round(p.costLink.unitCost);
        g.matchSource = p.costLink.matchSource;
      }
      groups.set(p.name, g);
    }
    const all = [...groups.values()];
    return {
      models: [...averages.entries()]
        .map(([modelKey, unitCost]) => ({ modelKey, unitCost: round(unitCost) }))
        .sort((a, b) => a.modelKey.localeCompare(b.modelKey)),
      unmatched: all
        .filter((g) => !g.modelKey)
        .sort((a, b) => b.stock - a.stock || b.salesLines - a.salesLines || a.name.localeCompare(b.name)),
      matched: all.filter((g) => g.modelKey).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /** Asigna a mano un modelKey a todas las variantes (tallas) con ese nombre de producto. */
  async assignProductCost(body: Body) {
    const productName = str(body, 'productName', { required: true })!;
    const modelKey = normalizeKey(str(body, 'modelKey', { required: true })!);
    const averages = await this.modelAverages();
    const cost = averages.get(modelKey);
    if (cost === undefined) {
      throw new BadRequestException(`El modelo "${modelKey}" no tiene pedidos recibidos con costo`);
    }
    const products = await this.prisma.product.findMany({ where: { name: productName }, select: { id: true } });
    if (!products.length) throw new NotFoundException('Producto no encontrado');
    await this.prisma.$transaction(
      products.map((p) =>
        this.prisma.productCostLink.upsert({
          where: { productId: p.id },
          create: { productId: p.id, modelKey, unitCost: cost, matchSource: 'MANUAL' },
          update: { modelKey, unitCost: cost, matchSource: 'MANUAL' },
        }),
      ),
    );
    return { updated: products.length, unitCost: round(cost) };
  }

  /** Quita la asignación manual; el producto vuelve a la coincidencia automática. */
  async unassignProductCost(body: Body) {
    const productName = str(body, 'productName', { required: true })!;
    await this.prisma.productCostLink.deleteMany({ where: { product: { name: productName } } });
    await this.recomputeCostLinks();
    return { ok: true };
  }

  // ============================================================
  // Gastos
  // ============================================================

  async listExpenses(query: { from?: string; to?: string; category?: string }) {
    const where: Prisma.ExpenseWhereInput = {};
    if (query.from || query.to) {
      where.period = compact({ gte: query.from || undefined, lte: query.to || undefined });
    }
    if (query.category) {
      where.category = oneOf({ category: query.category }, 'category', EXPENSE_CATEGORIES);
    }
    return this.prisma.expense.findMany({
      where,
      orderBy: [{ period: 'desc' }, { category: 'asc' }, { date: 'asc' }],
    });
  }

  private expenseData(body: Body, creating: boolean) {
    const period = str(body, 'period', { required: creating });
    if (period && !isValidPeriod(period)) throw new BadRequestException('period debe tener formato YYYY-MM');
    let docDate = date(body, 'date');
    if (creating && !docDate) docDate = new Date(`${period}-01T12:00:00.000Z`);
    const amortize = body.amortizeMonths === null || body.amortizeMonths === '' ? null : int(body, 'amortizeMonths', { min: 1 });
    return compact({
      date: docDate ?? undefined,
      period: period ?? undefined,
      category: oneOf(body, 'category', EXPENSE_CATEGORIES, { required: creating }),
      kind: oneOf(body, 'kind', EXPENSE_KINDS),
      supplier: str(body, 'supplier'),
      description: str(body, 'description', { required: creating }) ?? undefined,
      amountNet: num(body, 'amountNet', { required: creating }),
      vatAmount: num(body, 'vatAmount', { min: 0 }),
      paymentMethod: str(body, 'paymentMethod'),
      notes: str(body, 'notes'),
      amortizeMonths: amortize,
    });
  }

  createExpense(body: Body) {
    return this.prisma.expense.create({ data: this.expenseData(body, true) as Prisma.ExpenseCreateInput });
  }

  async updateExpense(id: string, body: Body) {
    await this.ensureExpense(id);
    return this.prisma.expense.update({ where: { id }, data: this.expenseData(body, false) });
  }

  async deleteExpense(id: string) {
    const e = await this.ensureExpense(id);
    await this.prisma.expense.delete({ where: { id } });
    if (e.documentUrl) await this.storage.remove(e.documentUrl);
    return { ok: true };
  }

  private async ensureExpense(id: string) {
    const e = await this.prisma.expense.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Gasto no encontrado');
    return e;
  }

  /**
   * Copia los gastos FIJOS del mes anterior al período indicado (sin documentos).
   * No duplica los que ya existen en el destino con la misma categoría y descripción.
   */
  async duplicateFixedExpenses(body: Body) {
    const to = str(body, 'period', { required: true })!;
    if (!isValidPeriod(to)) throw new BadRequestException('period debe tener formato YYYY-MM');
    const from = addMonths(to, -1);
    const [source, existing] = await Promise.all([
      this.prisma.expense.findMany({
        where: { period: from, kind: 'FIXED', category: { notIn: ['CAPEX', 'FINANCIAL_COST'] } },
      }),
      this.prisma.expense.findMany({ where: { period: to }, select: { category: true, description: true } }),
    ]);
    const taken = new Set(existing.map((e) => `${e.category}|${e.description.toLowerCase()}`));
    const toCreate = source.filter((e) => !taken.has(`${e.category}|${e.description.toLowerCase()}`));
    if (toCreate.length) {
      await this.prisma.expense.createMany({
        data: toCreate.map((e) => ({
          date: new Date(`${to}-01T12:00:00.000Z`),
          period: to,
          category: e.category,
          kind: e.kind,
          supplier: e.supplier,
          description: e.description,
          amountNet: e.amountNet,
          vatAmount: e.vatAmount,
          paymentMethod: e.paymentMethod,
          amortizeMonths: e.amortizeMonths,
          notes: `Duplicado de ${from}`,
        })),
      });
    }
    return { from, to, created: toCreate.length, skipped: source.length - toCreate.length };
  }

  // ============================================================
  // Aportes de capital y caja
  // ============================================================

  listContributions() {
    return this.prisma.capitalContribution.findMany({ orderBy: { date: 'desc' } });
  }

  private contributionData(body: Body, creating: boolean) {
    return compact({
      date: date(body, 'date', { required: creating }) ?? undefined,
      partner: str(body, 'partner', { required: creating }) ?? undefined,
      amount: num(body, 'amount', { required: creating }),
      notes: str(body, 'notes'),
    });
  }

  createContribution(body: Body) {
    return this.prisma.capitalContribution.create({
      data: this.contributionData(body, true) as Prisma.CapitalContributionCreateInput,
    });
  }

  async updateContribution(id: string, body: Body) {
    await this.ensureContribution(id);
    return this.prisma.capitalContribution.update({ where: { id }, data: this.contributionData(body, false) });
  }

  async deleteContribution(id: string) {
    await this.ensureContribution(id);
    await this.prisma.capitalContribution.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureContribution(id: string) {
    const c = await this.prisma.capitalContribution.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Aporte no encontrado');
  }

  listCashBalances() {
    return this.prisma.cashBalance.findMany({ orderBy: { date: 'desc' }, take: 24 });
  }

  createCashBalance(body: Body) {
    return this.prisma.cashBalance.create({
      data: {
        date: date(body, 'date', { required: true })!,
        amount: num(body, 'amount', { required: true })!,
        notes: str(body, 'notes') ?? null,
      },
    });
  }

  async deleteCashBalance(id: string) {
    await this.prisma.cashBalance.deleteMany({ where: { id } });
    return { ok: true };
  }

  // ============================================================
  // Documentos
  // ============================================================

  async attachDocument(kind: 'cost' | 'expense', id: string, file: UploadedDocument) {
    const current =
      kind === 'cost'
        ? await this.prisma.importOrderCost.findUnique({ where: { id }, select: { documentUrl: true } })
        : await this.prisma.expense.findUnique({ where: { id }, select: { documentUrl: true } });
    if (!current) throw new NotFoundException(kind === 'cost' ? 'Costo no encontrado' : 'Gasto no encontrado');
    const path = await this.storage.upload(kind === 'cost' ? 'costos' : 'gastos', file);
    if (kind === 'cost') await this.prisma.importOrderCost.update({ where: { id }, data: { documentUrl: path } });
    else await this.prisma.expense.update({ where: { id }, data: { documentUrl: path } });
    if (current.documentUrl) await this.storage.remove(current.documentUrl);
    return { documentUrl: path };
  }

  async documentLink(kind: 'cost' | 'expense', id: string) {
    const current =
      kind === 'cost'
        ? await this.prisma.importOrderCost.findUnique({ where: { id }, select: { documentUrl: true } })
        : await this.prisma.expense.findUnique({ where: { id }, select: { documentUrl: true } });
    if (!current?.documentUrl) throw new NotFoundException('Sin documento adjunto');
    return { url: await this.storage.signedUrl(current.documentUrl) };
  }

  // ============================================================
  // Resultado mensual y resumen
  // ============================================================

  private async salesByPeriod(from: string, to: string) {
    // Margen de un día a cada lado; el período exacto se calcula con hora de Chile
    const start = new Date(`${from}-01T00:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - 1);
    const end = new Date(`${addMonths(to, 1)}-01T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);

    const sales = await this.prisma.sale.findMany({
      // RETAIL = mayorista (Paris, Falabella): fuera del módulo
      where: { type: { not: 'RETAIL' }, date: { gte: start, lt: end } },
      select: {
        date: true,
        total: true,
        items: {
          select: { quantity: true, product: { select: { name: true, costLink: { select: { unitCost: true } } } } },
        },
      },
    });

    const out = new Map<string, { netSales: number; pairs: number; cogs: number; noCost: number }>();
    for (const s of sales) {
      const p = periodOf(s.date);
      if (p < from || p > to) continue;
      const row = out.get(p) || { netSales: 0, pairs: 0, cogs: 0, noCost: 0 };
      row.netSales += s.total / (1 + IVA_RATE);
      for (const it of s.items) {
        if (!isProductSockOrAccessory(it.product.name)) row.pairs += it.quantity;
        const cost = it.product.costLink?.unitCost;
        if (cost === undefined) row.noCost += it.quantity;
        else row.cogs += it.quantity * cost;
      }
      out.set(p, row);
    }
    return out;
  }

  async monthly(fromQ?: string, toQ?: string) {
    const current = periodOf(new Date());
    const to = toQ || current;
    const from = fromQ || addMonths(to, -11);
    if (!isValidPeriod(from) || !isValidPeriod(to) || from > to) {
      throw new BadRequestException('from y to deben ser YYYY-MM y from <= to');
    }
    const rows = await this.computeMonthly(from, to);
    const ma = rows.map((r) => r.operatingResultMA3);
    return {
      from,
      to,
      rows,
      trend: {
        // Pendiente del promedio móvil 3m en CLP por mes (positivo = mejorando)
        slopePerMonth: (() => {
          const s = linearSlope(ma);
          return s === null ? null : round(s);
        })(),
      },
      notes: [
        'Ventas netas = total / 1,19. Excluye ventas RETAIL (mayoristas).',
        'Costo de ventas usa el costo vigente (promedio ponderado) de cada producto.',
      ],
    };
  }

  /** Calcula los meses [from, to]; trae 2 meses previos para el promedio móvil. */
  private async computeMonthly(from: string, to: string): Promise<MonthlyRow[]> {
    const calcFrom = addMonths(from, -2);
    const periods = periodRange(calcFrom, to);
    const [sales, expenses] = await Promise.all([
      this.salesByPeriod(calcFrom, to),
      this.prisma.expense.findMany({
        // Un gasto amortizado puede venir de hasta varios años antes
        where: { period: { lte: to } },
        select: { period: true, category: true, kind: true, amountNet: true, amortizeMonths: true },
      }),
    ]);
    const exp = expensesByPeriod(expenses);

    const salesOf = (p: string) => sales.get(p) || { netSales: 0, pairs: 0, cogs: 0, noCost: 0 };
    const base = periods.map((period, idx) => {
      const s = salesOf(period);
      const e = exp.get(period) || { operating: 0, fixed: 0, capex: 0, financial: 0, byCategory: {} };
      const grossMargin = s.netSales - s.cogs;
      const operatingResult = grossMargin - e.operating;
      // Margen bruto unitario PROMEDIO de los últimos 3 meses (incluye el actual):
      // un solo mes con pocas ventas o devoluciones da valores sin sentido.
      const window = periods.slice(Math.max(0, idx - 2), idx + 1).map(salesOf);
      const wPairs = window.reduce((sum, w) => sum + w.pairs, 0);
      const wMargin = window.reduce((sum, w) => sum + w.netSales - w.cogs, 0);
      const unitGrossMargin = wPairs > 0 ? wMargin / wPairs : null;
      return {
        period,
        netSales: round(s.netSales),
        pairsSold: s.pairs,
        unitsWithoutCost: s.noCost,
        costOfSales: round(s.cogs),
        grossMargin: round(grossMargin),
        grossMarginPct: s.netSales ? grossMargin / s.netSales : null,
        operatingExpenses: round(e.operating),
        fixedExpenses: round(e.fixed),
        expensesByCategory: Object.fromEntries(Object.entries(e.byCategory).map(([k, v]) => [k, round(v)])),
        operatingResult: round(operatingResult),
        financialCost: round(e.financial),
        resultAfterFinancing: round(operatingResult - e.financial),
        capex: round(e.capex),
        unitGrossMargin: unitGrossMargin !== null ? round(unitGrossMargin) : null,
        breakEvenPairs: (() => {
          const b = breakEvenPairs(e.fixed, unitGrossMargin);
          return b === null ? null : Math.ceil(b);
        })(),
      };
    });
    const ma = movingAverage3(base.map((r) => r.operatingResult));
    return base
      .map((r, i) => ({ ...r, operatingResultMA3: ma[i] === null ? null : round(ma[i]!) }))
      .slice(2);
  }

  async summary() {
    // El mes en curso está incompleto: los indicadores se calculan al último mes cerrado
    const lastClosed = addMonths(periodOf(new Date()), -1);
    const [contrib, capex, firstExpense, firstSale, inventory, cash] = await Promise.all([
      this.prisma.capitalContribution.aggregate({ _sum: { amount: true } }),
      this.prisma.expense.aggregate({ _sum: { amountNet: true }, where: { category: 'CAPEX' } }),
      this.prisma.expense.findFirst({ orderBy: { period: 'asc' }, select: { period: true } }),
      this.prisma.sale.findFirst({
        where: { type: { not: 'RETAIL' } },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
      this.prisma.inventory.findMany({
        where: { quantity: { gt: 0 } },
        select: {
          quantity: true,
          product: { select: { status: true, costLink: { select: { unitCost: true } } } },
        },
      }),
      this.prisma.cashBalance.findFirst({ orderBy: { date: 'desc' } }),
    ]);

    let stockValue = 0;
    let stockUnits = 0;
    let stockUnitsWithoutCost = 0; // solo productos activos: los archivados suelen traer stock antiguo de Shopify
    for (const inv of inventory) {
      stockUnits += inv.quantity;
      const c = inv.product.costLink?.unitCost;
      if (c !== undefined) stockValue += inv.quantity * c;
      else if (inv.product.status === 'active') stockUnitsWithoutCost += inv.quantity;
    }

    // El resultado acumulado parte con el primer gasto registrado (inicio del negocio en Finanzas).
    // No se parte desde la primera venta porque hay ventas históricas muy antiguas sin gastos.
    const candidate = firstExpense?.period ?? (firstSale ? periodOf(firstSale.date) : undefined);
    const from = candidate && candidate <= lastClosed ? candidate : undefined;
    const rows = from ? await this.computeMonthly(from, lastClosed) : [];
    const last = rows[rows.length - 1];
    const ma3 = last?.operatingResultMA3 ?? null;

    const contributions = contrib._sum.amount || 0;
    const cashAmount = cash?.amount ?? null;
    const hole = contributions - (cashAmount ?? 0) - stockValue;
    const months = monthsToRecover(hole, ma3);

    return {
      asOfPeriod: lastClosed,
      contributionsTotal: round(contributions),
      capexTotal: round(capex._sum.amountNet || 0),
      stockValue: round(stockValue),
      stockUnits,
      stockUnitsWithoutCost,
      operatingResultAccumulated: round(rows.reduce((s, r) => s + r.operatingResult, 0)),
      accumulatedFrom: from ?? null,
      cash: cash ? { amount: round(cash.amount), date: cash.date } : null,
      netHole: round(hole),
      operatingResultMA3: ma3,
      monthsToRecover: months === null ? null : Math.round(months * 10) / 10,
      recoverMessage:
        months === null ? 'No se recupera al ritmo actual (promedio móvil 3m no es positivo)' : null,
      lastMonth: last ?? null,
      warnings: [
        ...(cashAmount === null ? ['No hay caja registrada: el hoyo neto asume caja = 0'] : []),
        ...(stockUnitsWithoutCost > 0 ? [`${stockUnitsWithoutCost} unidades en stock de productos activos sin costo vinculado (no suman al stock valorizado)`] : []),
      ],
    };
  }
}
