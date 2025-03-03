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

    await tracker.addOutstandingSearch(
      "https://www.airbnb.co.uk/s/Edinburgh/homes?checkin=2025-08-12&checkout=2025-08-13&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2025-04-01&monthly_length=3&monthly_end_date=2025-07-01&adults=2&children=2&refinement_paths%5B%5D=%2Fhomes&source=structured_search_input_header&search_type=user_map_move&price_filter_input_type=2&price_filter_num_nights=1&channel=EXPLORE&zoom_level=11.818001817582266&date_picker_type=calendar&place_id=ChIJIyaYpQC4h0gRJxfnfHsU8mQ&acp_id=0f20225f-79f0-421a-8b17-555573e27108&query=Edinburgh&search_mode=regular_search&ne_lat=56.03849367818843&ne_lng=-3.0056582584745684&sw_lat=55.82041114588607&sw_lng=-3.311794878602541&zoom=11.818001817582266&search_by_map=true&price_max=410&selected_filter_order%5B%5D=price_max%3A410&update_selected_filters=false"
    );

    await tracker.addOutstandingSearch(
      "https://www.airbnb.co.uk/s/Loch-Lomond-and-The-Trossachs-National-Park--Stirling/homes?refinement_paths%5B%5D=%2Fhomes&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2025-04-01&monthly_length=3&monthly_end_date=2025-07-01&price_filter_input_type=2&channel=EXPLORE&place_id=ChIJIbhVPrH9iEgRcEX1r1GkSLQ&acp_id=b1a6d82c-47ad-4e45-beb5-ad4ae60f9cf7&date_picker_type=calendar&checkin=2025-08-13&checkout=2025-08-16&adults=2&children=2&source=structured_search_input_header&search_type=user_map_move&query=Loch%20Lomond%20and%20The%20Trossachs%20National%20Park%2C%20Stirling&search_mode=regular_search&price_filter_num_nights=3&ne_lat=56.11789784169697&ne_lng=-4.477861443339123&sw_lat=55.9724108680766&sw_lng=-4.682702651508123&zoom=12.397671474909203&zoom_level=12.397671474909203&search_by_map=true"
    );

    const outstandingSearches = await tracker.getOutstandingSearches();

    for (const searchUrl of outstandingSearches) {
      console.log("Running search:", searchUrl);
      // First get all listings
      const allListings = await scraper.getListings({ url: searchUrl });
      console.log("All listings found:", allListings.length);

      // Then find new ones
      const { listings: newListings, isFirstSearch } =
        await tracker.findNewListings(searchUrl, allListings);

      if (isFirstSearch) {
        console.log("First time running this search - establishing baseline.");
        if (allListings.length === 0) {
          console.log(
            "No listings found in first search, but we'll track future additions."
          );
        } else {
          console.log(
            `Found ${allListings.length} initial listings. Future runs will show new listings only.`
          );
        }
      } else {
        console.log(
          `Found ${newListings.length} new listings since last check.`
        );

        if (newListings.length > 0) {
          console.log("New listings details:");
          newListings.forEach((listing) => {
            console.log(
              `- ${listing.url} (${listing.currency}${listing.price}) - Rating: ${listing.rating} (${listing.reviewCount} reviews)`
            );
          });
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
