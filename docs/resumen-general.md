# DFYF POS — Resumen General y Arquitectura

## Resumen Ejecutivo
Sistema de Ventas para **DFYF** (tienda de zapatos chilena). Reemplaza un Excel en Google Drive por una plataforma web profesional con integración en tiempo real con Shopify.

**Sitio web actual:** [www.dfyf.cl](https://www.dfyf.cl)  
**Tienda Shopify:** `dfyf-chile.myshopify.com` ([admin](https://admin.shopify.com/store/dfyf-chile))

---

## Stack Tecnológico

| Capa | Tecnología | Puerto Local |
|---|---|---|
| Frontend | Next.js (React + TypeScript + Tailwind CSS) | `localhost:3000` |
| Backend | NestJS (Node.js + TypeScript) | `localhost:3001` |
| Base de Datos | PostgreSQL (via Prisma ORM) | Sandbox local / Supabase |
| E-commerce | Shopify Admin REST API (v2025-01) | Client Credentials Grant |

---

## Estructura del Proyecto (Monorepo)

```
/Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/
├── package.json              # NPM Workspaces (monorepo root)
├── apps/
│   ├── web/                  # Next.js Frontend
│   │   ├── src/app/
│   │   │   ├── page.tsx      # Vista POS principal
│   │   │   ├── globals.css   # Colores DFYF + Dark/Light mode
│   │   │   └── layout.tsx
│   │   └── public/
│   │       └── logo.png      # Logo DFYF 516x516
│   └── api/                  # NestJS Backend
│       ├── src/
│       │   ├── main.ts       # Entry point (puerto 3001, CORS habilitado)
│       │   ├── app.module.ts # Módulo raíz
│       │   └── shopify/
│       │       ├── shopify.module.ts
│       │       ├── shopify.service.ts        # Servicio API de Shopify (Client Credentials)
│       │       └── shopify.controller.ts     # Endpoints: test, products, locations, webhooks
│       ├── prisma/
│       │   └── schema.prisma  # Esquema de BD completo (Prisma 7 compatible)
│       └── .env               # Variables de entorno
```

---

## Hosting en Producción Recomendado

| Componente | Servicio Recomendado | Costo Inicial |
|---|---|---|
| Frontend (Next.js) | Vercel | Gratis |
| Backend (NestJS) | Railway o Render | Gratis o ~$5/mes |
| Base de Datos (PostgreSQL) | Supabase o Neon | Gratis |
