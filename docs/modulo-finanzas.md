# Módulo Finanzas — Costos de importación, gastos y resultado

Especificación funcional y técnica. Objetivo: medir el resultado real del negocio (por par, por pedido y por mes) para decidir si continuar. Solo perfil Administrador (SUPER_ADMIN / COUNTRY_ADMIN). El perfil VISITA solo lectura.

## Principios contables (no negociables)
1. **IVA fuera de todo costo y venta.** El IVA de importación y el IVA de gastos se recuperan en el F29: se registran aparte (campo `vatAmount`) y nunca suman al costo. Ventas siempre netas: `neto = total / 1.19`.
2. **La mercadería no es gasto al pagarla.** Al llegar un pedido entra a inventario valorizado; pasa a costo solo cuando se vende (costo de ventas).
3. **Cada peso se cuenta una vez.** Aportes de capital de los socios = inversión (no ingreso). Cuotas de créditos personales con que se financiaron los aportes = NO son gasto del negocio. Intereses de esos créditos se registran como "Costo financiero" en categoría aparte, mostrado bajo el resultado operacional.
4. **Inversión de apertura (obra, muebles, letrero, garantía) = CAPEX**, separada del gasto operacional mensual.
5. Ventas de Paris y Falabella (mayorista) no están en el POS: se registran en **Ventas mayoristas** (ver más abajo) y sí cuentan en el resultado.

## Modelo de datos (Prisma, solo tablas nuevas; no modificar tablas existentes salvo agregar campos opcionales)

### ImportOrder (Pedido de importación)
id, code (ej. "P1"), name (ej. "Pedido 1 - Barco Febrero 2025"), season (ej. "SS25"), transport enum AIR|SEA, orderDate, arrivalDate, eurClpRate (tipo de cambio usado para la factura de fábrica), status enum DRAFT|IN_TRANSIT|RECEIVED, notes, createdAt.

### ImportOrderCost (Costos del pedido)
id, orderId, type enum: FACTORY_INVOICE | FREIGHT | INSURANCE | CUSTOMS_AGENT | DUTIES | LOCAL_TRANSPORT | BANK_FEES | OTHER | IMPORT_VAT,
supplier, documentNumber, date, currency enum CLP|EUR|USD, amount, fxRate, amountClp (calculado = amount * fxRate), vatAmount, documentUrl (Supabase Storage), notes.
- IMPORT_VAT se guarda pero se EXCLUYE del costo (solo informativo / crédito fiscal).

### ImportOrderItem (Detalle de modelos del pedido)
id, orderId, style (Bailarina, Blucher…), model (ej. "Amatista"), color (ej. "black"), modelKey (normalizado: minúsculas, sin tildes, "amatista black"), quantityInvoiced, quantityReceived, unitCostEur (precio fábrica sin IVA), retailPrice (PVP con IVA), sizeBreakdown Json opcional ({"36":1,"37":2,...}).
Campos calculados (vista o columnas recalculadas al guardar):
- factoryCostClp = unitCostEur * order.eurClpRate
- allocatedExtraClp = (factoryValueItem / factoryValueTotalPedido) * sumaCostosNoFábricaSinIVA / quantityReceived  → **prorrateo por valor de fábrica**
- landedUnitCostClp = factoryCostClp + allocatedExtraClp
- Diferencias factura vs cajas: si quantityReceived < quantityInvoiced, el costo total del ítem se reparte entre los pares recibidos.

### ProductCostLink (vínculo variante Shopify ↔ modelo importado)
id, productId (→ Product), modelKey, unitCost (costo vigente), method = WEIGHTED_AVERAGE, updatedAt.
- Costo vigente = **promedio ponderado** del landedUnitCostClp de todos los pedidos recibidos de ese modelKey, ponderado por pares recibidos.
- Matching: Product.name normalizado contiene el modelKey (ej. "Bailarina Amatista Turquesa" → "amatista turquesa"). Pantalla para revisar productos sin match y asignarlos manualmente.

### Expense (Gasto)
id, date (fecha documento), period (YYYY-MM al que se imputa), category enum:
RENT | COMMON_EXPENSES | SALARIES | COMMISSIONS | MARKETING | ACCOUNTING | FRANCHISE_FEE (canon) | UTILITIES (internet, teléfono) | SUPPLIES | EVENTS | BANK_FEES | SHIPPING (ShipIt, despachos) | INSURANCE | TAXES_OTHER (patente) | CAPEX | FINANCIAL_COST | OTHER,
kind enum FIXED|VARIABLE, supplier, description, amountNet, vatAmount, paymentMethod, documentUrl, notes.
- Canon: se registra el pago real y además se puede marcar `amortizeMonths` (opcional) para mostrarlo prorrateado en el resultado.

### CapitalContribution (Aporte de socios)
id, date, partner, amount, notes.

### Storage
Bucket privado `finanzas-documentos` en Supabase Storage. Subida de PDF/imagen/xlsx desde los formularios de costo y gasto. (La lectura automática de facturas con IA queda para una fase posterior: por ahora el usuario sube el documento y escribe los montos.)

## Cálculos del resultado mensual (endpoint `GET /finance/monthly?from=&to=`)
Por mes (period):
- **Ventas netas** = Σ Sale.total / 1.19 (tipos NORMAL y EXCHANGE; excluir RETAIL; incluir canales ONLINE, OFFLINE, TIENDA, EVENTO).
- **Pares vendidos** = Σ SaleItem.quantity (negativos restan).
- **Costo de ventas** = Σ SaleItem.quantity × ProductCostLink.unitCost. Ítems sin costo vinculado: contar y reportar como "pares sin costo" (no inventar).
- **Margen bruto** y % sobre ventas netas.
- **Gastos operacionales** = Σ Expense.amountNet del período, excepto CAPEX y FINANCIAL_COST (canon según amortización si está definida).
- **Resultado operacional** = margen bruto − gastos operacionales.
- **Costo financiero** y **resultado después de financiamiento**.
- **Promedio móvil 3 meses** del resultado operacional y su tendencia (pendiente).
- **Punto de equilibrio en pares** = gastos fijos del mes / margen bruto unitario promedio.

Indicadores acumulados (`GET /finance/summary`):
- Aportes acumulados, CAPEX acumulado, stock valorizado actual (Σ Inventory.quantity × unitCost), resultado operacional acumulado.
- **Hoyo neto** = aportes acumulados − caja actual (input manual) − stock valorizado.
- **Meses para recuperar** = hoyo neto / promedio móvil 3m (si positivo; si es negativo mostrar "no se recupera al ritmo actual").

## Pantallas (nueva sección "Finanzas" en el menú, solo admin)
1. **Pedidos**: lista con código, temporada, transporte, pares, costo total sin IVA, costo promedio por par. Detalle con dos pestañas: *Costos* (formulario + adjuntos) y *Modelos* (tabla editable + costo puesto en tienda por par calculado + margen vs PVP neto).
2. **Gastos**: lista por mes filtrable por categoría, formulario simple, adjunto, botón "duplicar gastos fijos del mes anterior".
3. **Aportes**: lista y formulario.
4. **Resultado**: tabla mensual (filas = conceptos, columnas = meses) + gráfico de resultado operacional mensual con promedio móvil 3m + tarjetas: punto de equilibrio en pares vs pares reales del mes, hoyo neto, meses para recuperar.
5. **Costos por producto**: productos sin costo vinculado y asignación manual.

## Reglas de implementación
- Trabajar en rama `feature/modulo-finanzas`.
- Migración Prisma solo aditiva. Probar primero en base local. **No aplicar en producción sin aprobación explícita de Mauricio.**
- No escribir en Shopify.
- No cargar datos históricos: la carga inicial de los 8 pedidos y los gastos 2024-2026 la entregará el análisis (archivos CSV en `docs/carga-inicial/`), con un script de importación idempotente `apps/api/scripts/import-finance.ts`.
- Documentar el módulo en este mismo archivo y agregarlo al mapeo de `.agents/AGENTS.md`.

---

## Implementación (rama `feature/modulo-finanzas`, 2026-11-14)

### Archivos
| Capa | Ubicación |
|---|---|
| Esquema | `apps/api/prisma/schema.prisma` (sección "MÓDULO FINANZAS") |
| Migración SQL (aditiva + RLS) | `apps/api/prisma/sql/20261114_modulo_finanzas.sql` |
| Cálculos puros + pruebas | `apps/api/src/finance/finance-calc.ts`, `finance-calc.spec.ts` |
| API | `apps/api/src/finance/` (`finance.controller.ts`, `finance.service.ts`, `finance-admin.guard.ts`, `finance-storage.service.ts`) |
| Carga CSV | `apps/api/scripts/import-finance.ts` |
| Frontend | `apps/web/src/components/finance/` (menú "💰 Finanzas" en `page.tsx`) |

### Acceso
Solo `SUPER_ADMIN` y `COUNTRY_ADMIN`. **El perfil VISITA no tiene acceso** (decisión de Mauricio, reemplaza lo dicho arriba).
La API valida el rol en cada ruta con el header `x-user-id` (mismo mecanismo que Propuestas).

### Decisiones tomadas al implementar
- **Tablas extra:** `CashBalance` (caja real a una fecha, para el hoyo neto). `ImportOrderItem.category` (FOOTWEAR | ACCESSORY | PACKAGING) e `importKey` en costos, modelos, gastos y aportes (idempotencia de la carga CSV).
- **Prorrateo:** valor de fábrica de cada ítem = EUR unitario × facturados × tipo de cambio del pedido. Los costos no-fábrica (todo menos `FACTORY_INVOICE` e `IMPORT_VAT`) se reparten en proporción a ese valor. El costo total del ítem se divide por los pares **recibidos**. Reproduce el `landed_unit_cost_clp` de la carga inicial con diferencia máxima de 0,5 CLP.
- **Packaging** participa del prorrateo del pedido (como en la planilla), pero no se vincula a productos ni entra al costo de ventas.
- **Costo vigente:** promedio ponderado por pares recibidos de los pedidos en estado `RECEIVED`. Coincidencia por nombre: el nombre normalizado del producto debe contener el `modelKey` como palabras completas; si calzan varios, gana el más largo. Las asignaciones manuales (`matchSource = MANUAL`) se aplican a todas las tallas del producto y no se sobreescriben.
- **Ventas:** todas las ventas no `RETAIL`, cualquier canal (en el código existen ONLINE, OFFLINE y EVENTO; no hay "TIENDA"). Mes según hora de Chile.
- **Pares vendidos** excluyen calcetines y plantillas (misma regla que los reportes). Su costo sí entra al costo de ventas.
- **Punto de equilibrio:** gastos fijos del mes / margen bruto unitario promedio de los últimos 3 meses.
- **Resumen:** se calcula al último mes cerrado. El resultado acumulado parte del primer gasto registrado. "Unidades sin costo" cuenta solo productos activos (los archivados traen stock antiguo de Shopify).
- **Amortización:** cualquier gasto con `amortizeMonths` se reparte en partes iguales desde su período.

### Endpoints (`/finance`, todos solo Administrador)
`GET/POST /orders`, `GET/PATCH/DELETE /orders/:id`, `POST /orders/:id/costs`, `PATCH/DELETE /costs/:id`, `POST|GET /costs/:id/document`, `POST /orders/:id/items`, `PATCH/DELETE /items/:id`, `GET /product-costs`, `POST /product-costs/assign|unassign|recompute`, `GET/POST /expenses` (`?from=&to=&category=`), `POST /expenses/duplicate-fixed`, `PATCH/DELETE /expenses/:id`, `POST|GET /expenses/:id/document`, `GET/POST /contributions`, `PATCH/DELETE /contributions/:id`, `GET/POST /cash`, `DELETE /cash/:id`, `GET/POST /wholesale`, `PATCH/DELETE /wholesale/:id`, `POST|GET /wholesale/:id/document`, `GET /monthly?from=YYYY-MM&to=YYYY-MM`, `GET /summary`.

### Documentos
Bucket privado `finanzas-documentos` (proyecto Supabase `ardbkecvixlqufswdcoa`). Se guarda la ruta interna y se abren con un link firmado de 10 minutos. Variables de la API: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor). PDF, imagen o Excel, hasta 15 MB.

### Carga inicial
Desde `apps/api`: `npx ts-node --transpile-only scripts/import-finance.ts` simula y valida. Con `--apply` escribe. Si la base no es local exige además `--allow-remote`.
Es idempotente: actualiza las filas `csv:*`, borra las que ya no están en el CSV y no toca lo cargado a mano.

### Paso a producción (requiere aprobación de Mauricio)
1. Crear el bucket privado `finanzas-documentos` y configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el hosting de la API.
2. Aplicar `apps/api/prisma/sql/20261114_modulo_finanzas.sql` en la base de producción. Hacerlo **antes** del deploy, porque el build de la API ejecuta `prisma db push` y crearía las tablas sin RLS.
3. Deploy de la API y de la web.
4. Cargar los CSV con `--apply --allow-remote`.

### Ventas mayoristas (2026-11-15)
- Tablas `WholesaleSale` (cliente, N° factura único por cliente, fecha, período, IVA informativo, PDF) y `WholesaleSaleLine` (texto de la factura, `modelKey`, pares, precio unitario neto). SQL: `apps/api/prisma/sql/20261115_ventas_mayoristas.sql` (solo crea tablas, con RLS).
- Los pares salen de los pedidos de importación ya registrados: **no es un gasto nuevo**. En el mes de la factura suma la venta neta y su costo de ventas (promedio ponderado vigente del `modelKey`), igual que una venta de tienda.
- En el Resultado aparecen como líneas aparte (Tiendas / Mayoristas). Los **pares de equilibrio y el margen por par usan solo tiendas**, porque las compras mayoristas son esporádicas y con otro margen.
- No se registran como ventas `RETAIL` en el POS para no tocar ventas ni stock del POS. Las ventas `RETAIL` del POS siguen excluidas (hoy no hay ninguna).
- Paris: facturas N°38 (FW26, 21-05-2026) y N°43 y N°44 (SS26, 07-10-2026). En la N°44, "Lirio Pink" = Lirio Topos.

