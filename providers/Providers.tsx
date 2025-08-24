"use client";
import React, { ReactNode } from "react";
import { MetaMaskWalletProvider } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { WagminaProvider } from "wagmina";
import { config } from "@/config/index.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZkappWorkerProvider } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";
import { BridgingProvider } from "@/providers/BridgingProvider/BridgingProvider.tsx";
import { NoriBridgeProvider } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";

interface AppProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient();

const Providers = ({ children }: AppProvidersProps) => {
  return (
    <NoriBridgeProvider>
      <MetaMaskWalletProvider>
        <WagminaProvider config={config}>
          <ZkappWorkerProvider>
            {/* <BridgingProvider> */}
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
            {/* </BridgingProvider> */}
          </ZkappWorkerProvider>
        </WagminaProvider>
      </MetaMaskWalletProvider>
    </NoriBridgeProvider>
  );
};

export default Providers;
