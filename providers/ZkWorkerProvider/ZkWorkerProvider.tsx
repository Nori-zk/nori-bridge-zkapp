import React, { createContext, useContext, useEffect, useState } from "react";
import ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import { PrivateKey } from "o1js";

type ZkappWorkerContextType = {
  zkappWorkerClient: ZkappWorkerClient | null;
  isLoading: boolean;
  compiledEcdsaCredential: boolean;
};

const ZkappWorkerContext = createContext<ZkappWorkerContextType>({
  zkappWorkerClient: null,
  isLoading: false,
  compiledEcdsaCredential: false,
});

export const ZkappWorkerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [zkappWorkerClient, setZkappWorkerClient] =
    useState<ZkappWorkerClient | null>(null);
  const [compiledEcdsaCredential, setCompiledEcdsaCredential] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const spinUpWorker = async () => {
      try {
        console.log('initing ZkappWorkerClient');
        const client = new ZkappWorkerClient();
        setZkappWorkerClient(client);
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
        const result = await zkappWorkerClient.initialiseCredential();
        console.log("Credential initialised, useEffect:", result);
        setCompiledEcdsaCredential(result);
      } catch (err) {
        console.error("Credential initialisation failed:", err);
      }
    };

    initialiseCredential();
  }, [zkappWorkerClient]);

  useEffect(() => {
    if (!zkappWorkerClient || !compiledEcdsaCredential) return;
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
  }, [compiledEcdsaCredential, zkappWorkerClient]);

  return (
    <ZkappWorkerContext.Provider
      value={{ zkappWorkerClient, isLoading, compiledEcdsaCredential }}
    >
      {children}
    </ZkappWorkerContext.Provider>
  );
};

export const useZkappWorker = () => useContext(ZkappWorkerContext);
