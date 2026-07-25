# Módulo de Clientes (CRM)

El CRM de DFYF consolida en una sola base de datos toda la clientela online y offline para permitir segmentaciones y acciones comerciales inteligentes.

## Características de la Ficha del Cliente

1. **Datos Básicos:**
   - Nombre completo (capitalizado y limpio).
   - RUT (opcional).
   - Correo electrónico (limpio y sin espacios).
   - Celular (normalizado de 9 dígitos).

2. **Métricas de Compra:**
   - **Historial de Calzado:** Listado completo de los zapatos que ha comprado.
   - **Tallas Compradas:** Mapeo de las tallas que ha llevado históricamente (ej. si su talla preferida es 37 o si varía entre 37 y 38).
   - **Cantidad de Zapatos Comprados:** Zapatos totales acumulados históricamente.
   - **Última Compra:** Fecha real del último zapato adquirido.

3. **Segmentaciones y Audiencias:**
   - Permite filtrar clientes según su talla de zapato preferida para crear audiencias de marketing rápidas (ej. *"Filtrar clientes talla 38 para enviar promoción"*).
   - Filtrar por fecha de inactividad (ej. *"Clientes que no compran desde hace 6 meses"*).
