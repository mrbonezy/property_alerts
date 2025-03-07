import React from 'react';
import { useRedis } from '@/context/RedisContext';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const { isConnected, clearConfig } = useRedis();
  
  const handleDisconnect = () => {
    clearConfig();
  };
  
  return (
    <div className="border-b sticky top-0 bg-background z-10">
      <div className="container mx-auto py-3 px-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-lg">Property Alerts</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {isConnected && (
            <>
              <div className="text-sm text-muted-foreground flex items-center">
                <span className="text-green-500 text-xs mr-1">●</span> 
                <span>Connected</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDisconnect}
                className="text-sm h-7"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar; 