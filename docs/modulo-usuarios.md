# Módulo de Usuarios y Configuración (Admin)

Este módulo está reservado únicamente para el rol de administradores (`SUPER_ADMIN` o `COUNTRY_ADMIN`).

## Funcionalidades del Módulo

### 1. Gestión del Personal
- Crear cuentas de usuario para nuevas vendedoras y asignarles su rol (`CLERK` o `COUNTRY_ADMIN`).
- Asignar una vendedora a una o más tiendas físicas (`UserStore`).

### 2. Control de Tiendas y Canales
- Dar de alta nuevas tiendas físicas asociadas a un país.
- Vincular las cuentas y credenciales de Shopify de cada tienda física (para multi-tienda y multi-país).

### 3. Escalabilidad Multi-País (Diseño Regional)
- **Aislamiento de Datos:** El administrador del país (`COUNTRY_ADMIN`) solo puede ver datos de ventas, clientes e inventarios correspondientes a su país (ej: Chile). El `SUPER_ADMIN` tiene visibilidad global.
- **Login Dinámico:** Al iniciar sesión, si una vendedora pertenece a más de una tienda, el sistema le pregunta en qué tienda operará su turno actual para descontar y sumar stock al inventario correcto.

### 4. Control de Acceso y Credenciales del Personal (POS)
- **Inicio de Sesión Simplificado**:
  - En la pantalla de login del POS, en lugar de digitar el correo electrónico, se despliega un **selector dinámico (dropdown)** que lista a todo el personal activo. El usuario simplemente selecciona su nombre de la lista e ingresa su contraseña.
- **Clave por Defecto e Ingreso Inicial**:
  - Al dar de alta una nueva vendedora, se le asigna la clave por defecto **`12345678`**.
  - Al iniciar sesión con esta clave inicial, el sistema POS interrumpe el ingreso y redirige a una pantalla de **"Actualizar Contraseña"**.
  - La vendedora debe registrar su contraseña personal y confirmarla. Una vez guardada con éxito en el backend, se actualiza en la base de datos y se inicia su sesión en el POS. Las credenciales iniciales de `12345678` quedan deshabilitadas para esa usuaria.

- **Nomenclatura de Roles**:
  - El rol del sistema `SUPER_ADMIN` se muestra a nivel de interfaz de usuario simplificado como **`ADMIN`** (anteriormente "Maestro"), lo que agiliza el entendimiento de jerarquías de sistema.
- **Edición de Usuarios**:
  - En la pestaña de configuración, el listado de personal registrado es interactivo. Al hacer clic sobre cualquier usuario, el formulario se transforma en **"Editar Usuario"** cargando automáticamente su nombre, correo, rol y tiendas asignadas.
  - Al editar, la contraseña es un campo opcional: si se deja en blanco, la clave anterior del usuario permanece inalterada en la base de datos. Se puede pulsar en el botón "Cancelar Edición" para retornar al formulario de creación limpio.
