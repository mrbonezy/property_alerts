import React, { useState, useEffect } from 'react';
import { useRedis } from '@/context/RedisContext';
import { Button } from '@/components/ui/button';

const SearchAlerts = () => {
  const { redisService, isConnected } = useRedis();
  const [searches, setSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newSearchUrl, setNewSearchUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isConnected && redisService) {
      fetchSearches();
    }
  }, [redisService, isConnected]);

  const fetchSearches = async () => {
    if (!redisService) return;
    
    setLoading(true);
    setError('');
    try {
      const outstandingSearches = await redisService.getOutstandingSearches();
      setSearches(outstandingSearches);
    } catch (err) {
      console.error('Failed to fetch searches:', err);
      setError('Failed to load search alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redisService || !newSearchUrl.trim()) return;

    setIsSubmitting(true);
    setError('');
    try {
      // Validate if it's a proper URL
      new URL(newSearchUrl);
      
      await redisService.addOutstandingSearch(newSearchUrl);
      setNewSearchUrl('');
      fetchSearches();
    } catch (err) {
      console.error('Failed to add search:', err);
      if (err instanceof Error && err.name === 'TypeError') {
        setError('Please enter a valid URL');
      } else {
        setError('Failed to add search alert');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSearch = async (searchUrl: string) => {
    if (!redisService) return;
    
    try {
      await redisService.removeOutstandingSearch(searchUrl);
      fetchSearches();
    } catch (err) {
      console.error('Failed to remove search:', err);
      setError('Failed to remove search alert');
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Property Search Alerts</h2>
      
      {error && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleAddSearch} className="mb-6">
        <div className="mb-4">
          <label htmlFor="search-url" className="block text-sm font-medium mb-2">
            Add New Search URL
          </label>
          <input
            id="search-url"
            type="text"
            value={newSearchUrl}
            onChange={(e) => setNewSearchUrl(e.target.value)}
            placeholder="https://www.airbnb.com/s/..."
            className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
            required
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={isSubmitting || !newSearchUrl.trim()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding...' : 'Add Search'}
        </Button>
      </form>
      
      <div>
        <h3 className="text-xl font-medium mb-3">Current Searches</h3>
        
        {loading ? (
          <p className="text-muted-foreground">Loading searches...</p>
        ) : searches.length === 0 ? (
          <p className="text-muted-foreground">No search alerts configured yet.</p>
        ) : (
          <ul className="space-y-2">
            {searches.map((searchUrl, index) => (
              <li key={index} className="flex items-center justify-between p-3 border rounded-md">
                <div className="overflow-hidden text-ellipsis whitespace-nowrap mr-4">
                  <a 
                    href={searchUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {searchUrl}
                  </a>
                </div>
                <button 
                  onClick={() => handleRemoveSearch(searchUrl)}
                  className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                  aria-label="Remove search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchAlerts; 