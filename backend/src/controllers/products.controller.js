const pool = require("../config/db");

async function getAllProducts(req, res) {
  try {
    const { category, type } = req.query;
    let query = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug,
        COALESCE(
          (SELECT json_agg(json_build_object('id', pv.id, 'size', pv.size, 'stock', pv.stock))
           FROM product_variants pv WHERE pv.product_id = p.id), '[]'
        ) AS variants,
        COALESCE(
          (SELECT json_agg(json_build_object('id', cs.id, 'date', cs.session_date, 'time', cs.start_time, 'capacity_left', (cs.capacity_total - cs.capacity_booked)))
           FROM class_sessions cs WHERE cs.product_id = p.id), '[]'
        ) AS sessions
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = true
    `;
    const params = [];

    if (type && type !== "all") {
      params.push(type);
      query += ` AND p.type = $${params.length}`;
    }

    query += ` ORDER BY p.id ASC`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error("[products] Error obteniendo catálogo:", err);
    return res.status(500).json({ error: "Error al consultar productos." });
  }
}

module.exports = { getAllProducts };
