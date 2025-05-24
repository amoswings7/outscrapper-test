import express from 'express';
import { searchPlaces, searchStatus, getResults } from '../controllers/placesController';

const router = express.Router();

router.post('/search', searchPlaces);
router.get('/search/status/:searchId', searchStatus);
router.get('/results/:searchId', getResults);

export default router; 