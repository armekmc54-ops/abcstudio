-- =========================================================================
-- ABC STUDIO — E-COMMERCE DATABASE SCHEMA
-- Motor objetivo: PostgreSQL 14+
-- (Si tu curso exige MySQL: cambia SERIAL -> INT AUTO_INCREMENT,
--  TIMESTAMPTZ -> DATETIME, y los CHECK de enum funcionan igual en MySQL 8+)
--
-- DECISIÓN DE DISEÑO (para defender en la oral):
-- Un solo catálogo "products" cubre clases, membresías, talleres, cursos
-- digitales y mercancía, distinguidos por la columna `type`. Esto evita
-- duplicar catálogo/carrito/orden por cada tipo de artículo.
-- Dos tablas satélite resuelven lo que products.type NO puede resolver solo:
--   - product_variants  -> variantes con stock físico (tallas de merch)
--   - class_sessions    -> instancias con fecha/hora/cupo (talleres, drop-ins)
-- bookings conecta "qué compró" (order_items) con "a qué sesión asistirá".
-- =========================================================================

DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS class_sessions CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -------------------------------------------------------------------------
-- USERS
-- -------------------------------------------------------------------------
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  full_name       VARCHAR(120)  NOT NULL,
  email           VARCHAR(160)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,          -- nunca se guarda texto plano; ver auth.controller
  role            VARCHAR(20)   NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer', 'admin')),
  phone           VARCHAR(20),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- CATEGORIES  (baile urbano, heels, contemporáneo, mercancía, digital...)
-- -------------------------------------------------------------------------
CREATE TABLE categories (
  id      SERIAL PRIMARY KEY,
  name    VARCHAR(60) NOT NULL,
  slug    VARCHAR(60) NOT NULL UNIQUE
);

-- -------------------------------------------------------------------------
-- PRODUCTS  (catálogo único: clases, membresías, talleres, cursos, merch)
-- -------------------------------------------------------------------------
CREATE TABLE products (
  id                SERIAL PRIMARY KEY,
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name              VARCHAR(140)  NOT NULL,
  slug              VARCHAR(140)  NOT NULL UNIQUE,
  description       TEXT,
  type              VARCHAR(20)   NOT NULL
                      CHECK (type IN ('drop_in', 'pack', 'membership',
                                       'workshop', 'digital_course', 'merch')),
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  currency          CHAR(3)       NOT NULL DEFAULT 'MXN',
  image_url         VARCHAR(300),
  requires_booking  BOOLEAN       NOT NULL DEFAULT false, -- true = necesita class_sessions
  has_variants      BOOLEAN       NOT NULL DEFAULT false, -- true = necesita product_variants (tallas)
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- PRODUCT_VARIANTS  (tallas de merch; controla stock físico real)
-- -------------------------------------------------------------------------
CREATE TABLE product_variants (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        VARCHAR(10),                 -- 'S','M','L','XL', o NULL si no aplica
  sku         VARCHAR(40) NOT NULL UNIQUE,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

-- -------------------------------------------------------------------------
-- CLASS_SESSIONS  (instancias con fecha/hora/cupo: talleres y drop-ins)
-- -------------------------------------------------------------------------
CREATE TABLE class_sessions (
  id                SERIAL PRIMARY KEY,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_date      DATE    NOT NULL,
  start_time        TIME    NOT NULL,
  end_time          TIME    NOT NULL,
  instructor_name   VARCHAR(80) NOT NULL,
  location          VARCHAR(160) NOT NULL DEFAULT 'ABC Studio - Sala Principal',
  capacity_total    INTEGER NOT NULL CHECK (capacity_total > 0),
  capacity_booked   INTEGER NOT NULL DEFAULT 0 CHECK (capacity_booked >= 0),
  CONSTRAINT capacity_not_exceeded CHECK (capacity_booked <= capacity_total)
);

-- -------------------------------------------------------------------------
-- CARTS / CART_ITEMS  (carrito pre-checkout, 1 carrito activo por usuario)
-- -------------------------------------------------------------------------
CREATE TABLE carts (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id          SERIAL PRIMARY KEY,
  cart_id     INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  variant_id  INTEGER REFERENCES product_variants(id),
  session_id  INTEGER REFERENCES class_sessions(id),
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (cart_id, product_id, variant_id, session_id)
);

-- -------------------------------------------------------------------------
-- ORDERS / ORDER_ITEMS  (pedido confirmado -> lo que Mercado Pago cobra)
-- -------------------------------------------------------------------------
CREATE TABLE orders (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','failed','cancelled')),
  total_amount        NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  currency            CHAR(3) NOT NULL DEFAULT 'MXN',
  mp_preference_id    VARCHAR(80),          -- id de la preferencia creada en Mercado Pago
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  variant_id  INTEGER REFERENCES product_variants(id),
  session_id  INTEGER REFERENCES class_sessions(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0) -- se copia el precio al comprar
);

-- -------------------------------------------------------------------------
-- BOOKINGS  (une "lo que se compró" con "a qué sesión asistirá")
-- -------------------------------------------------------------------------
CREATE TABLE bookings (
  id              SERIAL PRIMARY KEY,
  order_item_id   INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  session_id      INTEGER NOT NULL REFERENCES class_sessions(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('confirmed','cancelled','attended')),
  booked_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- PAYMENT_TRANSACTIONS  (log crudo de cada notificación de Mercado Pago)
-- -------------------------------------------------------------------------
CREATE TABLE payment_transactions (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES orders(id),
  mp_payment_id   VARCHAR(80) NOT NULL,
  status          VARCHAR(30) NOT NULL,      -- approved | pending | rejected | in_process ...
  status_detail   VARCHAR(60),
  amount          NUMERIC(10,2) NOT NULL,
  raw_payload     JSONB,                     -- respuesta completa de MP, útil para depurar en la oral
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);

-- =========================================================================
-- SEED DATA — 10 productos reales de ABC Studio
-- =========================================================================

INSERT INTO categories (name, slug) VALUES
  ('Urbano', 'urbano'),
  ('Heels', 'heels'),
  ('Contemporáneo', 'contemporaneo'),
  ('Mercancía', 'merch'),
  ('Digital', 'digital');

-- 1) Clase suelta (drop-in)
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (1, 'Pase Drop-In Urbano', 'pase-drop-in-urbano',
        'Entra a una sola clase de hip hop, reggaetón o house. Ideal para probar.',
        'drop_in', 180.00, true, false);

-- 2) Paquete de 4 clases
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (1, 'Paquete x4 Clases', 'paquete-x4-clases',
        '4 clases grupales a elegir, válidas por 30 días.',
        'pack', 620.00, true, false);

-- 3) Membresía mensual ilimitada
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (1, 'Membresía Mensual Ilimitada', 'membresia-mensual-ilimitada',
        'Acceso ilimitado a todas las clases grupales durante 30 días.',
        'membership', 980.00, false, false);

-- 4) Taller intensivo de Heels (requiere sesión con fecha/cupo)
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (2, 'Taller Intensivo Heels (3 días)', 'taller-heels-intensivo',
        'Tres días consecutivos de técnica y coreografía en tacón. Cupo limitado.',
        'workshop', 650.00, true, false);

-- 5) Bootcamp de Hip Hop de fin de semana
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (1, 'Bootcamp Hip Hop Fin de Semana', 'bootcamp-hiphop-finde',
        'Sábado y domingo de fundamentos y coreografía grupal.',
        'workshop', 550.00, true, false);

-- 6) Curso digital de coreografía
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (5, 'Curso Digital: Coreografía Reggaetón', 'curso-digital-reggaeton',
        'Video-curso descargable, acceso de por vida, nivel intermedio.',
        'digital_course', 299.00, false, false);

-- 7) Curso digital de fundamentos
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (5, 'Curso Digital: Fundamentos de Popping', 'curso-digital-popping',
        'Video-curso descargable de aislamientos y control muscular.',
        'digital_course', 249.00, false, false);

-- 8) Merch: Hoodie (con tallas -> variants)
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (4, 'Hoodie ABC Studio', 'hoodie-abc-studio',
        'Sudadera oversize con logo bordado.',
        'merch', 550.00, false, true);

-- 9) Merch: Grip socks (con tallas -> variants)
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (4, 'Grip Socks ABC Studio', 'grip-socks-abc-studio',
        'Calcetines antiderrapantes para heels y piso.',
        'merch', 180.00, false, true);

-- 10) Merch: Dance bag (sin tallas)
INSERT INTO products (category_id, name, slug, description, type, price, requires_booking, has_variants)
VALUES (4, 'Dance Bag ABC Studio', 'dance-bag-abc-studio',
        'Bolsa deportiva impermeable, compartimento para tenis.',
        'merch', 420.00, false, false);

-- Variantes de talla para los productos con has_variants = true (ids 8 y 9)
INSERT INTO product_variants (product_id, size, sku, stock) VALUES
  (8, 'S',  'HOOD-S',  8),
  (8, 'M',  'HOOD-M',  15),
  (8, 'L',  'HOOD-L',  12),
  (8, 'XL', 'HOOD-XL', 6),
  (9, 'S',  'SOCK-S',  20),
  (9, 'M',  'SOCK-M',  25),
  (9, 'L',  'SOCK-L',  18);

-- Sesiones con fecha/hora/cupo para los productos que requieren reserva (drop_in, pack, workshops)
INSERT INTO class_sessions (product_id, session_date, start_time, end_time, instructor_name, capacity_total, capacity_booked) VALUES
  (1, '2026-09-07', '18:00', '19:00', 'Naty Cruz',   20, 12),  -- drop-in
  (1, '2026-09-09', '19:00', '20:00', 'Kevo Ramírez',20, 7),
  (4, '2026-09-18', '17:00', '20:00', 'Dana Reyes',  15, 9),   -- taller heels día 1
  (4, '2026-09-19', '17:00', '20:00', 'Dana Reyes',  15, 9),   -- taller heels día 2
  (4, '2026-09-20', '17:00', '20:00', 'Dana Reyes',  15, 9),   -- taller heels día 3
  (5, '2026-09-26', '11:00', '15:00', 'Kevo Ramírez',25, 14),  -- bootcamp sábado
  (5, '2026-09-27', '11:00', '15:00', 'Kevo Ramírez',25, 14);  -- bootcamp domingo
