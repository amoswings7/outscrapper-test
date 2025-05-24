declare module 'outscraper' {

    interface Review {
        review_id: string;
        review_pagination_id: string;
        author_link: string;
        author_title: string;
        author_id: string;
        author_image: string;
        author_reviews_count: number;
        author_ratings_count: number;
        review_text: string;
        review_img_url: string | null;
        review_img_urls: string[] | null;
        review_questions?: Record<string, any>; // Replace with more specific type if needed
        review_photo_ids: string[] | null;
        owner_answer: string;
        owner_answer_timestamp: number;
        owner_answer_timestamp_datetime_utc: string;
        review_link: string;
        review_rating: number;
        review_timestamp: number;
        review_datetime_utc: string;
        review_likes: number | null;
    }

    interface ReviewsPerScore {
        [key: string]: number;
    }

    export interface AboutSection {
        Other?: Record<string, any>;
        Amenities?: Record<string, any>;
        [key: string]: any;
    }

    interface GoogleReviewPlace {
        query: string;
        name: string;
        name_for_emails: string;
        place_id: string;
        google_id: string;
        kgmid: string;
        full_address: string;
        borough: string;
        street: string;
        postal_code: string;
        area_service: boolean;
        country_code: string;
        country: string;
        city: string;
        us_state: string | null;
        state: string | null;
        plus_code: string;
        latitude: number;
        longitude: number;
        h3: string;
        time_zone: string;
        popular_times: any | null;
        site: string;
        phone: string;
        type: string;
        logo: string;
        description: string;
        typical_time_spent: string | null;
        located_in: string | null;
        located_google_id: string | null;
        category: string;
        subtypes: string;
        posts: any | null;
        reviews_tags: string[];
        rating: number;
        reviews: number;
        reviews_data: Review[];
        photos_count: number;
        cid: string;
        reviews_link: string;
        reviews_id: string;
        photo: string;
        street_view: string;
        working_hours: any | null;
        working_hours_csv_compatible: any | null;
        working_hours_old_format: any | null;
        other_hours: any | null;
        business_status: string;
        about: AboutSection;
        range: string;
        prices: any[]; // Replace with detailed type if needed
        reviews_per_score: ReviewsPerScore;
        reservation_links: any | null;
        booking_appointment_link: any | null;
        menu_link: any | null;
        order_links: any | null;
        owner_id: string;
        verified: boolean;
        owner_title: string;
        owner_link: string;
        location_link: string;
        location_reviews_link: string;
    }


    interface OutscraperResponse {
        status: 'Pending' | 'Success' | 'Error';
        id?: string;
        results_location?: string;
        data?: Array<Array<{
            name: string;
            place_id: string;
            full_address: string;
            rating: number;
            reviews: number;
            photo?: string;
            phone?: string;
            site?: string;
            working_hours?: Record<string, string>;
            location_link: string;
            google_id?: string;
        }>>;
    }

    export default class Outscraper {
        constructor(apiKey: string);
        googleMapsSearch(
            queries: string[],
            limit?: number,
            language?: string,
            region?: string
        ): Promise<OutscraperResponse>;
        googleMapsReviews(
            queries: string[],
            reviewsLimit?: number,
            limit?: number,
        ): Promise<Array<GoogleReviewPlace>>;
        getRequestArchive(requestId: string): Promise<OutscraperResponse>;
    }
} 