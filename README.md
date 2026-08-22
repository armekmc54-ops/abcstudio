# ABC Studio — E-Commerce (Entregable técnico)

Este entregable cubre, del alcance pedido: **esquema SQL + seeds**, **backend de
integración con Mercado Pago (crear preferencia + webhook)**, y **boilerplate de
frontend (Home + Catálogo) con carrito funcional**.

Lo que **no** está en este entregable todavía (siguiente iteración, ya con la
estructura lista para crecer): rutas de auth, catálogo, carrito y orders del
backend; esas siguen el mismo patrón que `payments.routes.js` /
`payments.controller.js`.

## Estructura

```
database/schema.sql          -- DDL + 10 productos seed
backend/src/config/          -- conexión a PostgreSQL y cliente de Mercado Pago
backend/src/controllers/     -- lógica de negocio (payments.controller.js)
backend/src/routes/          -- mapeo de endpoints -> controladores
backend/src/server.js        -- punto de entrada de Express
frontend/index.html          -- home
frontend/catalog.html        -- catálogo con filtros y carrito
frontend/assets/js/cart.js   -- lógica de carrito (en memoria, ver nota abajo)
```

## Cómo correrlo

1. **Base de datos**
   ```
   createdb abc_studio
   psql abc_studio < database/schema.sql
   ```

2. **Backend**
   ```
   cd backend
   cp .env.example .env      # llena DATABASE_URL y MP_ACCESS_TOKEN (sandbox)
   npm install
   npm run dev
   ```
   Para que el **webhook** de Mercado Pago te llegue en desarrollo local,
   necesitas exponer tu `localhost` con un túnel (ej. `ngrok http 4000`) y
   poner esa URL pública en `BACKEND_PUBLIC_URL`.

3. **Frontend**
   `index.html` y `catalog.html` son **autocontenidos** (CSS y JS incluidos
   dentro del mismo archivo) — puedes abrirlos con doble clic o con
   Live Server, no necesitan `assets/` externos ni build. Los datos de
   producto están definidos directamente en cada `<script>`, como espejo
   del seed de la BD, para que el catálogo funcione sin backend corriendo.

## Decisiones a poder explicar en la oral

- **¿Por qué un solo `products` con `type`, en vez de una tabla por tipo
  de producto?** Evita duplicar carrito/orden/checkout por cada tipo.
  Lo que sí cambia por tipo son las tablas satélite: `class_sessions`
  (fecha/hora/cupo, para drop-ins y talleres) y `product_variants`
  (tallas/stock, para merch). `requires_booking` / `has_variants` en
  `products` le dicen al frontend cuál mostrar.

- **¿Por qué `unit_price` se copia en `order_items` en vez de leer siempre
  `products.price`?** Porque si el precio del producto cambia después,
  el pedido histórico no debe cambiar de valor retroactivamente.

- **¿Dónde se decide el precio final que se cobra?** Siempre en el
  backend, leyendo `orders`/`order_items` de la base de datos
  (`createPreference` en `payments.controller.js`). El frontend nunca
  manda el precio — eso es lo que evita que alguien manipule el total
  desde las herramientas de desarrollador del navegador.

- **¿Por qué el webhook vuelve a consultar el pago a la API de Mercado
  Pago en vez de confiar en el body que llega?** Porque un POST a tu
  endpoint de webhook se puede falsificar; el estado real solo es
  confiable si lo pides tú, con tu access token, directo a Mercado Pago.

- **¿Por qué el carrito del frontend usa un array en memoria y no
  `localStorage`?** Es una simulación a propósito simplificada — el
  carrito real vive en `carts`/`cart_items` (backend), ligado al usuario
  autenticado. Usar `localStorage` habría sido una solución de apariencia
  correcta pero que no conecta con la base de datos real del proyecto.

## Siguiente iteración sugerida
1. `auth.controller.js` (registro/login con bcrypt + JWT).
2. `orders.controller.js` (POST /api/orders que arma `orders` + `order_items`
   desde el carrito — es el paso que falta antes de `create-preference`).
3. Conectar `catalog.html` a `GET /api/products` real en vez de `products-data.js`.
4. Panel de administrador (CRUD de productos/inventario/pedidos).
