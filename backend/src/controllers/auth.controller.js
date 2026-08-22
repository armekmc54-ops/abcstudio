const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "abc_studio_super_secret_key_2026";

async function register(req, res) {
  const { full_name, email, password, phone } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: "Nombre, correo y contraseña son obligatorios." });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "El correo ya está registrado." });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, full_name, email, role`,
      [full_name, email.toLowerCase(), password_hash, phone || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({ message: "Usuario registrado con éxito", token, user });
  } catch (err) {
    console.error("[auth] Error en registro:", err);
    return res.status(500).json({ error: "Error interno en el servidor." });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Ingresa correo y contraseña." });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      message: "Inicio de sesión exitoso",
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("[auth] Error en login:", err);
    return res.status(500).json({ error: "Error interno en el servidor." });
  }
}

module.exports = { register, login };
