"use client";
import React, { ReactNode } from "react";
import { MetaMaskWalletProvider } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { WagminaProvider } from "wagmina";
import { config } from "@/config/index.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoriBridgeProvider } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { SetupProvider } from "./SetupProvider/SetupProvider.tsx";
import { ProgressProvider } from "./ProgressProvider/ProgressProvider.tsx";
import { AuroWalletProvider } from "./AuroWalletProvider/AuroWalletProvider.tsx";
import { AuthProvider } from "./AuthProvider/AuthProvider.tsx";

interface AppProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient();

const Providers = ({ children }: AppProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SetupProvider>
          <MetaMaskWalletProvider>
            <WagminaProvider config={config}>
              <AuroWalletProvider>
                <NoriBridgeProvider>
                  <ProgressProvider>{children}</ProgressProvider>
                </NoriBridgeProvider>
              </AuroWalletProvider>
            </WagminaProvider>
          </MetaMaskWalletProvider>
        </SetupProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default Providers;
