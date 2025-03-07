import { AirbnbListing } from "./types";

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export class TelegramNotifier {
  private botToken: string;
  private chatId: string;
  private apiUrl: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Sends a message to the Telegram chat
   * @param message The message to send
   * @returns Promise that resolves when the message is sent
   */
  async sendMessage(message: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        console.error("Failed to send Telegram message:", data);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error sending Telegram message:", error);
      return false;
    }
  }

  /**
   * Extracts and formats information from a search URL
   * @param searchUrl The search URL to parse
   * @returns Formatted information about the search
   */
  private parseSearchUrl(searchUrl: string): {
    location: string;
    dates: string;
    guests: string;
    priceRange: string;
  } {
    try {
      const urlObj = new URL(searchUrl);
      const params = new URLSearchParams(urlObj.search);

      // Extract location name from URL path
      const locationMatch = urlObj.pathname.match(/\/s\/([^/]+)/);
      const location = locationMatch
        ? decodeURIComponent(locationMatch[1].replace(/-/g, " "))
        : "Unknown location";

      // Parse dates
      const checkin = params.get("checkin") || "";
      const checkout = params.get("checkout") || "";
      const dates =
        checkin && checkout
          ? `${checkin} to ${checkout}`
          : "No dates specified";

      // Parse guests
      const adults = params.get("adults") || "0";
      const children = params.get("children") || "0";
      const guests = `${adults} ${adults === "1" ? "adult" : "adults"}${
        parseInt(children) > 0
          ? `, ${children} ${children === "1" ? "child" : "children"}`
          : ""
      }`;

      // Parse price range
      const priceMin = params.get("price_min") || "";
      const priceMax = params.get("price_max") || "";
      let priceRange = "Any price";

      if (priceMin && priceMax) {
        priceRange = `$${priceMin} - $${priceMax}`;
      } else if (priceMin) {
        priceRange = `From ${priceMin}`;
      } else if (priceMax) {
        priceRange = `Up to ${priceMax}`;
      }

      return { location, dates, guests, priceRange };
    } catch (error) {
      console.error("Error parsing search URL:", error);
      return {
        location: "Unknown location",
        dates: "Unknown dates",
        guests: "Unknown guests",
        priceRange: "Unknown price range",
      };
    }
  }

  async notifyNewListings(
    alerts: { searchUrl: string; listings: AirbnbListing[] }[]
  ): Promise<boolean> {
    if (alerts.length === 0) {
      return true;
    }

    try {
      // Send a separate message for each search URL
      for (const alert of alerts) {
        const searchInfo = this.parseSearchUrl(alert.searchUrl);

        // Create message with detailed header
        let message = `🏠 <b>${alert.listings.length} New ${
          alert.listings.length === 1 ? "Listing" : "Listings"
        } Found in ${searchInfo.location}</b>\n\n`;

        message += `<b>Search Details:</b>\n`;
        message += `📅 Dates: ${searchInfo.dates}\n`;
        message += `👥 Guests: ${searchInfo.guests}\n`;
        message += `💰 Price Range: ${searchInfo.priceRange}\n`;
        message += `🔍 <a href="${alert.searchUrl}">View all results</a>\n\n`;

        // Add each listing to the message
        alert.listings.forEach((listing, index) => {
          message += `<b>${index + 1}. Property Listing</b>\n`;
          message += `💰 ${listing.currency}${listing.price}`;

          if (listing.rating > 0) {
            message += ` - ⭐${listing.rating.toFixed(1)} (${
              listing.reviewCount
            } ${listing.reviewCount === 1 ? "review" : "reviews"})`;
          } else {
            message += ` - No ratings yet`;
          }

          message += `\n${listing.url}\n\n`;
        });

        // Send message for this search URL
        await this.sendMessage(message);
      }

      return true;
    } catch (error) {
      console.error("Error creating notification message:", error);
      return false;
    }
  }

  /**
   * Send an aggregated notification for multiple searches
   * @param searchResults Map of search URLs to new listings
   * @returns Promise that resolves when the aggregated notification is sent
   */
  async notifyAggregated(
    searchResults: Map<string, AirbnbListing[]>
  ): Promise<boolean> {
    // Filter out searches with no new listings
    const validSearches = new Map(
      [...searchResults.entries()].filter(
        ([_, listings]) => listings.length > 0
      )
    );

    if (validSearches.size === 0) {
      return true;
    }

    try {
      let totalListings = 0;
      for (const listings of validSearches.values()) {
        totalListings += listings.length;
      }

      // Create message with header
      let message = `🔔 <b>${totalListings} New ${
        totalListings === 1 ? "Listing" : "Listings"
      } Found Across ${validSearches.size} ${
        validSearches.size === 1 ? "Search" : "Searches"
      }</b>\n\n`;

      // Process each search
      let searchCounter = 1;
      for (const [searchUrl, listings] of validSearches.entries()) {
        const searchInfo = this.parseSearchUrl(searchUrl);

        message += `<b>Search ${searchCounter}: ${searchInfo.location}</b>\n`;
        message += `📅 ${searchInfo.dates} • 👥 ${searchInfo.guests} • 💰 ${searchInfo.priceRange}\n`;
        message += `🔍 <a href="${searchUrl}">View all results</a>\n\n`;

        // Add each listing for this search
        listings.forEach((listing, index) => {
          message += `  ${index + 1}. <b>Property Listing</b>\n`;
          message += `  💰 ${listing.currency}${listing.price}`;

          if (listing.rating > 0) {
            message += ` • ⭐${listing.rating.toFixed(1)} (${
              listing.reviewCount
            })`;
          } else {
            message += ` • No ratings`;
          }

          message += `\n  🔗 <a href="${listing.url}">View listing</a>\n\n`;
        });

        message +=
          validSearches.size > 1 && searchCounter < validSearches.size
            ? "➖➖➖➖➖➖➖➖➖➖➖➖\n\n"
            : "";

        searchCounter++;
      }

      return await this.sendMessage(message);
    } catch (error) {
      console.error("Error creating aggregated notification message:", error);
      return false;
    }
  }
}
