# Reglas del Espacio de Trabajo: DFYF POS

Este archivo contiene reglas y directrices que todos los agentes de IA deben seguir de forma estricta al interactuar en este espacio de trabajo.

---

## 🗺️ Mapeo de Vocabulario y Documentación Modular

Cuando el usuario se refiera a un módulo del sistema utilizando lenguaje común, el agente debe remitirse de forma automática al archivo de documentación correspondiente para no procesar información innecesaria:

| Término Utilizado por el Usuario | Archivo de Documentación Correspondiente |
|---|---|
| **módulo de ventas**, **ventas**, **pos**, **carrito** | [docs/modulo-ventas.md](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/docs/modulo-ventas.md) |
| **módulo de clientes**, **clientes**, **crm**, **historial** | [docs/modulo-clientes.md](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/docs/modulo-clientes.md) |
| **módulo de reportes**, **reportes**, **metas**, **kpis** | [docs/modulo-reportes.md](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/docs/modulo-reportes.md) |
| **módulo de devoluciones**, **cambios**, **devoluciones** | [docs/modulo-ventas.md](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/docs/modulo-ventas.md) |
| **módulo de usuarios**, **usuarios**, **admin**, **configuracion** | [docs/modulo-usuarios.md](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/docs/modulo-usuarios.md) |
| **base de datos**, **modelos**, **tablas**, **prisma** | [docs/base-de-datos.md](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/docs/base-de-datos.md) |
| **shopify**, **integracion shopify** | [docs/integracion-shopify.md](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/docs/integracion-shopify.md) |
| **resumen general**, **arquitectura**, **stack** | [docs/resumen-general.md](file:///Users/mauricio/Desktop/ANTIGRAVITY/dfyf-system/docs/resumen-general.md) |

---

## ⚙️ Reglas de Comportamiento para Agentes

1. **Ejecución Autónoma de Comandos:** Ejecutar directamente y de forma autónoma todos los comandos de terminal, compilación, base de datos, pruebas y despliegue necesarios para resolver las tareas, sin pedir aprobación ni confirmación previa al usuario.
2. **Eficiencia de Contexto:** No intentes cargar toda la documentación junta si la tarea es específica de un módulo. Ve directo al archivo mapeado arriba.
3. **Sincronización con Shopify:** Nunca invoques métodos de escritura o modificación de stock en Shopify a menos que el usuario lo solicite de forma explicita para una prueba controlada.
4. **Persistencia de Formato:** El archivo `clientes_unificados.csv` en el Escritorio es la fuente de verdad consolidada del CRM histórico de las vendedoras y la web.
