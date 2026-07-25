# DFYF POS — Integración con Shopify

## Autenticación: Client Credentials Grant

Para las aplicaciones creadas en el **Dev Dashboard** de Shopify, la autenticación no utiliza tokens manuales persistentes. El backend solicita y refresca automáticamente tokens de acceso temporales (duración de 24 horas) mediante Client ID y Client Secret.

### Lógica de Autenticación ([shopify.service.ts](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/apps/api/shopify.service.ts))
El backend realiza un POST a `https://dfyf-chile.myshopify.com/admin/oauth/access_token` con:
- `grant_type`: `client_credentials`
- `client_id`: `SHOPIFY_CLIENT_ID`
- `client_secret`: `SHOPIFY_CLIENT_SECRET`

---

## Flujos y Sincronización de Inventario

### 1. Venta física (DFYF → Shopify)
Cuando se registra una venta en tienda física:
1. El backend NestJS guarda la venta en PostgreSQL local.
2. Llama al endpoint de Shopify `POST /admin/api/2025-01/inventory_levels/adjust.json` con `available_adjustment: -1`.
3. Si el llamado falla, la transacción se encola localmente para reintento automático.

### 2. Venta online (Shopify → DFYF)
Para sincronizar ventas hechas en la web, configuraremos Webhooks en Shopify apuntando a nuestro backend:
- `orders/create` → Llama a `POST /shopify/webhooks/orders` para descontar el stock de la tienda física si el pedido se retira en tienda, o actualizar la disponibilidad general.
- `products/create` y `products/update` → Actualiza el catálogo local.
- `customers/create` → Sincroniza nuevos clientes de la web.

---

## Endpoints de la API Creados

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/shopify/test` | Prueba de conexión (retorna información de la tienda dFyF Chile) |
| GET | `/shopify/products` | Lista productos de Shopify (soporta parámetros como `status=active`) |
| GET | `/shopify/locations` | Lista ubicaciones/bodegas de Shopify |
| POST | `/shopify/webhooks/orders` | Receptor de webhooks de pedidos |
