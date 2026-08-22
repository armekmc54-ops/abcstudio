import pool from '../config/db.js';

// GET /api/products — Catálogo de productos
export const getAllProducts = async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.name, p.type, p.price, c.name AS category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id ASC;
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[Products Controller Error]:', error);
    res.status(500).json({ error: 'Error al consultar el catálogo', details: error.message });
  }
};

// GET /api/products/:id — Detalle de un producto individual
export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT p.id, p.name, p.type, p.price, c.name AS category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1;
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('[Products Controller Error]:', error);
    res.status(500).json({ error: 'Error al consultar el producto', details: error.message });
  }
};
