import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import placesRouter from './routes/places';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up CSP headers to allow loading images from external domains
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data: https: http:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; font-src 'self' https:;"
    );
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
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Use places router
app.use('/', placesRouter);

// Image proxy endpoint
app.get('/proxy-image', async (req, res) => {
    try {
        const imageUrl = req.query.url as string;
        if (!imageUrl) {
            return res.status(400).send('Image URL is required');
        }

        const response = await axios.get(imageUrl, {
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
    } catch (error) {
        console.error('Error proxying image:', error);
        res.status(500).send('Error loading image');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 