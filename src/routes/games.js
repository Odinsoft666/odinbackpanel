import express from 'express';
import { protect, authorize } from '../middleware/routeProtection.js';
import { 
  getGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  getGamesByCategory
} from '../controllers/gameController.js';

const router = express.Router();

router.get('/', protect, getGames);
router.get('/:id', protect, getGameById);
router.get('/category/:category', protect, getGamesByCategory);

router.use(authorize(['admin', 'game_manager']));

router.post('/', createGame);
router.put('/:id', updateGame);
router.delete('/:id', deleteGame);

export default router;