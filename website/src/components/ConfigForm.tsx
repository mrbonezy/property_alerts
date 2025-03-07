import React, { useState } from 'react';
import { useRedis } from '@/context/RedisContext';
import { RedisConfig } from '@/types';
import { Button } from '@/components/ui/button';

const ConfigForm = () => {
  const { isConfigured, isConnected, configure, clearConfig } = useRedis();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const config: RedisConfig = { url, token };
      const success = await configure(config);
      
      if (!success) {
        setError('Failed to connect to Redis. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred while connecting to Redis');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = () => {
    clearConfig();
    setUrl('');
    setToken('');
  };

  if (isConfigured && isConnected) {
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-4">Property Alerts Configuration</h2>
        <p className="text-muted-foreground mb-4">
          You are connected to Upstash Redis. You can disconnect if you need to change your configuration.
        </p>
        
        <Button 
          onClick={handleDisconnect} 
          variant="outline"
          size="sm"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Connect to Upstash Redis</h2>
      <p className="text-muted-foreground mb-4">
        Enter your Upstash Redis REST URL and token to connect to your property alerts database.
      </p>
      
      {error && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="redis-url" className="block text-sm font-medium mb-2">
            Redis REST URL
          </label>
          <input
            id="redis-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-region.upstash.io/redis/..."
            className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="redis-token" className="block text-sm font-medium mb-2">
            Redis REST Token
          </label>
          <input
            id="redis-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Your Upstash Redis token"
            className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
            required
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={isSubmitting || !url || !token}
          variant="default"
          className="disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Connecting...' : 'Connect'}
        </Button>
      </form>
    </div>
  );
};

export default ConfigForm; 