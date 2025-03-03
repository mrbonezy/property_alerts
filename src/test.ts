import { config } from "dotenv";
import { AirbnbScraper } from "./AirbnbScraper";
import { ListingTracker } from "./ListingTracker";

// Load environment variables from .env file
config();

function validateEnv() {
  const required = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

async function main() {
  try {
    validateEnv();

    // Initialize services
    const scraper = new AirbnbScraper();
    const tracker = new ListingTracker({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const searchUrl =
      "https://www.airbnb.co.uk/s/Edinburgh/homes?checkin=2025-08-12&checkout=2025-08-13&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2025-04-01&monthly_length=3&monthly_end_date=2025-07-01&adults=2&children=2&refinement_paths%5B%5D=%2Fhomes&source=structured_search_input_header&search_type=user_map_move&price_filter_input_type=2&price_filter_num_nights=1&channel=EXPLORE&zoom_level=11.818001817582266&date_picker_type=calendar&place_id=ChIJIyaYpQC4h0gRJxfnfHsU8mQ&acp_id=0f20225f-79f0-421a-8b17-555573e27108&query=Edinburgh&search_mode=regular_search&ne_lat=56.03849367818843&ne_lng=-3.0056582584745684&sw_lat=55.82041114588607&sw_lng=-3.311794878602541&zoom=11.818001817582266&search_by_map=true&price_max=410&selected_filter_order%5B%5D=price_max%3A410&update_selected_filters=false";

    // First get all listings
    const allListings = await scraper.getListings({ url: searchUrl });
    console.log("All listings found:", allListings.length);

    // Then find new ones
    const newListings = await tracker.findNewListings(
      allListings
    );
    console.log("New listings:", newListings.length);

    if (newListings.length > 0) {
      console.log("New listings details:");
      newListings.forEach((listing) => {
        console.log(
          `- ${listing.url} (${listing.currency}${listing.price}) - Rating: ${listing.rating} (${listing.reviewCount} reviews)`
        );
      });
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
