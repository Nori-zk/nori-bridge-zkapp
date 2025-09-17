"use client";
import React, { ReactNode } from "react";
import { MetaMaskWalletProvider } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { WagminaProvider } from "wagmina";
import { config } from "@/config/index.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoriBridgeProvider } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { SetupProvider } from "./SetupProvider/SetupProvider.tsx";
import { ProgressProvider } from "./ProgressProvider/ProgressProvider.tsx";

interface AppProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient();

const Providers = ({ children }: AppProvidersProps) => {
  return (
    <SetupProvider>
      <MetaMaskWalletProvider>
        <WagminaProvider config={config}>
          <NoriBridgeProvider>
            <ProgressProvider>
              <QueryClientProvider client={queryClient}>
                {children}
              </QueryClientProvider>
            </ProgressProvider>
          </NoriBridgeProvider>
        </WagminaProvider>
      </MetaMaskWalletProvider>
    </SetupProvider>
  );
};

export default Providers;
