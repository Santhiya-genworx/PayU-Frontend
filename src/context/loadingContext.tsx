import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const requestCount = useRef(0);

  const startLoading = useCallback(() => {
    requestCount.current += 1;
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    requestCount.current = Math.max(0, requestCount.current - 1);
    if (requestCount.current === 0) {
      setIsLoading(false);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used inside <LoadingProvider>");
  return ctx;
};