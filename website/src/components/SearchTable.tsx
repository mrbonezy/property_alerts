import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRedis } from "@/context/RedisContext";
import { SearchMetadata } from "@/services/RedisService";
import { useEffect, useState } from "react";

const SearchTable = () => {
  const { redisService, isConnected } = useRedis();
  const [searchData, setSearchData] = useState<SearchMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isConnected && redisService) {
      fetchSearchData();
    }
  }, [redisService, isConnected]);

  const fetchSearchData = async () => {
    if (!redisService) return;

    setLoading(true);
    setError("");
    try {
      const searchesMetadata = await redisService.getAllSearchesMetadata();

      // Sort searches by check-in date (if available)
      const sortedData = [...searchesMetadata].sort((a, b) => {
        const aInfo = parseSearchUrl(a.searchUrl);
        const bInfo = parseSearchUrl(b.searchUrl);

        if (!aInfo.checkin) return 1; // No check-in date goes to the end
        if (!bInfo.checkin) return -1; // No check-in date goes to the end

        return (
          new Date(aInfo.checkin).getTime() - new Date(bInfo.checkin).getTime()
        );
      });

      setSearchData(sortedData);
    } catch (err) {
      console.error("Failed to fetch search data:", err);
      setError("Failed to load search data");
    } finally {
      setLoading(false);
    }
  };

  // TODO: distinguish between never and error
  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return date.toLocaleString();
  };

  const formatDateFromString = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString(
        navigator.language || "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      );
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateStr;
    }
  };

  const parseSearchUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      // Extract location name from URL path
      const locationMatch = urlObj.pathname.match(/\/s\/([^/]+)/);
      const location = locationMatch
        ? decodeURIComponent(locationMatch[1].replace(/-/g, " "))
        : "Unknown location";

      // Parse search parameters
      return {
        location: location,
        adults: params.get("adults") || "0",
        children: params.get("children") || "0",
        checkin: params.get("checkin") || "",
        checkout: params.get("checkout") || "",
        priceMin: params.get("price_min") || "",
        priceMax: params.get("price_max") || "",
        currency: params.get("currency") || "",
        numNights: calculateNights(
          params.get("checkin"),
          params.get("checkout")
        ),
        fullUrl: url,
      };
    } catch (error) {
      console.error("Error parsing URL:", error);
      return {
        location: "Invalid URL",
        adults: "0",
        children: "0",
        checkin: "",
        checkout: "",
        priceMin: "",
        priceMax: "",
        currency: "",
        numNights: 0,
        fullUrl: url,
      };
    }
  };

  const calculateNights = (checkin: string | null, checkout: string | null) => {
    if (!checkin || !checkout) return 0;

    try {
      const startDate = new Date(checkin);
      const endDate = new Date(checkout);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  const handleRemoveSearch = async (searchUrl: string) => {
    if (!redisService) return;

    try {
      await redisService.removeOutstandingSearch(searchUrl);
      fetchSearchData();
    } catch (err) {
      console.error("Failed to remove search:", err);
      setError("Failed to remove search alert");
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Search Alerts Data</h2>

      {error && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-4 text-muted-foreground">
          Loading search data...
        </div>
      ) : searchData.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          No search alerts configured yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Location</TableHead>
                <TableHead className="whitespace-nowrap">Check-in</TableHead>
                <TableHead className="whitespace-nowrap">Check-out</TableHead>
                <TableHead className="whitespace-nowrap">Nights</TableHead>
                <TableHead className="whitespace-nowrap">Guests</TableHead>
                <TableHead className="whitespace-nowrap">Price Range</TableHead>
                <TableHead className="whitespace-nowrap">Created On</TableHead>
                <TableHead className="whitespace-nowrap">Last Fetched</TableHead>
                <TableHead className="whitespace-nowrap text-right">Properties</TableHead>
                <TableHead className="whitespace-nowrap w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchData.map((search, index) => {
                const parsedUrl = parseSearchUrl(search.searchUrl);
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium truncate max-w-[100px]" title={parsedUrl.location}>
                      {parsedUrl.location}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {parsedUrl.checkin
                        ? formatDateFromString(parsedUrl.checkin)
                        : "Not specified"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {parsedUrl.checkout
                        ? formatDateFromString(parsedUrl.checkout)
                        : "Not specified"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {parsedUrl.numNights > 0 ? parsedUrl.numNights : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {`${parsedUrl.adults} adults${
                        parseInt(parsedUrl.children) > 0
                          ? `, ${parsedUrl.children} children`
                          : ""
                      }`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {parsedUrl.priceMin && parsedUrl.priceMax
                        ? `${parsedUrl.currency || ""}${parsedUrl.priceMin} - ${
                            parsedUrl.currency || ""
                          }${parsedUrl.priceMax}`
                        : parsedUrl.priceMin
                        ? `From ${parsedUrl.currency || ""}${parsedUrl.priceMin}`
                        : parsedUrl.priceMax
                        ? `Up to ${parsedUrl.currency || ""}${parsedUrl.priceMax}`
                        : "Any price"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(search.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(search.lastFetched)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {search.propertyCount}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex space-x-2 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(search.searchUrl, "_blank")}
                          title="Open search in new tab"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveSearch(search.searchUrl)}
                          title="Remove search"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={fetchSearchData}
          variant="secondary"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>
    </div>
  );
};

export default SearchTable;
