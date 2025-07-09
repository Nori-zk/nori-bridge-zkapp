"use client";
import React, { ReactNode } from "react";
import { MetaMaskWalletProvider } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { WagminaProvider } from "wagmina";
import { config } from "@/config/index.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProgressProvider } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { ZkappWorkerProvider } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";

interface AppProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient();

const Providers = ({ children }: AppProvidersProps) => {
  return (
    <MetaMaskWalletProvider>
      <WagminaProvider config={config}>
        <ZkappWorkerProvider>
          <ProgressProvider>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </ProgressProvider>
        </ZkappWorkerProvider>
      </WagminaProvider>
    </MetaMaskWalletProvider>
  );
};

export default Providers;
