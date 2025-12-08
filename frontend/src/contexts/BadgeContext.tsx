import { createContext, useContext, useState, useEffect } from "react";

type BadgeContextType = {
  count: number;
  setCount: React.Dispatch<React.SetStateAction<number>>;
  refreshCount: () => Promise<void>;
};

const BadgeContext = createContext<BadgeContextType | null>(null);

export const BadgeProvider = ({ children }: { children: React.ReactNode }) => {
  const [count, setCount] = useState<number>(0);

  // /notification/count API 호출해서 count 갱신
  const refreshCount = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await fetch("http://127.0.0.1:8000/notification/count/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      setCount(data.count ?? 0);
    } catch (err) {
      console.error("알림 개수 조회 실패:", err);
    }
  };

  // 앱 최초 로드 시 자동 갱신
  useEffect(() => {
    refreshCount();
  }, []);

  return (
    <BadgeContext.Provider value={{ count, setCount, refreshCount }}>
      {children}
    </BadgeContext.Provider>
  );
};

export const useBadge = () => {
  const context = useContext(BadgeContext);
  if (!context) throw new Error("BadgeContext is missing");
  return context;
};
