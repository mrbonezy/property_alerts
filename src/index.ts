import { config } from "dotenv";
import { AirbnbScraper } from "./AirbnbScraper";
import { ListingTracker } from "./ListingTracker";
import { TelegramNotifier } from "./TelegramNotifier";

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

    await notifier.notifyNewListings(
      [
        {
          id: "1234567890",
          url: "https://www.airbnb.co.uk/rooms/1234567890",
          currency: "£",
          price: 100,
          rating: 4.5,
          reviewCount: 100,
        },
      ],
      "https://www.airbnb.co.uk/s/Edinburgh/homes"
    );
    return;

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
          // Send initial notification to Telegram if configured
          if (process.env.NOTIFY_ON_FIRST_RUN === "true") {
            await notifier.notifyNewListings(allListings, searchUrl);
            console.log("Sent initial listings notification to Telegram.");
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

          // Send notification for new listings to Telegram
          const success = await notifier.notifyNewListings(
            newListings,
            searchUrl
          );
          if (success) {
            console.log(
              `Telegram notification sent successfully for ${newListings.length} new listings.`
            );
          } else {
            console.error("Failed to send Telegram notification.");
          }
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
