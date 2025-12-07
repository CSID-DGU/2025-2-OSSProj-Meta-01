// src/contexts/BookmarkContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type BookmarkContextType = {
  bookmarks: number[];
  toggleBookmark: (id: number) => Promise<void>;
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

  const toggleBookmark = async (id: number) => {
    const token = localStorage.getItem("accessToken");

    try {
      // ⭐ 서버로 북마크 토글 요청 보내기
      const res = await fetch(
        `http://127.0.0.1:8000/scholarships/${id}/bookmark/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();

      // ⭐ 서버 메시지 표시
      if (data?.message) {
        alert(data.message);
      }

      // ⭐ 로컬 상태 업데이트
      setBookmarks((prev) => {
        const updated = prev.includes(id)
          ? prev.filter((b) => b !== id)
          : [...prev, id];

        localStorage.setItem("scholarshipBookmarks", JSON.stringify(updated));

        window.dispatchEvent(new Event("bookmark-updated"));
        return updated;
      });
    } catch (e) {
      alert("북마크 처리 중 오류 발생");
    }
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
