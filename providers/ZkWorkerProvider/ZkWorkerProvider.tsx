import React, { createContext, useContext, useEffect, useState } from "react";
import ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import { PrivateKey } from "o1js";
import { useBridging } from "../BridgingProvider/BridgingProvider.tsx";

type ZkappWorkerContextType = {
  zkappWorkerClient: ZkappWorkerClient | null;
  isLoading: boolean;
};

const ZkappWorkerContext = createContext<ZkappWorkerContextType>({
  zkappWorkerClient: null,
  isLoading: false,
});

// ZkappWorkerProvider is a pure worker bootstrapper.
export const ZkappWorkerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [zkappWorkerClient, setZkappWorkerClient] =
    useState<ZkappWorkerClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  //due to requirement needing credential to check for credential in localStorage, moved initialisation Credential
  //to BridgingProvider, so we can check if credential is set in localStorage. Removes potential circular dependency
  useEffect(() => {
    const spinUpWorker = async () => {
      try {
        console.log("initing ZkappWorkerClient");
        // const client = new ZkappWorkerClient();
        // setZkappWorkerClient(client);
      } catch (error) {
        console.error("Failed to initialize zkappWorkerClient:", error);
      } finally {
        setIsLoading(false);
      }
    };
    spinUpWorker();
  }, []);

  useEffect(() => {
    if (!zkappWorkerClient) return;

    const initialiseCredential = async () => {
      try {
        // Perform your follow-up initialisation here
        // const result = await zkappWorkerClient.initialiseCredential();
        console.log("Credential initialised, useEffect:", result);
        // setCompiledEcdsaCredential(result);
      } catch (err) {
        console.error("Credential initialisation failed:", err);
      }
    };

    initialiseCredential();
  }, [zkappWorkerClient]);

  // useEffect(() => {
  //   if (!zkappWorkerClient || !compiledEcdsaCredential) return;
  // const initialiseTokenContracts = async () => {
  //   try {
  //     await zkappWorkerClient.loadTokenContracts();
  //     console.log("Token contracts loaded successfully.");
  //     await zkappWorkerClient.initialiseTokenContracts(
  //       PrivateKey.random().toPublicKey().toBase58(),
  //       PrivateKey.random().toPublicKey().toBase58()
  //     );
  //     // await zkappWorkerClient.compileContracts({});
  //   } catch (error) {
  //     console.error("Error during worker client initialisation:", error);
  //   }
  // };
  // initialiseTokenContracts();
  // }, [compiledEcdsaCredential, zkappWorkerClient]);
  // useEffect(() => {
  //   if (!zkappWorkerClient || !compiledEcdsaCredential) return;
  //   // const initialiseTokenContracts = async () => {
  //   //   try {
  //   //     await zkappWorkerClient.loadTokenContracts();
  //   //     console.log("Token contracts loaded successfully.");
  //   //     await zkappWorkerClient.initialiseTokenContracts(
  //   //       PrivateKey.random().toPublicKey().toBase58(),
  //   //       PrivateKey.random().toPublicKey().toBase58()
  //   //     );
  //   //     // await zkappWorkerClient.compileContracts({});
  //   //   } catch (error) {
  //   //     console.error("Error during worker client initialisation:", error);
  //   //   }
  //   // };
  //   // initialiseTokenContracts();
  // }, [compiledEcdsaCredential, zkappWorkerClient]);

  return (
    <ZkappWorkerContext.Provider value={{ zkappWorkerClient, isLoading }}>
      {children}
    </ZkappWorkerContext.Provider>
  );
};

export const useZkappWorker = () => useContext(ZkappWorkerContext);
