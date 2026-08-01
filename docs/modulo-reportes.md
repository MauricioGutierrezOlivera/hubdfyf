# Módulo de Reportes y Metas

Este módulo permite analizar el rendimiento de las vendedoras, tiendas y canales de venta mediante el uso de los datos unificados en PostgreSQL.

## Funcionalidades del Módulo

### 1. Metas Mensuales Grupales (En Unidades)
- Las metas son mensuales y colectivas para todo el equipo de la tienda (no individuales).
- La unidad de medida es en **Pares de Zapatos** (unidades físicas de calzado real). Las ventas de calcetines, plantillas/accesorios, **regalos** (con 100% de descuento) y **Cambios Sale** (el calzado de salida entregado en un cambio) se excluyen de la meta de unidades vendidas. Solo se consideran las ventas regulares (`Venta`) del equipo presencial, online y eventos. Los montos totales en pesos si consideran todas las operaciones.
- **Tabla de Metas Mensuales (Dinámicas por Período)**:
  Las metas varían mensualmente según la temporada y canal de venta:

  | Año | Mes | Meta Tienda Física (Pasteur) | Meta Canal Online (Web) |
  | :--- | :--- | :---: | :---: |
  | **2025** | Marzo | 38 | 4 |
  | **2025** | Abril | 70 | 10 |
  | **2025** | Mayo | 80 | 20 |
  | **2025** | Junio | 80 | 30 |
  | **2025** | Julio | 75 | 35 |
  | **2025** | Agosto | 70 | 40 |
  | **2025** | Septiembre | 75 | 45 |
  | **2025** | Octubre | 90 | 60 |
  | **2025** | Noviembre | 100 | 70 |
  | **2025** | Diciembre | 130 | 70 |
  | **2026** | Enero | 50 | 40 |
  | **2026** | Febrero | 45 | 45 |
  | **2026** | Marzo | 100 | 40 |
  | **2026** | Abril | 110 | 50 |
  | **2026** | Mayo | 45 | 15 |
  | **2026** | Junio | 50 | 20 |
  | **2026** | Julio | 45 | 20 |
  | **2026** | Agosto | 60 | 30 |
  | **2026** | Septiembre | 60 | 30 |
  | **2026** | Octubre | 110 | 60 |
  | **2026** | Noviembre | 125 | 75 |
  | **2026** | Diciembre | 55 | 35 |
- **Barra de Progreso Segmentada**:
  - La barra muestra el avance global del cumplimiento en porcentaje.
  - La barra interior está dividida en segmentos coloreados de forma proporcional al aporte de cada vendedora en ese periodo.
  - Si se alcanza o supera la meta mensual (100% o más), la barra cambia a un estado de éxito con efecto brillante y borde verde brillante.

### 2. Vista Unificada "Venta Mensual"
- **Acceso por Roles y Presentación de Filtros**:
  - **ADMIN** (`SUPER_ADMIN` / `COUNTRY_ADMIN`): Dispone de selectores interactivos `<select>` para cambiar de Año y Mes.
  - **VENDEDOR** (`CLERK`): Se muestra el período de forma clara en **Texto Informativo** (ej. `Julio 2026`) en lugar de un filtro inhabilitado, evitando sensaciones de bloqueo.
- **Cuadro Unificado Compacto de Totales y Metas**:
  - **Totalizadores Reducidos y Centralizados**: Ocupan una proporción menor (`col-span-3`) con textos centralizados horizontal y verticalmente.
  - **Barras de Progreso Ampliadas**: Ocupan el espacio remanente principal (`col-span-9`), permitiendo que las barras de progreso sean visiblemente más largas y detalladas.
  - **Barra Meta Mensual Tienda**: Titulada exactamente `Meta Mensual Tienda: N / X Pares` (donde N son las unidades vendidas en local y X la meta del mes). Muestra los segmentos de aporte coloreados de cada vendedora y su leyenda descriptiva (`Nombre: N p.`).
  - **Barra Meta Mensual Online**: Titulada exactamente `Venta Mensual Online: N / X Pares` (donde N son las unidades vendidas por la web y X la meta online).
  - **Optimización de Espacio**: Se eliminaron las métricas comparativas con el mes previo y el año anterior para privilegiar la visibilidad directa de la grilla de ventas.
- **Grilla Detallada de Registro de Ventas**:
  - Despliega inmediatamente debajo del cuadro unificado todas las operaciones registradas (Venta, Cambio Entra, Cambio Sale, Devolución, Regalo) con filtros por vendedor y ordenamiento por fecha.

### 3. Reporte de "Análisis Ventas" (Exclusivo Administradores)
- **Acceso Exclusivo**: Disponible únicamente para roles **ADMIN** (`SUPER_ADMIN` y `COUNTRY_ADMIN`) desde la barra de navegación lateral (**📈 Análisis Ventas**).
- **Filtros de Rango Flexible**:
  - Filtros **Desde** (Mes y Año) y **Hasta** (Mes y Año) para segmentar libremente cualquier periodo histórico.
  - Botones de acceso rápido (*Presets*) para "2025", "2026" y "Todo el Histórico".
- **Tarjetas Resumen del Periodo**:
  - Monto Total Facturado ($ CLP).
  - Ventas Canal ONLINE ($ CLP y % sobre el total).
  - Ventas Tienda Física / Resto de Canales ($ CLP y % sobre el total).
  - Promedio Mensual ($ CLP/mes y pares totales).
- **Gráfico Dinámico de Vectores y Barras Apiladas**:
  - **Eje Y**: Monto en CLP escalado dinámicamente según el valor máximo del periodo.
  - **Eje X**: Meses cronológicos del rango seleccionado.
  - **Barras Apiladas**:
    - **Verde**: Venta en Tienda Física / Resto de Canales.
    - **Ámbar**: Venta en Canal ONLINE.
    - **Etiqueta Interior/Superior**: Monto Total Facturado en cada mes.
  - **Curva de Tendencia Vectorial**: Línea SVG suavizada (Bezier) que conecta los totales mensuales con nodos interactivos.
  - **Ficha Flotante Interactiva (Hover)**: Al pasar el cursor sobre cualquier mes, despliega una tarjeta dinámica con el detalle completo en pesos, porcentajes por canal y pares vendidos.
- **Tabla de Auditoría Numérica**: Desglose mensual ordenado al pie del gráfico.

---

### 4. Reporte de "Análisis de Stock en Bodega" (Exclusivo Administradores)
- **Acceso Exclusivo**: Disponible únicamente para roles **ADMIN** (`SUPER_ADMIN` y `COUNTRY_ADMIN`) desde la barra de navegación lateral (**👟 Análisis Stock**).
- **Tarjetas Resumen de Existencias**:
  - Stock Total en Bodega (Unidades totales de calzado + accesorios).
  - Stock Calzado (Pares totales).
  - Modelos Únicos en Almacén.
  - Estilos de Calzado Disponibles.
- **Filtro Multi-Selección por Estilo (`🎨 FILTRAR POR ESTILO`)**:
  - Selector desplegable interactivo en la cabecera del módulo que sustituye el botón único.
  - Permite seleccionar "Todos los Estilos" o marcar múltiples estilos específicos (Bailarina, Blucher, Botín, Tacón, Sandalia, Yute, etc.), indicando el conteo de pares disponibles por estilo.
  - Filtra dinámicamente tanto la matriz desagrupada por Estilo como por Modelo.
  - Incluye etiquetas (*pills*) interactivas para eliminar filtros individuales o limpiar toda la selección de un solo clic.
- **Matriz de Curva de Tallas (35 a 42)**:
  - Visualización completa de existencias por talla.
  - Ordenamiento ascendente/descendente interactivo haciendo clic en cualquier encabezado de columna.
