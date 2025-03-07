import React, { useState } from 'react';
import { useRedis } from '@/context/RedisContext';
import { Button } from '@/components/ui/button';

const SearchAlerts = () => {
  const { redisService, isConnected } = useRedis();
  const [error, setError] = useState('');
  const [newSearchUrl, setNewSearchUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          className="bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding...' : 'Add Search'}
        </Button>
      </form>
    </div>
  );
};

export default SearchAlerts; 