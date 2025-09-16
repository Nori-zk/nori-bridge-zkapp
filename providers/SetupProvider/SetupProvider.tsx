import { getReconnectingBridgeSocket$ } from "@nori-zk/mina-token-bridge/rx/socket";
import {
  getBridgeStateTopic$,
  getBridgeTimingsTopic$,
  getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import { createContext, useContext, useMemo } from "react";
import { shareReplay } from "rxjs";

type SetupContextType = {
  ethStateTopic$: any;
  bridgeStateTopic$: any;
  bridgeTimingsTopic$: any;
};
const SetupContext = createContext<SetupContextType | null>(null);

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Note the gotchas in the tests in the link above:

  // let depositMachine: ReturnType<typeof getDepositMachine>;
  //TODO export the bridgeSocketConnectionState to be useable outside, possible in context
  const { bridgeSocket$, bridgeSocketConnectionState$ } = getReconnectingBridgeSocket$();

  // Seem to need to add share replay to avoid contention.
  const ethStateTopic$ = getEthStateTopic$(bridgeSocket$).pipe(shareReplay(1));
  const bridgeStateTopic$ = getBridgeStateTopic$(bridgeSocket$).pipe(
    shareReplay(1)
  );
  const bridgeTimingsTopic$ = getBridgeTimingsTopic$(bridgeSocket$).pipe(
    shareReplay(1)
  );
  // Turn the topics into hot observables... (this is slightly annoying to have to do)
  ethStateTopic$.subscribe();
  bridgeStateTopic$.subscribe();
  bridgeTimingsTopic$.subscribe();
  // Create single instance of worker
  // You must ensure we only have one global reference to bridgeSocket$, ethStateTopic$, bridgeTimingsTopic$ and bridgeStateTopic$
  // They must have:
  // .pipe(
  //     shareReplay(1)
  // )
  // Applied to them.

  // And you must turn them into hot observables aka the subscribe to them immediately within your global service. Otherwise they react very slowly
  // to bridge state changes.

  const contextValue = useMemo(
    () => ({
      ethStateTopic$,
      bridgeStateTopic$,
      bridgeTimingsTopic$,
    }),
    []
  );
  return (
    <SetupContext.Provider value={contextValue}>
      {children}
    </SetupContext.Provider>
  );
};

export const useSetup = () => {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error("useSetup must be used within a SetupProvider");
  }
  return context;
};
