import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.post('/refill-declare', authenticate, InventoryController.declareRefill);
router.get('/alerts', authenticate, InventoryController.getAlerts);
router.get('/home-supplies', authenticate, InventoryController.listHomeSupplies);
router.post('/home-supplies', authenticate, InventoryController.addHomeSupply);
router.get('/home-supplies/barcode/:barcode', authenticate, InventoryController.lookupBarcode);

export const inventoryRoutes = router;
