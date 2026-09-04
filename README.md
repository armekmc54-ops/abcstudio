# ABC Studio — E-Commerce (Entregable Técnico)

Plataforma web de comercio electrónico y reservación de clases para la academia de danza **ABC Studio** (San Luis Potosí, México). Permite a los usuarios explorar el catálogo de clases presenciales, talleres intensivos, cursos digitales y mercancía oficial, gestionar un carrito de compras reactivo y procesar pagos directos en moneda nacional (MXN) con emisión automática de recibos digitales.

---

## 🚀 Tecnologías Utilizadas

* **Frontend:** HTML5 semántico, CSS3 personalizado y Tailwind CSS (CDN).
* **Lógica de Cliente:** JavaScript nativo (Vanilla JS) con persistencia de estado mediante `localStorage`.
* **Pasarela de Pagos:** PayPal JavaScript SDK oficial (integración con tarjeta de débito/crédito y saldo PayPal en MXN).
* **Servicio de Mensajería:** EmailJS para el despacho automático de comprobantes de compra oficiales por correo electrónico.
* **Despliegue & Hosting:** GitHub Pages.

---

## 📂 Estructura del Proyecto

```text
abcstudio/
├── index.html          # Landing page principal, accesos rápidos, productos destacados y checkout
├── catalog.html        # Catálogo interactivo con filtrado por categoría y carrito completo
└── README.md           # Documentación técnica del proyecto
