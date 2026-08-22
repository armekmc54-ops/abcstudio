// payments.routes.js
// -----------------------------------------------------------------------
// Capa de rutas: solo mapea método+path -> controlador. Sin lógica de
// negocio aquí a propósito, para que en la oral puedas señalar
// "esta línea define el endpoint, la lógica vive en el controller".
// -----------------------------------------------------------------------
const express = require("express");
const router = express.Router();
const { createPreference, handleWebhook } = require("../controllers/payments.controller");

// El frontend llama esto cuando el usuario da clic en "Pagar".
router.post("/create-preference", createPreference);

// Mercado Pago llama esto solo, cuando el estado de un pago cambia.
router.post("/webhook", handleWebhook);

module.exports = router;
