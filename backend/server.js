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

const authRoutes = require("./routes/auth.routes");
const productsRoutes = require("./routes/products.routes");
const paymentsRoutes = require("./routes/payments.routes"); //[cite: 7]

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" })); //[cite: 7]
app.use(express.json()); //[cite: 7]

app.get("/api/health", (req, res) => res.json({ status: "ok" })); //[cite: 7]

// Montar módulos de la API
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/payments", paymentsRoutes); //[cite: 7]

app.use((err, req, res, next) => { //[cite: 7]
  console.error("[server] Error:", err); //[cite: 7]
  res.status(500).json({ error: "Error interno del servidor" }); //[cite: 7]
}); //[cite: 7]

const PORT = process.env.PORT || 4000; //[cite: 7]
app.listen(PORT, () => console.log(`[server] ABC Studio API corriendo en puerto ${PORT}`)); //[cite: 7]
