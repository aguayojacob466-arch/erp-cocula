# ERP Cocula — Guía de cambios y migración a otra máquina

Estado al **3 de octubre de 2026** (último commit: `b673c02`).
Repositorio: https://github.com/aguayojacob466-arch/erp-cocula · Sitio: https://erp-cocula.vercel.app

> **Seguridad:** este archivo NO contiene claves secretas. Donde hace falta una, dice `<...>` y te indica de dónde sacarla. No guardes secretas en el repositorio.

---

## 1. Qué es hoy el proyecto

Aplicación web para **Maquiladora de Cocula** (Jabones Ibarra). Hoy el producto es:

- **Ventas 2026**: dashboard donde el administrador **importa el reporte de CONTPAQ en Excel** y todos los usuarios ven KPIs, gráficas, Top 10 de productos y clientes y el detalle de facturación **en tiempo real**.
- **Usuarios** (solo admin): crear usuarios con correo y contraseña y asignarles permisos.
- Funciona en escritorio y celular.

Los módulos originales del ERP (Clientes, Productos, Pedidos, Embarques, Inventario, Producción, Panel) **siguen en `src/` pero ya no aparecen en la navegación**. Para volver a mostrarlos hay que importarlos en `src/App.jsx`.

### Arquitectura

| Pieza | Tecnología | Para qué |
|---|---|---|
| Interfaz | React 19 + Vite 8 | App del ERP (login, barra, Usuarios) |
| Dashboard | `public/dashboard-ventas.html` (HTML/JS independiente, dentro de un `<iframe>`) | Importar Excel, gráficas (ECharts), lectura de Excel (SheetJS) |
| Base de datos y login | **Supabase** (Postgres + Auth + Realtime) | Datos, usuarios, permisos, tiempo real |
| Servidor | **Vercel** (hosting + función `api/usuarios.js`) | Publicar el sitio y crear/borrar usuarios con seguridad |
| Código | GitHub | Cada `push` a `main` despliega solo en Vercel |

---

## 2. Cuentas y ubicaciones

| Servicio | Dato |
|---|---|
| GitHub | `aguayojacob466-arch/erp-cocula` (rama `main`) |
| Vercel | proyecto `erp-cocula` · https://erp-cocula.vercel.app · equipo "Promaquila de Cocula" (plan Hobby) |
| Supabase | proyecto **"Cocula"** (org "Promaquila de Cocula") · referencia `curlsaqsklojkjeglukw` |
| URL de Supabase | `https://curlsaqsklojkjeglukw.supabase.co` |
| Administrador | `j.aguayo@promaquiladecocula.com` |

> La cuenta de GitHub/Vercel/Supabase es **la nueva**, no la habitual.

---

## 3. Variables de entorno

### 3.1 En Vercel (Settings → Environment Variables)

Marca los tres entornos (**Production, Preview y Development**) y haz **Redeploy** después de cambiarlas: Vite las incorpora al compilar.

| Nombre | Tipo | Valor |
|---|---|---|
| `VITE_SUPABASE_URL` | **Config** (no Secret) | `https://curlsaqsklojkjeglukw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Config** (no Secret) | `sb_publishable_GxUqMWu2A5_Kpns0Nw0SEQ_Wdxydo_S` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | `<tu secret key de Supabase>` (empieza con `sb_secret_...`) |

Notas importantes:

- **Por qué "Config" y no "Secret" en las dos primeras:** Vercel no deja marcar como secretas las variables que empiezan con `VITE_`, porque Vite las mete en el código del navegador. Es correcto: la URL y la *publishable key* están hechas para ser públicas. La seguridad real la dan las políticas RLS de Supabase.
- **`SUPABASE_SERVICE_ROLE_KEY` nunca lleva prefijo `VITE_`** y nunca va en el navegador ni en el repositorio. Solo la lee la función `api/usuarios.js` en el servidor. Se obtiene en Supabase → Settings → API Keys → *secret*.
- Si ya existían `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` como Secret, hay que **borrarlas y recrearlas** como Config.
- La key `VITE_SUPABASE_ANON_KEY` se llama "anon" por el nombre que lee el código, pero contiene la *publishable key*; funciona igual.

### 3.2 En la máquina local (archivo `.env` en la raíz, NO se sube a git)

```env
VITE_SUPABASE_URL=https://curlsaqsklojkjeglukw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_GxUqMWu2A5_Kpns0Nw0SEQ_Wdxydo_S
```

`.env` está en `.gitignore`. El repo incluye `.env.example` como plantilla. **Localmente no hace falta** la `SUPABASE_SERVICE_ROLE_KEY`: la pantalla de crear usuarios solo funciona en el sitio publicado (ver §5).

---

## 4. Montar el proyecto en otra máquina

Requisitos: Node.js 20+ y Git.

```bash
git clone https://github.com/aguayojacob466-arch/erp-cocula.git
cd erp-cocula
npm install
# crear el archivo .env con las dos variables de §3.2
npm run dev          # http://localhost:5173
npm run build        # compilación de producción
npm run lint         # debe salir sin errores
```

Para subir cambios: `git push origin main` (Vercel despliega solo). Necesitarás autenticarte en GitHub con la cuenta nueva (token personal o el administrador de credenciales). **No guardes el token en el repositorio.**

Con el servidor local se puede iniciar sesión y usar el dashboard contra el Supabase real. Lo único que no corre en local es `api/usuarios.js`; para probarla en local necesitarías `vercel dev` con la variable secreta.

---

## 5. Supabase: cómo quedó configurado

Ejecutar **en este orden** en Supabase → SQL Editor (todos son idempotentes: se pueden repetir sin dañar datos):

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `supabase/schema.sql` | Crea las 11 tablas del ERP original, índices, RLS y la función `mover_inventario` |
| 2 | `supabase/auth.sql` | Tabla `perfiles` (rol por usuario), función `es_admin()`, trigger que crea el perfil de cada usuario nuevo, y **cierra el acceso anónimo** (solo usuarios con sesión). Aquí se fija `j.aguayo@promaquiladecocula.com` como admin |
| 3 | `supabase/dashboard.sql` | Tabla `dashboard_registros` (una fila por línea importada), RLS y activa **Realtime** |

### Roles y permisos

| | Administrador | Usuario |
|---|---|---|
| Ver el dashboard | Sí | Sí |
| Importar Excel | Sí | No |
| Exportar XLSX | Sí | No (botón oculto) |
| Pestaña Usuarios (crear, cambiar permisos/contraseña, eliminar) | Sí | No |

- **Importar** lo impone la base de datos (RLS con `es_admin()`), no solo la pantalla.
- **Exportar** está oculto solo en la interfaz: como el usuario puede *ver* los datos, técnicamente podría copiarlos. Si necesitas impedirlo de verdad, hay que limitar qué datos puede leer.
- Un usuario nuevo creado desde la pantalla entra como `usuario`, salvo que el admin elija otro rol.
- Para promover a alguien desde SQL: `update perfiles set rol = 'admin' where email = '...';`

### Recomendaciones de Supabase

- Si no quieres que cualquiera se registre por su cuenta: Authentication → Sign In / Providers → desactivar **Allow new users to sign up**.
- **Rotar la secret key** (y actualizarla en Vercel) porque se compartió en conversaciones.

---

## 6. El dashboard y el Excel

- Importa el reporte de CONTPAQ **"Análisis de Precios por Cliente"** (una fila por producto facturado). Detecta la fila de encabezados y lee solo hasta la columna **Importe**: lo que esté a la derecha (resúmenes manuales) se ignora.
- Cada línea queda con: folio, fecha, cliente, producto, cantidad, precio, descuento, importe y sucursal (sale del *Concepto* de la factura: Cocula, Culiacán, Monterrey, Gdl-Tol, CCE → "Exportación (CCE)").
- **Importar se SUMA, no sustituye.** Si el mismo registro ya existe (folio + fecha + producto + cantidad + precio + importe + sucursal) no se duplica. Subir otro mes se acumula.
- Limitación conocida: si una factura **cambia** en CONTPAQ y se vuelve a importar, la versión nueva se agrega como línea distinta y la vieja se queda. Una factura cancelada tampoco se borra. **Hoy no hay botón de borrar ni de reemplazar** (pendiente).
- El reporte de septiembre sumó **557 líneas, 226 facturas, 21 clientes y $39,674,873.50**. El "Total" manual del Excel ($41,449,523.50) incluye además **Ersapack ($1,774,650)**, que no viene en el reporte de CONTPAQ y no se importa.
- **Tiempo real:** cuando el admin importa, los demás usuarios ven el cambio en menos de un segundo (medido: 300–600 ms). El indicador de arriba dice **"En vivo"**.
- Firebase fue **desactivado** (ya no se usa). Los datos ya no viven en el navegador sino en Supabase.

---

## 7. Resumen de todos los cambios (en orden)

1. **Auditoría y migración a Supabase.**
   - `.env` salió del repo y se creó `.env.example`; `.gitignore` actualizado.
   - `index.html` restaurado (había sido sobrescrito por otro dashboard).
   - `produccion.jsx` → `Produccion.jsx` (el build fallaba en Linux/Vercel por mayúsculas).
   - Esquema SQL completo (`schema.sql`).
   - Bugs corregidos: fechas vacías (`''`) que Postgres rechazaba; fechas con `toISOString()` que daban el día siguiente en la noche (nuevo `hoy()` en `src/utils.js`); pedido huérfano si fallaba guardar items; embarques que no actualizaban la etapa del pedido; validaciones de cantidades; errores de carga silenciosos (nueva pantalla `ErrorCarga.jsx` con Reintentar); barra de stock con `NaN`; lint limpio.
   - Inventario: alta de insumos y movimientos **atómicos** con la función `mover_inventario`.
2. **Login y roles** (`Login.jsx`, `RolContext.js`, `auth.sql`): Supabase Auth, perfiles admin/usuario, RLS que exige sesión; eliminar solo admin.
3. **Dashboard de Ventas 2026** reintegrado en `public/dashboard-ventas.html` y mostrado en un marco dentro del ERP.
4. **Importación de CONTPAQ** y pestaña Facturación (KPIs, por sucursal, por día, Top 10 productos y clientes, detalle).
   - Arreglado un bug original: `fmtDate` (`padStart` sobre un número) rompía **toda** importación con fechas de Excel.
   - Arreglado otro bug original: `new Set(...).filter` en `populateFactFilters` cortaba el dibujo de gráficas y tabla.
5. **Firebase eliminado** (sin avisos ni botones).
6. **Rediseño azul / blanco / rojo** (tipografía Manrope). El rojo marca solo lo importante: el líder de cada ranking, el día pico y la exportación. KPIs cuyo tamaño se ajusta para no desbordar la tarjeta.
7. **Ancho completo:** se quitó el límite de 1126 px que venía de la plantilla de Vite (`src/index.css` reescrito).
8. **Solo Ventas 2026** en la navegación; **pestaña Devoluciones eliminada** del dashboard.
9. **Datos compartidos en tiempo real** (`dashboard.sql`, `dashboard_registros`): lo que importa el admin lo ven todos al instante; el rol "usuario" no ve Importar ni Exportar.
10. **Gestión de usuarios** (`src/Usuarios.jsx` + `api/usuarios.js`): agregar con correo y contraseña, rol admin/usuario, cambiar contraseña, eliminar. La función corre en servidor porque crear usuarios requiere la clave de servicio. Probada con 21 comprobaciones contra la base real y también en producción.
11. **Logo de Jabones Ibarra** (`public/logo.svg`, versión vectorial de 45 KB; el original pesaba 1.4 MB por una imagen incrustada) como favicon y en las barras y el login.
12. **Versión para celular:** barra del ERP en dos filas, alto real con `100dvh`, filtros sin zoom de iOS, detalle de facturación en tarjetas, gráficas compactas, Usuarios en tarjetas. Se corrigió además que las gráficas colapsaban en pantallas angostas y que los nombres de producto largos se truncaban igual (BCO y AZUL parecían el mismo).

### Historial de commits (`git log`)

```
b673c02 Adaptar la app a celular
b8897de Datos compartidos en tiempo real, gestion de usuarios y logo
4efe97f Quitar la pestana Devoluciones del dashboard
d082cfe Ancho completo: quitar el limite de 1126px de la plantilla de Vite
ec1263b Rediseño azul/blanco/rojo, arreglar graficas en blanco y dejar solo Ventas 2026
af6f06b Ventas 2026: importar reporte CONTPAQ de facturacion, quitar Firebase, pagina principal
32cfbbc Reintegrar Dashboard de Ventas 2026 como pestaña del ERP
3aa2a04 Agregar login con Supabase Auth y roles admin/usuario
b65c60f Auditoria: corregir bugs y manejar errores
8fc8c65 Agregar esquema SQL de Supabase
166d948 Restaurar index.html del ERP
```

---

## 8. Estructura del repositorio

```
api/usuarios.js            Función de servidor (Vercel): crear/cambiar/eliminar usuarios (solo admin)
public/dashboard-ventas.html   Dashboard de Ventas 2026 (HTML/JS independiente, se muestra en un iframe)
public/logo.svg            Logo ligero (encabezados y login)
public/favicon.svg         Favicon (logo sobre cuadro azul marino)
src/App.jsx                Sesión, barra superior y navegación (Ventas 2026 / Usuarios)
src/Login.jsx              Pantalla de inicio de sesión
src/Ventas.jsx             Marco del dashboard; le pasa al iframe el rol y el cliente de Supabase
src/Usuarios.jsx           Gestión de usuarios
src/RolContext.js          Contexto con esAdmin
src/supabaseClient.js      Cliente de Supabase (lee VITE_SUPABASE_*)
src/utils.js, ErrorCarga.jsx   Utilidades y pantalla de error
src/index.css              Estilos globales y de la barra / celular
src/{Clientes,Pedidos,Productos,Embarques,Inventario,Produccion,Dashboard}.jsx
                           Módulos originales del ERP (ya fuera de la navegación)
supabase/schema.sql, auth.sql, dashboard.sql   Esquema de la base (ejecutar en este orden)
.env.example               Plantilla de variables
MIGRACION.md               Este archivo
```

Cómo se comunican el ERP y el dashboard: `Ventas.jsx` publica `window.__ERP_ROL` y `window.__ERP_SUPABASE`; el dashboard (mismo origen) los lee de `window.parent`. Una página de otro origen no puede leerlos. Si el dashboard se abre directo (sin el ERP), no tiene sesión y trabaja solo con datos locales del navegador.

---

## 9. Pendientes y riesgos

- **Rotar claves:** la secret key de Supabase y el token de GitHub se compartieron en conversaciones. Rótalas y actualiza `SUPABASE_SERVICE_ROLE_KEY` en Vercel (con Redeploy).
- **Botón de borrar/reemplazar datos importados:** no existe. Con datos compartidos, un Excel mal importado lo ven todos y hoy solo se corrige borrando filas desde Supabase.
- La tabla de **Ventas** e **Inventario** del dashboard sigue siendo tabla con scroll en celular (solo Facturación se convirtió a tarjetas).
- No se revisó la orientación horizontal del celular.
- El registro público de Supabase sigue activado por defecto (ver §5).
- Quedó un aviso menor del detector de diseño (jerarquía tipográfica con muchos tamaños parecidos).
- Si Vercel no encontrara la función `api/usuarios.js`, no se podrán crear usuarios (verifica que el despliegue incluya la carpeta `api/`).

---

## 10. Lista de verificación al terminar de migrar

- [ ] `npm install` y `npm run dev` abren el login en local.
- [ ] Inicias sesión con el admin y ves **Ventas 2026** y **Usuarios**.
- [ ] El indicador del dashboard dice **En vivo**.
- [ ] Importar el Excel de septiembre da 557 líneas y $39,674,873.50.
- [ ] En **Usuarios** creas un usuario de prueba con permisos "Usuario" y, en otra ventana de incógnito, **no** ve Importar ni Exportar.
- [ ] Lo que importas aparece solo en la otra ventana.
- [ ] En Vercel están las 3 variables y el último despliegue está en verde.
