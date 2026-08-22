import { Router } from 'express';
import { 
  getAllProducts, 
  getProductById, 
  updateVariantStock, 
  updateSessionSeats 
} from '../controllers/products.controller.js';

const router = Router();

// Rutas públicas del catálogo
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Rutas de administración para inventario y cupos
router.patch('/variants/:id/stock', updateVariantStock);
router.patch('/sessions/:id/seats', updateSessionSeats);

export default router;
