// payments.controller.js
// -----------------------------------------------------------------------
// Dos responsabilidades, cada una con su propia función exportada:
//
// 1) createPreference  -> el frontend la llama cuando el usuario da "Pagar".
//    Construye una "preferencia" de Mercado Pago (la lista de items +
//    urls de retorno) y regresa el `init_point` al que el navegador
//    debe redirigir para mostrar el Checkout Pro de MP.
//
// 2) handleWebhook     -> Mercado Pago la llama a ELLA (no el usuario),
//    cuando el estado de un pago cambia. Aquí es donde de verdad
//    confirmamos el pedido — nunca confiamos en que "el usuario volvió
//    a la página de éxito" como prueba de pago, porque esa URL se puede
//    visitar sin haber pagado.
// -----------------------------------------------------------------------

const pool = require("../config/db");
const { preferenceClient, paymentClient } = require("../config/mercadopago");

/**
 * POST /api/payments/create-preference
 * body esperado: { orderId: number }
 *
 * Se asume que el pedido (orders + order_items) ya se creó ANTES de esta
 * llamada -- ver cart.controller / orders.controller (fuera del alcance
 * de este entregable, pero el flujo es: carrito -> POST /orders -> esto).
 * Aquí solo leemos ese pedido de la base de datos: el precio que se
 * cobra SIEMPRE sale de la BD, nunca del body que manda el cliente.
 */
async function createPreference(req, res) {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "orderId es requerido" });
  }

  try {
    // 1. Traer el pedido y sus líneas desde la base de datos (fuente de verdad de precios).
    const orderResult = await pool.query(
      `SELECT o.id, o.user_id, o.total_amount, o.currency, u.email, u.full_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.id = $1 AND o.status = 'pending'`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado o ya procesado" });
    }
    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT oi.quantity, oi.unit_price, p.name
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    // 2. Traducir cada línea del pedido al formato que pide Mercado Pago.
    const mpItems = itemsResult.rows.map((item) => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      currency_id: order.currency, // 'MXN'
    }));

    // 3. Crear la preferencia. `external_reference` es la clave para
    //    volver a encontrar ESTE pedido cuando llegue el webhook.
    const preference = await preferenceClient.create({
      body: {
        items: mpItems,
        payer: { email: order.email, name: order.full_name },
        external_reference: String(order.id),
        back_urls: {
          success: `${process.env.FRONTEND_URL}/checkout-success.html?order=${order.id}`,
          failure: `${process.env.FRONTEND_URL}/checkout-failure.html?order=${order.id}`,
          pending: `${process.env.FRONTEND_URL}/checkout-pending.html?order=${order.id}`,
        },
        auto_return: "approved",
        notification_url: `${process.env.BACKEND_PUBLIC_URL}/api/payments/webhook`,
      },
    });

    // 4. Guardar el id de la preferencia en el pedido, para trazabilidad.
    await pool.query(`UPDATE orders SET mp_preference_id = $1, updated_at = now() WHERE id = $2`, [
      preference.id,
      order.id,
    ]);

    // 5. El frontend solo necesita el init_point para redirigir al Checkout Pro.
    return res.status(201).json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point, // usar este en pruebas
    });
  } catch (err) {
    console.error("[payments] Error creando preferencia:", err);
    return res.status(500).json({ error: "No se pudo crear la preferencia de pago" });
  }
}

/**
 * POST /api/payments/webhook
 * Mercado Pago manda algo como: { type: "payment", data: { id: "123456789" } }
 *
 * IMPORTANTE (para la oral): respondemos 200 rápido y de inmediato,
 * ANTES de terminar toda la lógica si hiciera falta, porque MP reintenta
 * el webhook si no recibe 200 a tiempo. Aquí el trabajo es rápido
 * (una consulta a MP + un par de UPDATE) así que no hace falta encolarlo.
 */
async function handleWebhook(req, res) {
  try {
    const { type, data } = req.body;

    // MP también manda notificaciones de tipo distinto a "payment" (p.ej. "merchant_order").
    // Solo nos importa "payment" para esta demo.
    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200);
    }

    // 1. Volver a preguntarle a Mercado Pago el estado real del pago.
    //    NUNCA confiamos en datos que vengan directo en el body del webhook
    //    para decidir "aprobado" -- se puede falsificar. Se re-consulta con
    //    nuestro access token, que es la fuente confiable.
    const payment = await paymentClient.get({ id: data.id });

    const orderId = Number(payment.external_reference);
    if (!orderId) {
      console.warn("[webhook] Pago sin external_reference válido:", payment.id);
      return res.sendStatus(200);
    }

    // 2. Mapear el estado de MP a nuestro enum interno de orders.status.
    const statusMap = {
      approved: "paid",
      rejected: "failed",
      cancelled: "cancelled",
      in_process: "pending",
      pending: "pending",
    };
    const newStatus = statusMap[payment.status] || "pending";

    // 3. Actualizar el pedido y dejar el log crudo en payment_transactions.
    //    Estas dos escrituras deberían ir en una transacción SQL real
    //    (BEGIN/COMMIT) en producción; se muestran separadas aquí por claridad.
    await pool.query(
      `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2`,
      [newStatus, orderId]
    );

    await pool.query(
      `INSERT INTO payment_transactions (order_id, mp_payment_id, status, status_detail, amount, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, String(payment.id), payment.status, payment.status_detail, payment.transaction_amount, payment]
    );

    // 4. Si se aprobó y el pedido incluye clases/talleres, confirmar las reservas.
    if (newStatus === "paid") {
      await confirmBookingsForOrder(orderId);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("[webhook] Error procesando notificación de Mercado Pago:", err);
    // Aun en error, respondemos 200 para no entrar en un ciclo de reintentos
    // infinito por un bug nuestro; el error queda logueado para revisión manual.
    return res.sendStatus(200);
  }
}

/**
 * Marca como 'confirmed' las bookings ligadas a las líneas del pedido
 * que correspondan a productos con requires_booking = true.
 * (Simplificado para el entregable: asume que las bookings ya se
 * pre-crearon en estado 'pending' al momento del checkout.)
 */
async function confirmBookingsForOrder(orderId) {
  await pool.query(
    `UPDATE bookings b
     SET status = 'confirmed'
     FROM order_items oi
     WHERE b.order_item_id = oi.id
       AND oi.order_id = $1
       AND b.status != 'cancelled'`,
    [orderId]
  );
}

module.exports = { createPreference, handleWebhook };
