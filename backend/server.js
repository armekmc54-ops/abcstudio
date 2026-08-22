// server.js
// -----------------------------------------------------------------------
// Punto de entrada. Levanta Express, monta middlewares globales y las
// rutas de la API. Las rutas de catálogo/carrito/usuarios/admin se
// montan igual que payments.routes.js -- se omiten aquí porque el
// entregable solicitado es específicamente la integración de pagos,
// pero la carpeta routes/ ya está lista para crecer con ese mismo patrón.
// -----------------------------------------------------------------------
// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './src/routes/auth.routes.js';
import productsRoutes from './src/routes/products.routes.js';
import paymentsRoutes from './src/routes/payments.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/payments', paymentsRoutes);

app.listen(PORT, () => {
  console.log(`[ABC Studio Backend] Servidor corriendo en http://localhost:${PORT}`);
});
