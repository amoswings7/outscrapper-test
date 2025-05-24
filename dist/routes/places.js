"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const placesController_1 = require("../controllers/placesController");
const router = express_1.default.Router();
router.post('/search', placesController_1.searchPlaces);
router.get('/search/status/:searchId', placesController_1.searchStatus);
router.get('/results/:searchId', placesController_1.getResults);
exports.default = router;
