import { config } from "dotenv";
import { AirbnbScraper } from "./AirbnbScraper";
import { ListingTracker } from "./ListingTracker";
import { TelegramNotifier } from "./TelegramNotifier";
import { AirbnbListing } from "./types";
import { dummyNotification } from "./dummy-notification";

// Load environment variables from .env file
config();

function validateEnv() {
  const required = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "TGBOT_API",
    "TGCHAT_ID",
  ];

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

    console.log("Starting...");

    // Initialize services
    const scraper = new AirbnbScraper();
    const tracker = new ListingTracker({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const notifier = new TelegramNotifier({
      botToken: process.env.TGBOT_API!,
      chatId: process.env.TGCHAT_ID!,
    });

    // For testing purposes - remove in production
    if (process.env.TEST_NOTIFICATION === "true") {
      await notifier.notifyNewListings(dummyNotification);
      return;
    }

    const outstandingSearches = await tracker.getOutstandingSearches();

    // Map to collect all new listings by search URL
    const allNewListings = new Map<string, AirbnbListing[]>();

    // Process each search
    for (const [i, searchUrl] of outstandingSearches.entries()) {
      console.log("Running search:", searchUrl);
      try {
        // First get all listings
        const allListings = await scraper.getListings({ url: searchUrl });
        console.log("All listings found:", allListings.length);

        // Then find new ones
        const { listings: newListings, isFirstSearch } =
          await tracker.updateNewListings(searchUrl, allListings);

        if (isFirstSearch) {
          console.log(
            "First time running this search - establishing baseline."
          );
          if (allListings.length === 0) {
            console.log(
              "No listings found in first search, but we'll track future additions."
            );
          } else {
            console.log(
              `Found ${allListings.length} initial listings. Future runs will show new listings only.`
            );
            // Send initial notification to Telegram if configured
            if (process.env.NOTIFY_ON_FIRST_RUN === "true") {
              // Store listings for aggregated notification
              allNewListings.set(searchUrl, allListings);
              console.log(
                "Added initial listings for aggregated notification."
              );
            } else {
              console.log(
                "Skipping initial notification (NOTIFY_ON_FIRST_RUN not set to 'true')"
              );
            }
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

            // Store new listings for aggregated notification
            allNewListings.set(searchUrl, newListings);
          }
        }
      } catch (error) {
        console.error(`Error processing search URL: ${searchUrl}`, error);
        // Set last fetched timestamp to 0 for failed URLs
        await tracker.markFailure(searchUrl);
        console.log(`Marked ${searchUrl} with timestamp 0 due to failure`);
      }
    }

    // Send aggregated notification if there are any new listings
    if (allNewListings.size > 0) {
      // TODO refac
      const success = await notifier.notifyNewListings(
        Array.from(allNewListings.entries()).map(([searchUrl, listings]) => ({
          searchUrl,
          listings,
        }))
      );
      if (success) {
        console.log(
          `Aggregated Telegram notification sent successfully for ${allNewListings.size} searches.`
        );
      } else {
        console.error("Failed to send aggregated Telegram notification.");
      }
    } else {
      console.log("No new listings found across all searches.");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

void (async () => {
  await main();
})();
