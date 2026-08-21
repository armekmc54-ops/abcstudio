// server.js
// -----------------------------------------------------------------------
// Punto de entrada. Levanta Express, monta middlewares globales y las
// rutas de la API. Las rutas de catálogo/carrito/usuarios/admin se
// montan igual que payments.routes.js -- se omiten aquí porque el
// entregable solicitado es específicamente la integración de pagos,
// pero la carpeta routes/ ya está lista para crecer con ese mismo patrón.
// -----------------------------------------------------------------------
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const paymentsRoutes = require("./routes/payments.routes");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json()); // parsea application/json (incluye los webhooks de MP)

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/payments", paymentsRoutes);

// Manejador de errores genérico, al final de la cadena de middlewares.
app.use((err, req, res, next) => {
  console.error("[server] Error no manejado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[server] ABC Studio API escuchando en puerto ${PORT}`);
});
