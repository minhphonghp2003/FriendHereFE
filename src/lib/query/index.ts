import { QueryClient, type DefaultOptions } from "@tanstack/react-query";

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
};

export const makeQueryClient = () => new QueryClient({ defaultOptions });

export const getQueryClient = (() => {
  let client: QueryClient | null = null;
  return () => {
    if (typeof window === "undefined") return makeQueryClient();
    if (!client) client = makeQueryClient();
    return client;
  };
})();
