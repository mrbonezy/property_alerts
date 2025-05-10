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
      const res = await page.evaluate(() => {
        const logs: string[] = [];
        try {
          logs.push("Inside page context...");

          document.querySelectorAll("h2").forEach((h) => {
            // @ts-ignore
            if (/similar dates/i.test(h.textContent.trim())) {
              const section = h.closest('[role="group"]');
              if (section) section.remove();
            }
          });

          const cards = [
            ...document.querySelectorAll('div[aria-labelledby^="title_"]'),
          ];

          logs.push(`Found ${cards.length} cards`);

          const objs = cards
            .map((card) => {
              // @ts-ignore
              const href = card.querySelector('a[href*="/rooms/"]')?.href;
              const id = href?.match(/\/rooms\/(\d+)/)?.[1];
              const title = card
                .querySelector('[data-testid="listing-card-title"]')
                // @ts-ignore
                ?.innerText.trim();
              const subtitles = [
                ...card.querySelectorAll(
                  '[data-testid="listing-card-subtitle"]'
                ),
              ]
                // @ts-ignore
                .map((el) => el.innerText.trim())
                .filter(Boolean)
                .join(" | ");

              // @ts-ignore
              const price =
                card
                  .querySelector('[data-testid="price-availability-row"]')
                  // @ts-ignore
                  ?.innerText.trim()
                  .match(/^([£$€][\d,]+)/)?.[1] ?? "N/A";

              // return { id, title, subtitle: subtitles, price };

              return {
                id: String(id),
                url: `/rooms/${id}`,
                name: subtitles || "SCRAPE_FAIL_NAME",
                title: title || "SCRAPE_FAIL_TITLE",
                price: price,
                // currency,
                // rating,
                // reviewCount,
              };
            })
            

          return {
            listings: objs,
            error: null,
            logs,
          };
        } catch (e) {
          return {
            listings: [],
            error: String(e),
            logs,
          };
        }
      });

      for (const log of res.logs) {
        console.log(log);
      }

      if (res.error) {
        throw new Error(res.error);
      }

      const listings = res.listings;

      console.log(`Found ${listings.length} listings`);

      // Add a delay before closing
      // await page.waitForTimeout(5000);

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
