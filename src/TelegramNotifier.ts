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
   * Notify about new listings
   * @param listings The new listings to notify about
   * @param searchUrl The search URL where the listings were found
   * @returns Promise that resolves when all notifications are sent
   */
  async notifyNewListings(
    listings: AirbnbListing[],
    searchUrl: string
  ): Promise<boolean> {
    if (listings.length === 0) {
      return true;
    }

    try {
      // Extract location name from search URL
      const locationMatch = searchUrl.match(/\/s\/([^\/]+)/);
      const location = locationMatch
        ? decodeURIComponent(locationMatch[1].replace(/-/g, " "))
        : "Unknown location";

      // Create message with header
      let message = `🏠 <b>${listings.length} New ${
        listings.length === 1 ? "Listing" : "Listings"
      } Found in ${location}</b>\n\n`;

      // Add each listing to the message
      listings.forEach((listing, index) => {
        message += `<b>${index + 1}. ${listing.currency}${listing.price}</b>`;

        if (listing.rating > 0) {
          message += ` - Rating: ⭐${listing.rating.toFixed(1)} (${
            listing.reviewCount
          } ${listing.reviewCount === 1 ? "review" : "reviews"})`;
        } else {
          message += ` - No ratings yet`;
        }

        message += `\n${listing.url}\n\n`;
      });

      return await this.sendMessage(message);
    } catch (error) {
      console.error("Error creating notification message:", error);
      return false;
    }
  }
}
