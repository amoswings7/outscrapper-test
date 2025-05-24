"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const places_1 = __importDefault(require("./routes/places"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Set up CSP headers to allow loading images from external domains
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https: http:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; font-src 'self' https:;");
    next();
});
// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    if (req.method === 'POST' && req.body) {
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});
// View engine setup
app.set('view engine', 'ejs');
app.set('views', path_1.default.join(__dirname, 'views'));
// Static files
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Routes
app.get('/', (req, res) => {
    res.render('index');
});
// Use places router
app.use('/', places_1.default);
// Image proxy endpoint
app.get('/proxy-image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) {
            return res.status(400).send('Image URL is required');
        }
        const response = yield axios_1.default.get(imageUrl, {
            responseType: 'stream',
            headers: {
                'Referer': 'https://www.google.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        // Forward the content type
        res.setHeader('Content-Type', response.headers['content-type']);
        // Cache the image for 1 hour
        res.setHeader('Cache-Control', 'public, max-age=3600');
        // Pipe the image data to the response
        response.data.pipe(res);
    }
    catch (error) {
        console.error('Error proxying image:', error);
        res.status(500).send('Error loading image');
    }
}));
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
