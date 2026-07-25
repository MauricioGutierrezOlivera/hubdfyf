# DFYF POS — Esquema y Modelo de Datos

Archivo del esquema Prisma: [schema.prisma](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/apps/api/prisma/schema.prisma)

El esquema de datos es compatible con **Prisma 7** y utiliza PostgreSQL.

## Modelos Principales

### 1. Country (País)
* **Propósito:** Configura los países disponibles (ej: Chile, code "CL"). Permite escalabilidad regional.
* **Relaciones:** Tiene múltiples `Store` y múltiples `User` administradores del país.

### 2. Store (Tienda Física)
* **Propósito:** Sucursales o puntos de venta físicos (ej: "Tienda Luis Pasteur", "Costanera").
* **Atributos:** Contiene `shopifyUrl` para mapear de cuál tienda online proviene su stock.
* **Relaciones:** Mapeado con `UserStore` (vendedoras) e `Inventory`.

### 3. User (Usuario / Vendedora)
* **Propósito:** Cuentas del personal. Roles: `SUPER_ADMIN`, `COUNTRY_ADMIN`, `CLERK` (vendedora).
* **Relaciones:** Relación N-a-N con tiendas (UserStore) y uno-a-muchos con ventas (`Sale`) y metas (`SalesGoal`).

### 4. Customer (Cliente)
* **Propósito:** Base de datos unificada de clientes (CRM).
* **Atributos:** `rut` (opcional y único), `name` (formato limpio y capitalizado), `email` (normalizado), `phone` (estandarizado) y `shopifyId` (para vinculación online).
* **Relaciones:** Tiene múltiples ventas registradas.

### 5. Product (Calzado / Variantes)
* **Propósito:** Cada fila representa una variante específica (Talla y Modelo) descargada de Shopify.
* **Atributos:** `shopifyId` (id de la variante en Shopify, único), `sku` (opcional), `name` (título del modelo), `family` (tipo: Botas, Balerinas, etc.), `size` (talla) y `price`.
* **Relaciones:** Asociado a múltiples `Inventory` y `SaleItem`.

### 6. Inventory (Stock)
* **Propósito:** Tabla de inventario que mapea la cantidad de cada variante por tienda.
* **Constraint:** Único `[storeId, productId]`.

### 7. Sale (Venta / Transacción)
* **Propósito:** Registra una venta, cambio, regalo o devolución.
* **Tipos (`SaleType`):** `NORMAL` (venta directa), `RETAIL` (venta al por mayor / retail), `EXCHANGE` (devolución o cambio).
* **Atributos:** `total` (monto final, negativo en devoluciones), `date` (fecha real de transacción), `vendedor` (texto original de la planilla), `channel` (ONLINE, OFFLINE, EVENTO), `paymentMethod` y `paymentBank`.

### 8. SaleItem (Detalle del ítem)
* **Propósito:** Los productos involucrados en la venta.
* **Atributos:** `quantity` (positivo para venta, negativo para devolución/cambio), `price` y `discount`.

### 9. SalesGoal (Meta de Venta)
* **Propósito:** Metas mensuales de venta asignadas a cada vendedora.
* **Constraint:** Único `[userId, month, year]`.
