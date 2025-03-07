import { RedisService } from "@/services/RedisService";
import { RedisConfig } from "@/types";
import { getRedisConfig, saveRedisConfig } from "@/utils/storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface RedisContextType {
  redisService: RedisService | null;
  isConfigured: boolean;
  isConnected: boolean;
  configure: (config: RedisConfig) => Promise<boolean>;
  clearConfig: () => void;
}

const RedisContext = createContext<RedisContextType>({
  redisService: null,
  isConfigured: false,
  isConnected: false,
  configure: async () => false,
  clearConfig: () => {},
});

export const useRedis = () => useContext(RedisContext);

interface RedisProviderProps {
  children: ReactNode;
}

export const RedisProvider = ({ children }: RedisProviderProps) => {
  const [redisService, setRedisService] = useState<RedisService | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const initializeRedis = async () => {
      const config = getRedisConfig();
      if (config) {
        await configure(config);
      }
    };

    initializeRedis();
  }, []);

  const configure = async (config: RedisConfig): Promise<boolean> => {
    try {
      const service = new RedisService(config);
      const connected = await service.testConnection();

      if (connected) {
        saveRedisConfig(config);
        setRedisService(service);
        setIsConfigured(true);
        setIsConnected(true);
        return true;
      } else {
        setIsConnected(false);
        return false;
      }
    } catch (error) {
      console.error("Failed to configure Redis:", error);
      setIsConnected(false);
      return false;
    }
  };

  const clearConfig = () => {
    setRedisService(null);
    setIsConfigured(false);
    setIsConnected(false);
    localStorage.removeItem("property_alerts_config");
  };

  return (
    <RedisContext.Provider
      value={{
        redisService,
        isConfigured,
        isConnected,
        configure,
        clearConfig,
      }}
    >
      {children}
    </RedisContext.Provider>
  );
};
