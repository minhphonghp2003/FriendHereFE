"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider, HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query";

interface QueryProviderProps {
  children: ReactNode;
  dehydratedState?: DehydratedState;
}

export const QueryProvider = ({ children, dehydratedState }: QueryProviderProps) => {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
