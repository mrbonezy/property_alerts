import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      setSearchData(searchesMetadata);
    } catch (err) {
      console.error("Failed to fetch search data:", err);
      setError("Failed to load search data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return date.toLocaleString();
  };

  const getShortUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathname =
        urlObj.pathname.length > 20
          ? urlObj.pathname.substring(0, 20) + "..."
          : urlObj.pathname;
      return `${urlObj.hostname}${pathname}`;
    } catch (error) {
      console.error("Error parsing URL:", error);
      return url;
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
        <Table>
          <TableCaption>
            Property search alerts and their statistics
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Search URL</TableHead>
              <TableHead>Created On</TableHead>
              <TableHead>Last Fetched</TableHead>
              <TableHead className="text-right">Properties Found</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searchData.map((search, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  <a
                    href={search.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    title={search.searchUrl}
                  >
                    {getShortUrl(search.searchUrl)}
                  </a>
                </TableCell>
                <TableCell>{formatDate(search.createdAt)}</TableCell>
                <TableCell>{formatDate(search.lastFetched)}</TableCell>
                <TableCell className="text-right">
                  {search.propertyCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex justify-end">
        <button
          onClick={fetchSearchData}
          className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>
    </div>
  );
};

export default SearchTable;
