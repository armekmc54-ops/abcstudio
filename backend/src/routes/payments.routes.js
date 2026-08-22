// payments.routes.js
// -----------------------------------------------------------------------
// Capa de rutas: solo mapea método+path -> controlador. Sin lógica de
// negocio aquí a propósito, para que en la oral puedas señalar
// "esta línea define el endpoint, la lógica vive en el controller".
// -----------------------------------------------------------------------
import { Router } from 'express';
// Si tienes payments.controller.js implementado:
import { createPreference, handleWebhook } from '../controllers/payments.controller.js';

const router = Router();

// Rutas de pagos (Mercado Pago)
router.post('/create-preference', createPreference || ((req, res) => res.json({ message: 'Create preference endpoint' })));
router.post('/webhook', handleWebhook || ((req, res) => res.json({ message: 'Webhook endpoint' })));

export default router;
