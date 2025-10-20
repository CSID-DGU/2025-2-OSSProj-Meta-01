// src/contexts/BookmarkContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type BookmarkContextType = {
  bookmarks: number[];
  toggleBookmark: (id: number) => void;
};

const BookmarkContext = createContext<BookmarkContextType | null>(null);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("scholarshipBookmarks");
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);

  const toggleBookmark = (id: number) => {
    setBookmarks((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((b) => b !== id)
        : [...prev, id];
      localStorage.setItem("scholarshipBookmarks", JSON.stringify(updated));
      return updated;
    });

    // ✅ 다른 페이지(캘린더/프로필) 갱신 이벤트 발생
    window.dispatchEvent(new Event("bookmark-updated"));
  };

  return (
    <BookmarkContext.Provider value={{ bookmarks, toggleBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmark = () => {
  const ctx = useContext(BookmarkContext);
  if (!ctx)
    throw new Error("useBookmark must be used within a BookmarkProvider");
  return ctx;
};
