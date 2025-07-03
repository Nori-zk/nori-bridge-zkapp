import React, { createContext, useContext, useEffect, useState } from "react";
import ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";

type ZkappWorkerContextType = {
  zkappWorkerClient: ZkappWorkerClient | null;
  isLoading: boolean;
};

const ZkappWorkerContext = createContext<ZkappWorkerContextType>({
  zkappWorkerClient: null,
  isLoading: false,
});

export const ZkappWorkerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [zkappWorkerClient, setZkappWorkerClient] =
    useState<ZkappWorkerClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const spinUpWorker = async () => {
      const client = new ZkappWorkerClient();
      setZkappWorkerClient(client);
      await new Promise((r) => setTimeout(r, 5000));
      setIsLoading(false);
    };
    spinUpWorker().catch(console.error);
  }, []);

  return (
    <ZkappWorkerContext.Provider value={{ zkappWorkerClient, isLoading }}>
      {children}
    </ZkappWorkerContext.Provider>
  );
};

export const useZkappWorker = () => useContext(ZkappWorkerContext);
