# Módulo de Ventas (POS), Cambios y Devoluciones

## Funcionalidades del POS

1. **Búsqueda de Productos y Precios:**
   - Filtro rápido por Categoría (Balerinas, Botas, Sandalias, Yutes, Tacones, etc.).
   - Buscador por modelo o palabra clave de catálogo real (conectado a la base de datos PostgreSQL local).
   - Visualización horizontal compacta con la foto real del modelo sincronizada de Shopify (con fallback de emoji si no tiene).
   - **Visualización de Precios y Descuentos de Shopify:** Muestra el precio original tachado (`compareAtPrice`), el precio final en verde y el porcentaje de descuento entre paréntesis `(-X%)` cuando el producto cuenta con rebaja configurada desde Shopify. Si no posee descuento, muestra el precio final estándar.

2. **Selección de Tallas:**
   - Visualización dinámica de las tallas (35 a 42) y disponibilidad de stock real en tiempo real.
   - Selección táctil/rápida para añadir al carrito.

3. **Gestión de Carrito:**
   - Suma y resta de cantidades de calzado.
   - **Aplicación de Descuentos (Reglas de Negocio Clave):**
     * **Descuento por Producto:** Se ingresa directamente en el ítem del carro en pesos chilenos (CLP) y afecta el total unitario de ese calzado específico.
     * **Descuento General (Compra):** Se ingresa en la base del carro para toda la compra.
     * **Consistencia Contable / Distribución Proporcional:** Para conservar la consistencia de inventario y facturación (ya que la base de datos del backend calcula el total como la sumatoria de ítems de venta descontados), el descuento general ingresado se **distribuye de forma proporcional** entre los ítems del carro basándose en su valor y cantidad antes de enviarlo al servidor. De esta forma, el total del ticket coincide matemáticamente al centavo y se evita modificar el esquema SQL rígido.

4. **Identificación de Cliente:**
   - Búsqueda en tiempo real conectada al endpoint de base de datos local `GET /admin/customers/search?query=...` por RUT, correo electrónico o nombre.
   - **Regla de Integridad:** Se deben utilizar clientes reales recuperados de la base de datos para evitar errores de claves foráneas (`Sale_customerId_fkey`) durante el checkout.

5. **Registro de Venta:**
   - Campo opcional "Notas CRM" (ej. "Regalo de boda", "Ajustar horma").
   - El sistema **no procesa pagos directos** (los cobros se ejecutan en terminales de pago externas como Transbank).
   - Al hacer clic en "Registrar Venta":
     - Descuenta stock de PostgreSQL.
     - Llama a la API de Shopify en tiempo real para descontar stock online (Mockeado por seguridad en desarrollo).

---

## Cambios y Devoluciones integrados en el POS

Este flujo permite gestionar el reingreso y salida de inventario directamente desde la pantalla de ventas.

### 1. Búsqueda de Historial
- Se busca a la clienta ingresando su RUT o nombre.
- El sistema muestra el historial de compras de calzado con fechas, modelos, tallas y precios pagados.

### 2. Flujo de Devolución
- Se selecciona el modelo que la clienta devuelve.
- Al confirmar la devolución:
  - **Monto:** Se calcula una nota de crédito por el precio pagado (el total de la transacción es negativo para restar de las métricas de venta del mes).
  - **Inventario:** Se suma `+1` al stock de PostgreSQL y en Shopify de forma automática.

### 3. Flujo de Cambio (Intercambio en un solo Carrito)
- La clienta deja un modelo y se lleva otro (puede ser del mismo precio o diferente).
- **Proceso en base de datos:**
  - Se crea una transacción tipo `EXCHANGE`.
  - Contiene dos ítems:
    1. **Entrada (Zapato que deja):** `quantity` = `-1` (suma stock en sistema y Shopify), precio `$0` (o el original).
    2. **Salida (Zapato que lleva):** `quantity` = `1` (resta stock en sistema y Shopify), precio final.
  - El total de la transacción registra el cobro de la diferencia (ej. si lleva un modelo más caro).

---

## Diseño Visual (UI/UX) e Identidad de Marca

La paleta de colores y componentes está basada en el diseño premium de [dfyf.cl](https://www.dfyf.cl).

### Paleta de Colores
* **Acento Principal (Verde DFYF):** `#0e9f6e`
* **Verde Oscuro (Hover / Botón Activo):** `#046c4e`
* **Modo Claro (Light - Default):**
  - Fondo: `#FFFFFF`
  - Superficie: `#F9FAFB`
  - Texto: `#111827` (Alto contraste)
  - Bordes: `#E5E7EB`
* **Modo Oscuro (Dark):**
  - Fondo: `#022c20` (Verde botella profundo)
  - Superficie: `#033b2b`
  - Bordes: `#055740`
  - Texto: `#FFFFFF`

### Toggle de Tema
Botón de fácil acceso en la cabecera superior para intercambiar de tema (`☀️ Claro / 🌙 Oscuro`) con transiciones suaves en CSS.
