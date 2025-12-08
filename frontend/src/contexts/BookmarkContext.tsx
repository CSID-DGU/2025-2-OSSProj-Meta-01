import React, { createContext, useContext, useEffect, useState } from "react";

type BookmarkContextType = {
  bookmarks: number[];
  toggleBookmark: (id: number) => Promise<void>;
  removeBookmarkById: (
    bookmarkId: number,
    scholarshipId: number
  ) => Promise<void>;
};

const BookmarkContext = createContext<BookmarkContextType | null>(null);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  /* 초기 북마크 로드 */
  useEffect(() => {
    const loadInitialBookmarks = async () => {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        const saved = localStorage.getItem("scholarshipBookmarks");
        if (saved) setBookmarks(JSON.parse(saved));
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/mypage/me/bookmarks/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const saved = localStorage.getItem("scholarshipBookmarks");
          if (saved) setBookmarks(JSON.parse(saved));
          return;
        }

        const serverList = await res.json();
        const ids = serverList.map((b: any) => b.scholarship_id);

        setBookmarks(ids);
        localStorage.setItem("scholarshipBookmarks", JSON.stringify(ids));
      } catch (e) {
        console.error("북마크 초기 로드 오류:", e);
        const saved = localStorage.getItem("scholarshipBookmarks");
        if (saved) setBookmarks(JSON.parse(saved));
      }
    };

    loadInitialBookmarks();
  }, []);

  /* 북마크 토글 */
  const toggleBookmark = async (scholarshipId: number) => {
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/scholarships/${scholarshipId}/bookmark/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // 서버 메시지는 toast로 페이지 단에서 처리하므로 여기서는 UI 처리 없음
      let data = {};
      try {
        data = await res.json();
      } catch {}

      setBookmarks((prev) => {
        const updated = prev.includes(scholarshipId)
          ? prev.filter((id) => id !== scholarshipId)
          : [...prev, scholarshipId];

        localStorage.setItem("scholarshipBookmarks", JSON.stringify(updated));
        window.dispatchEvent(new Event("bookmark-updated"));
        return updated;
      });
    } catch (e) {
      console.error("북마크 처리 중 오류:", e);
    }
  };

  /* 북마크 삭제 (마이페이지에서 사용) */
  const removeBookmarkById = async (
    bookmarkId: number,
    scholarshipId: number
  ) => {
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/mypage/me/bookmarks/${bookmarkId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // 여기서도 UI 메시지 제거
      let data = {};
      try {
        data = await res.json();
      } catch {}

      // 상태 동기화
      setBookmarks((prev) => {
        const updated = prev.filter((id) => id !== scholarshipId);
        localStorage.setItem("scholarshipBookmarks", JSON.stringify(updated));
        window.dispatchEvent(new Event("bookmark-updated"));
        return updated;
      });
    } catch (e) {
      console.error("북마크 삭제 중 오류:", e);
    }
  };

  return (
    <BookmarkContext.Provider
      value={{ bookmarks, toggleBookmark, removeBookmarkById }}
    >
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
