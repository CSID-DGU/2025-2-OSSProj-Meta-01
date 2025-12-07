import { createContext, useContext, useState } from "react";

type BadgeContextType = {
  count: number;
  setCount: React.Dispatch<React.SetStateAction<number>>;
};

const BadgeContext = createContext<BadgeContextType | null>(null);

export const BadgeProvider = ({ children }: { children: React.ReactNode }) => {
  const [count, setCount] = useState<number>(0);

  return (
    <BadgeContext.Provider value={{ count, setCount }}>
      {children}
    </BadgeContext.Provider>
  );
};

export const useBadge = () => {
  const context = useContext(BadgeContext);
  if (!context) throw new Error("BadgeContext is missing");
  return context;
};
