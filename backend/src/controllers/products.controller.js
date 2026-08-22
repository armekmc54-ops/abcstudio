import pool from '../config/db.js';

// GET /api/products — Retorna todos los productos con categorías, variantes y sesiones
export const getAllProducts = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.slug, 
        p.description, 
        p.type, 
        p.price, 
        p.image_url, 
        c.name AS category_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', v.id, 
              'size', v.size, 
              'stock', v.stock_quantity
            )
          ) FILTER (WHERE v.id IS NOT NULL), '[]'
        ) AS variants,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id, 
              'date', s.session_date, 
              'time', s.start_time, 
              'instructor', s.instructor_name,
              'capacity_left', (s.capacity - s.booked_seats)
            )
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS sessions
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON p.id = v.product_id
      LEFT JOIN class_sessions s ON p.id = s.product_id
      GROUP BY p.id, c.name
      ORDER BY p.id ASC;
    `;

    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[Products Controller Error]:', error);
    res.status(500).json({ error: 'Error al consultar el catálogo de productos' });
  }
};

// GET /api/products/:id — Retorna un producto específico por ID
export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.slug, 
        p.description, 
        p.type, 
        p.price, 
        p.image_url, 
        c.name AS category_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', v.id, 
              'size', v.size, 
              'stock', v.stock_quantity
            )
          ) FILTER (WHERE v.id IS NOT NULL), '[]'
        ) AS variants,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id, 
              'date', s.session_date, 
              'time', s.start_time, 
              'instructor', s.instructor_name,
              'capacity_left', (s.capacity - s.booked_seats)
            )
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS sessions
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON p.id = v.product_id
      LEFT JOIN class_sessions s ON p.id = s.product_id
      WHERE p.id = $1
      GROUP BY p.id, c.name;
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('[Products Controller Error]:', error);
    res.status(500).json({ error: 'Error al consultar el producto' });
  }
};

// PATCH /api/admin/variants/:id/stock — Actualizar stock de mercancía
export const updateVariantStock = async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  try {
    const result = await pool.query(
      'UPDATE product_variants SET stock_quantity = $1 WHERE id = $2 RETURNING *',
      [stock, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variante no encontrada' });
    }

    res.status(200).json({ message: 'Stock actualizado con éxito', variant: result.rows[0] });
  } catch (error) {
    console.error('[Variant Stock Error]:', error);
    res.status(500).json({ error: 'Error al actualizar el stock' });
  }
};

// PATCH /api/admin/sessions/:id/seats — Actualizar cupos reservados de clase
export const updateSessionSeats = async (req, res) => {
  const { id } = req.params;
  const { booked_seats } = req.body;

  try {
    const result = await pool.query(
      'UPDATE class_sessions SET booked_seats = $1 WHERE id = $2 RETURNING *',
      [booked_seats, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    res.status(200).json({ message: 'Cupos actualizados con éxito', session: result.rows[0] });
  } catch (error) {
    console.error('[Session Seats Error]:', error);
    res.status(500).json({ error: 'Error al actualizar los cupos' });
  }
};
