import { Request, Response } from 'express';
import Outscraper from 'outscraper';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OUTSCRAPER_API_KEY) {
    throw new Error('OUTSCRAPER_API_KEY is not defined in environment variables');
}

const client = new Outscraper(process.env.OUTSCRAPER_API_KEY);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Store active searches and results
interface SearchResult {
    status: 'pending' | 'processing' | 'complete' | 'error';
    message?: string;
    progress?: any;
    results?: any[];
    query?: string;
    error?: string;
    timestamp: number;
}

const searchCache = new Map<string, SearchResult>();

// Clean up old results every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [id, result] of searchCache.entries()) {
        if (now - result.timestamp > 10 * 60 * 1000) { // 10 minutes
            searchCache.delete(id);
        }
    }
}, 60 * 1000); // Check every minute

export const searchPlaces = async (req: Request, res: Response) => {
    try {
        const { category, city, state, country, limit = 10, reviewsLimit } = req.body;

        console.log('📥 Search request received:', {
            category,
            city,
            state,
            country,
            limit,
            reviewsLimit,
            timestamp: new Date().toISOString()
        });

        // Generate a unique search ID
        const searchId = Date.now().toString();

        // Store search parameters
        searchCache.set(searchId, {
            status: 'pending',
            timestamp: Date.now()
        });

        // Start the search process
        processSearch(searchId, { category, city, state, country, limit, reviewsLimit });

        // Return the search ID to the client
        res.json({ searchId });
    } catch (error: any) {
        console.error('❌ Error in searchPlaces:', {
            name: error?.name,
            message: error?.message,
            stack: error?.stack
        });
        res.status(500).json({ error: 'An error occurred while starting the search' });
    }
};

export const searchStatus = async (req: Request, res: Response) => {
    const { searchId } = req.params;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendUpdate = (message: string, data?: any) => {
        res.write(`data: ${JSON.stringify({ message, data })}\n\n`);
    };

    // Send initial status
    const search = searchCache.get(searchId);
    if (!search) {
        sendUpdate('Search not found', { status: 'error' });
        res.end();
        return;
    }

    // Set up interval to check search status
    const interval = setInterval(() => {
        const currentSearch = searchCache.get(searchId);
        if (!currentSearch) {
            clearInterval(interval);
            sendUpdate('Search not found', { status: 'error' });
            res.end();
            return;
        }

        if (currentSearch.status === 'complete') {
            clearInterval(interval);
            sendUpdate('Search complete', {
                status: 'complete',
                results: currentSearch.results,
                query: currentSearch.query
            });
            res.end();
        } else if (currentSearch.status === 'error') {
            clearInterval(interval);
            sendUpdate('Search failed', {
                status: 'error',
                message: currentSearch.error
            });
            res.end();
        } else {
            sendUpdate(currentSearch.message || 'Processing...', {
                status: currentSearch.status,
                data: currentSearch.progress
            });
        }
    }, 1000);

    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(interval);
    });
};

export const getResults = async (req: Request, res: Response) => {
    const { searchId } = req.params;
    const search = searchCache.get(searchId);

    if (!search) {
        return res.status(404).render('error', {
            message: 'Search results not found or expired'
        });
    }

    if (search.status === 'error') {
        return res.status(400).render('error', {
            message: search.error || 'An error occurred during the search'
        });
    }

    if (search.status !== 'complete') {
        return res.status(400).render('error', {
            message: 'Search is still in progress'
        });
    }

    res.render('results', {
        places: search.results,
        query: search.query
    });
};

async function processSearch(searchId: string, params: any) {
    const search = searchCache.get(searchId);
    if (!search) {
        console.error('❌ Search not found in cache:', searchId);
        return;
    }

    try {
        console.log('🔍 Starting search process:', {
            searchId,
            params,
            timestamp: new Date().toISOString()
        });

        // Update status
        search.status = 'processing';
        search.message = 'Starting search...';
        search.progress = { ...params };

        // Construct the search query
        let query = params.category;
        if (params.city) query += `, ${params.city}`;
        if (params.state) query += `, ${params.state}`;
        if (params.country) query += `, ${params.country}`;
        search.query = query;
        search.message = 'Query constructed';

        console.log('📝 Constructed search query:', {
            query,
            category: params.category,
            city: params.city,
            state: params.state,
            country: params.country
        });

        // Make the API call for places
        search.message = 'Making API request to Outscraper for places...';
        console.log('�� Making API request for places...');

        const initialResponse = await client.googleMapsSearch(
            [query],
            parseInt(params.limit as string)
        );

        console.log('📡 Received initial API response:', {
            requestId: initialResponse?.id,
            status: initialResponse?.status,
            timestamp: new Date().toISOString()
        });

        if (!initialResponse?.id) {
            console.error('❌ No request ID received from Outscraper');
            throw new Error('No request ID received from Outscraper');
        }

        // Poll for place results
        let attempts = 5;
        let result = null;

        while (attempts > 0) {
            search.message = 'Waiting for place results...';
            search.progress = {
                attemptsRemaining: attempts,
                estimatedTime: attempts * 60,
                stage: 'places'
            };

            console.log('⏳ Polling for place results:', {
                attempt: 6 - attempts,
                attemptsRemaining: attempts,
                requestId: initialResponse.id
            });

            await sleep(60000); // Wait 60 seconds between attempts

            result = await client.getRequestArchive(initialResponse.id);
            search.message = 'Checking place results status...';
            search.progress = {
                status: result?.status,
                attemptsRemaining: attempts - 1,
                stage: 'places'
            };

            console.log('📊 Place results status:', {
                status: result?.status,
                dataLength: result?.data?.[0]?.length,
                timestamp: new Date().toISOString()
            });

            if (result?.status === 'Success') {
                console.log('✅ Place results ready!');
                search.message = 'Place results ready!';
                break;
            }

            attempts--;
        }

        if (!result || result.status !== 'Success') {
            console.error('❌ Request timed out or failed:', {
                status: result?.status,
                attempts: 5 - attempts
            });
            search.status = 'error';
            search.error = 'Request timed out or failed to complete';
            return;
        }

        // Check if we have valid data
        if (!result?.data?.[0]) {
            console.error('❌ No results found:', {
                query,
                status: result?.status
            });
            search.status = 'error';
            search.error = 'No results found for your search';
            return;
        }

        // Store place results
        const places = result.data[0];
        search.results = places;

        console.log('📦 Places data received:', {
            count: places.length,
            firstPlace: places[0]?.name,
            timestamp: new Date().toISOString()
        });

        // If reviews limit is specified, fetch reviews
        if (params.reviewsLimit) {
            search.message = 'Found places! Now fetching reviews...';
            console.log('🔄 Starting reviews fetch process');

            // Get unique Google IDs from places
            const googleIds = places
                .filter(place => place.google_id)
                .map(place => place.google_id)
                .filter((id): id is string => id !== undefined);

            console.log('🔑 Collected Google IDs:', {
                totalPlaces: places.length,
                placesWithGoogleId: googleIds.length
            });

            if (googleIds.length > 0) {
                search.message = `Fetching up to ${params.reviewsLimit} reviews for ${googleIds.length} places...`;
                console.log('🌐 Making API request for reviews:', {
                    placesCount: googleIds.length,
                    reviewsLimit: params.reviewsLimit
                });

                search.message = 'Waiting for review results...';
                search.progress = {
                    attemptsRemaining: attempts,
                    estimatedTime: attempts * 60,
                    stage: 'reviews'
                };
                // Make the API call for reviews
                const reviewsResponse = await client.googleMapsReviews(
                    googleIds,
                    parseInt(params.reviewsLimit as string)
                );
                // const TestreviewsResponse = await client.googleMapsReviews(
                //     ["Restaurants, Cape Town, Western Cape, South Africa"],
                //     5, 2
                // );

                // console.log("TestreviewsResponse", TestreviewsResponse)

                // console.log("reviewsResponse", reviewsResponse.map(review => review.reviews_data))

                if (reviewsResponse) {
                    console.log("Number of reviews", reviewsResponse.length)
                    search.results = places.map(place => ({
                        ...place,
                        reviews_data: reviewsResponse.find(review => review.google_id === place.google_id)?.reviews_data || []
                    }));
                    search.message = 'Successfully fetched places and reviews!';
                    console.log('✅ Successfully merged places and reviews data');
                } else {
                    console.warn('⚠️ Could not fetch reviews:');
                }
            } else {
                console.warn('⚠️ No Google IDs found for places');
                search.message = 'Warning: No Google IDs found for places. Cannot fetch reviews.';
            }
        }

        // Mark as complete
        search.status = 'complete';
        search.message = 'Search complete';
        console.log('✅ Search process completed successfully:', {
            searchId,
            placesCount: search.results.length,
            hasReviews: params.reviewsLimit ? 'Yes' : 'No',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error in processSearch:', {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
            searchId,
            timestamp: new Date().toISOString()
        });
        search.status = 'error';
        search.error = error?.message || 'An error occurred while searching for places';
    }
} 