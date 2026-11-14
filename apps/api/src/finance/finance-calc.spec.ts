import {
  addMonths,
  breakEvenPairs,
  computeItemCosts,
  expensesByPeriod,
  linearSlope,
  matchModelKey,
  monthsToRecover,
  movingAverage3,
  normalizeKey,
  periodOf,
  periodRange,
  weightedAverageByModel,
} from './finance-calc';

describe('finance-calc', () => {
  it('normaliza modelKey sin tildes ni mayúsculas', () => {
    expect(normalizeKey('  Amatista  BLÁCK ')).toBe('amatista black');
    expect(normalizeKey('Botín Puma-Navy')).toBe('botin puma navy');
  });

  it('calcula períodos en hora de Chile y rangos de meses', () => {
    // 1 de marzo 02:00 UTC = 28 de febrero en Chile
    expect(periodOf(new Date('2025-03-01T02:00:00Z'))).toBe('2025-02');
    expect(addMonths('2025-11', 3)).toBe('2026-02');
    expect(addMonths('2025-01', -1)).toBe('2024-12');
    expect(periodRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  describe('costo puesto en tienda (prorrateo por valor de fábrica)', () => {
    const rate = 1000;
    const costs = [
      { type: 'FACTORY_INVOICE', amountClp: 300_000 },
      { type: 'FREIGHT', amountClp: 60_000 },
      { type: 'DUTIES', amountClp: 30_000 },
      { type: 'IMPORT_VAT', amountClp: 999_999 }, // nunca suma
    ];

    it('reparte los extras proporcional al valor de fábrica, sin IVA', () => {
      const res = computeItemCosts(
        [
          { quantityInvoiced: 10, quantityReceived: 10, unitCostEur: 20 }, // 200.000
          { quantityInvoiced: 5, quantityReceived: 5, unitCostEur: 20 }, // 100.000
        ],
        costs,
        rate,
      );
      // Extras = 90.000; ítem 1 recibe 2/3 = 60.000 → 6.000 por par
      expect(res[0].factoryCostClp).toBe(20_000);
      expect(res[0].allocatedExtraClp).toBeCloseTo(6_000);
      expect(res[0].landedUnitCostClp).toBeCloseTo(26_000);
      expect(res[1].landedUnitCostClp).toBeCloseTo(26_000);
      // Todo el costo sin IVA queda asignado
      const total = res[0].landedUnitCostClp * 10 + res[1].landedUnitCostClp * 5;
      expect(total).toBeCloseTo(390_000);
    });

    it('si llegan menos pares que los facturados, el costo se reparte entre los recibidos', () => {
      const res = computeItemCosts(
        [{ quantityInvoiced: 10, quantityReceived: 8, unitCostEur: 20 }],
        [{ type: 'FREIGHT', amountClp: 40_000 }],
        rate,
      );
      // (200.000 + 40.000) / 8
      expect(res[0].landedUnitCostClp).toBeCloseTo(30_000);
    });

    it('un ítem sin pares recibidos queda en 0 y no rompe el cálculo', () => {
      const res = computeItemCosts(
        [
          { quantityInvoiced: 2, quantityReceived: 0, unitCostEur: 10 },
          { quantityInvoiced: 2, quantityReceived: 2, unitCostEur: 10 },
        ],
        [],
        rate,
      );
      expect(res[0].landedUnitCostClp).toBe(0);
      expect(res[1].landedUnitCostClp).toBeCloseTo(10_000);
    });

    it('reproduce el costo del CSV de carga inicial (P1, Amatista black = 75.206)', () => {
      // P1: factura 22.958,39 EUR a 1.005; flete 1.745.000; amatista black 11 pares por 765,27 EUR
      const items = [
        { quantityInvoiced: 11, quantityReceived: 11, unitCostEur: 765.27 / 11 },
        { quantityInvoiced: 1, quantityReceived: 1, unitCostEur: 22958.39 - 765.27 },
      ];
      const res = computeItemCosts(items, [{ type: 'FREIGHT', amountClp: 1_745_000 }], 1005);
      expect(Math.round(res[0].landedUnitCostClp)).toBe(75206);
    });
  });

  it('promedio ponderado por pares recibidos', () => {
    const avg = weightedAverageByModel([
      { modelKey: 'amatista black', quantityReceived: 10, landedUnitCostClp: 20_000 },
      { modelKey: 'amatista black', quantityReceived: 30, landedUnitCostClp: 40_000 },
      { modelKey: 'amatista black', quantityReceived: 0, landedUnitCostClp: 999_999 },
      { modelKey: 'jade pink', quantityReceived: 5, landedUnitCostClp: 30_000 },
    ]);
    expect(avg.get('amatista black')).toBeCloseTo(35_000);
    expect(avg.get('jade pink')).toBe(30_000);
  });

  it('calza productos de Shopify con el modelo más específico', () => {
    const keys = ['amatista', 'amatista turquesa', 'jade pink'];
    expect(matchModelKey('Bailarina Amatista Turquesa', keys)).toBe('amatista turquesa');
    expect(matchModelKey('Tacón Jade Pink', keys)).toBe('jade pink');
    expect(matchModelKey('Bailarina Amatistas', keys)).toBeNull(); // palabra completa
    expect(matchModelKey('Running Tucán Black', keys)).toBeNull();
  });

  it('separa gasto operacional, CAPEX y costo financiero, y amortiza', () => {
    const byP = expensesByPeriod([
      { period: '2025-03', category: 'RENT', kind: 'FIXED', amountNet: 1000 },
      { period: '2025-03', category: 'MARKETING', kind: 'VARIABLE', amountNet: 500 },
      { period: '2025-03', category: 'CAPEX', kind: 'FIXED', amountNet: 9000 },
      { period: '2025-03', category: 'FINANCIAL_COST', kind: 'FIXED', amountNet: 200 },
      { period: '2025-03', category: 'FRANCHISE_FEE', kind: 'FIXED', amountNet: 1200, amortizeMonths: 12 },
    ]);
    const mar = byP.get('2025-03')!;
    expect(mar.operating).toBe(1600);
    expect(mar.fixed).toBe(1100);
    expect(mar.capex).toBe(9000);
    expect(mar.financial).toBe(200);
    expect(byP.get('2026-02')!.operating).toBe(100);
    expect(byP.get('2026-03')).toBeUndefined();
  });

  it('promedio móvil, pendiente, equilibrio y meses para recuperar', () => {
    expect(movingAverage3([3, 6, 9, 12])).toEqual([null, null, 6, 9]);
    expect(linearSlope([null, null, 6, 9, 12])).toBeCloseTo(3);
    expect(breakEvenPairs(1_000_000, 25_000)).toBe(40);
    expect(breakEvenPairs(1_000_000, -5)).toBeNull();
    expect(monthsToRecover(1_000_000, 250_000)).toBe(4);
    expect(monthsToRecover(1_000_000, -10)).toBeNull();
    expect(monthsToRecover(-5, 10)).toBe(0);
  });
});
