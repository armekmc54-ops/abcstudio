import { Router } from 'express';
// Si tienes auth.controller.js implementado:
import { loginUser, registerUser } from '../controllers/auth.controller.js';

const router = Router();

// Rutas de autenticación
router.post('/login', loginUser || ((req, res) => res.json({ message: 'Login endpoint' })));
router.post('/register', registerUser || ((req, res) => res.json({ message: 'Register endpoint' })));

export default router;
