import { chromium } from "playwright";
import type { AirbnbListing, SearchParams } from "./types";

export class AirbnbScraper {
  private extractSearchParams(url: string): URLSearchParams {
    const searchUrl = new URL(url);
    return new URLSearchParams(searchUrl.search);
  }

  async getListings(searchParams: SearchParams): Promise<AirbnbListing[]> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    try {
      const page = await context.newPage();

      // Extract search parameters for filtered URLs
      const urlParams = this.extractSearchParams(searchParams.url);
      const filterParams = {
        checkin: urlParams.get("checkin") || "",
        checkout: urlParams.get("checkout") || "",
        adults: urlParams.get("adults") || "",
        children: urlParams.get("children") || "",
        infants: urlParams.get("infants") || "",
        pets: urlParams.get("pets") || "",
      };

      // Slow down operations for debugging
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      console.log("Navigating to URL...");
      await page.goto(searchParams.url);

      // Wait for either the content to be available or the page to be fully loaded
      console.log("Waiting for content...");
      await Promise.race([
        page.waitForLoadState("networkidle"),
        page.waitForLoadState("domcontentloaded"),
        page.waitForSelector('[data-testid="card-container"]', {
          timeout: 10000,
        }),
      ]);

      // Give a small delay for dynamic content
      await page.waitForTimeout(2000);

      console.log("Attempting to extract data...");

      // Extract the JSON data from the script tag
      const listings = await page.evaluate(() => {
        console.log("Inside page context...");

        // Try multiple selectors
        const selectors = [
          "#data-deferred-state-0",
          "#data-deferred-state",
          'script[type="application/json"]',
        ];
        let scriptContent = null;

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element?.textContent) {
            console.log("Found data in selector:", selector);
            scriptContent = element.textContent;
            break;
          }
        }

        if (!scriptContent) {
          console.log("No script content found in any selector");
          return [];
        }

        try {
          const data = JSON.parse(scriptContent);

          // Try multiple paths to find the listings data
          const paths = [
            data?.niobeMinimalClientData?.[1]?.data?.presentation?.staysSearch
              ?.results?.searchResults,
            data?.niobeMinimalClientData?.[0]?.[1]?.data?.presentation
              ?.staysSearch?.results?.searchResults,
            data?.niobeMinimalClientData?.[0]?.[1]?.data?.presentation
              ?.staySearch?.results?.searchResults,
          ];

          const stayResults = paths.find((path) => Array.isArray(path)) || [];
          console.log(`Found ${stayResults.length} results in data`);

          return stayResults.map((result: any) => {
            const priceData =
              result.structuredDisplayPrice?.primaryLine ||
              result.pricingQuote?.structuredStayDisplayPrice?.primaryLine;

            // Extract price and currency
            const priceText = priceData?.price || "";
            const priceMatch = priceText.match(/([£$€])(\d+)/);
            const price = priceMatch ? parseInt(priceMatch[2], 10) : 0;
            const currency = priceMatch ? priceMatch[1] : "";

            // Extract rating and review count
            const ratingText = result.avgRatingLocalized || "";
            const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*\((\d+)\)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
            const reviewCount = ratingMatch ? parseInt(ratingMatch[2], 10) : 0;

            return {
              id: String(result.listing.id),
              url: `/rooms/${result.listing.id}`,
              price,
              currency,
              rating,
              reviewCount,
            };
          });
        } catch (error) {
          console.error("Error parsing Airbnb data:", error);
          return [];
        }
      });

      console.log(`Found ${listings.length} listings`);

      // Add a delay before closing
      await page.waitForTimeout(5000);

      // Build the filtered URLs with the original search parameters
      return listings.map((listing: AirbnbListing) => {
        const filteredUrl = new URL(`https://www.airbnb.com${listing.url}`);
        // Add search parameters to the room URL
        filteredUrl.searchParams.set("check_in", filterParams.checkin);
        filteredUrl.searchParams.set("check_out", filterParams.checkout);
        filteredUrl.searchParams.set("adults", filterParams.adults);
        filteredUrl.searchParams.set("children", filterParams.children);
        if (filterParams.infants)
          filteredUrl.searchParams.set("infants", filterParams.infants);
        if (filterParams.pets)
          filteredUrl.searchParams.set("pets", filterParams.pets);

        return {
          ...listing,
          url: filteredUrl.toString(),
        };
      });
    } catch (error) {
      console.error("Error scraping Airbnb:", error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
