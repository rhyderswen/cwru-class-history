import { createContext, ReactNode, useCallback, useContext, useMemo } from "react";
import { useSearchParams } from "react-router";

interface URLParamContextValue {
  searchParams: URLSearchParams;
  updateParam: (key: string, value: string) => void;
}

const URLParamContext = createContext<URLParamContextValue | null>(null);

export function URLParamProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        value ? next.set(key, value) : next.delete(key);
        return next;
      });
    },
    [setSearchParams],
  );

  const value = useMemo(
    () => ({
      searchParams,
      updateParam,
    }),
    [searchParams, updateParam],
  );

  return <URLParamContext.Provider value={value}>{children}</URLParamContext.Provider>;
}

export function useURLParams() {
  const ctx = useContext(URLParamContext);
  if (!ctx) throw new Error("useURLParams must be used within URLParamProvider");
  return ctx;
}
