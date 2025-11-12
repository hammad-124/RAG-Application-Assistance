import express from 'express';
import { 
  addCarProduct, 
  getAllCars, 
  getCarById, 
  updateCar, 
  deleteCar, 
  addSingleCar,
} from '../controllers/carController.js';

const router = express.Router();

// Bulk operations
router.route('/add').post(addCarProduct);

// CRUD operations for testing change stream
router.route('/cars')
  .get(getAllCars)     // GET /api/v1/cars - Get all cars with filtering
  .post(addSingleCar); // POST /api/v1/cars - Add single car

router.route('/cars/:id')
  .get(getCarById)     // GET /api/v1/cars/:id - Get car by ID
  .put(updateCar)      // PUT /api/v1/cars/:id - Update car (triggers change stream)
  .delete(deleteCar);  // DELETE /api/v1/cars/:id - Delete car (triggers change stream)

// Testing route
// router.route('/stats').get(getVectorStats); // GET /api/v1/stats - Get sync statistics

export default router;

