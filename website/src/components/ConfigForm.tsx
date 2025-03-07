import React, { useState } from 'react';
import { useRedis } from '@/context/RedisContext';
import { RedisConfig } from '@/types';

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
      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-semibold mb-4">Connection Status</h2>
        <div className="flex items-center mb-4">
          <span className="text-green-500 text-xl mr-2">●</span> 
          <span>Connected to Upstash Redis</span>
        </div>
        <button 
          onClick={handleDisconnect} 
          className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90"
        >
          Disconnect
        </button>
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
        
        <button 
          type="submit" 
          disabled={isSubmitting || !url || !token}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  );
};

export default ConfigForm; 