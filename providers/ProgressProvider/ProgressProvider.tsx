"use client";
import { createContext, useContext, useMemo, useState } from "react";
interface ProgressContextType {
  showChooseSide: boolean;
  setShowChooseSide: (show: boolean) => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(
  undefined
);

export const useProgress = (): ProgressContextType => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
};

export const ProgressProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [showChooseSide, setShowChooseSide] = useState<boolean>(true);

  const value = useMemo(
    () => ({
      showChooseSide, setShowChooseSide
    }),
    [
      showChooseSide, setShowChooseSide
    ]
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};
