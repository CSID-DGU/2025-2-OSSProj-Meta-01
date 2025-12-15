import React, { createContext, useContext, useEffect, useState } from "react";

type BookmarkContextType = {
  bookmarks: number[];
  toggleBookmark: (id: number) => Promise<void>;
  removeBookmarkById: (
    bookmarkId: number,
    scholarshipId: number
  ) => Promise<void>;
  resetBookmarks: () => void;
};

const BookmarkContext = createContext<BookmarkContextType | null>(null);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  const userId = localStorage.getItem("userId");

  const storageKey = userId
    ? `scholarshipBookmarks_${userId}`
    : "scholarshipBookmarks_guest";

  useEffect(() => {
    const loadInitialBookmarks = async () => {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        const saved = localStorage.getItem(storageKey);
        setBookmarks(saved ? JSON.parse(saved) : []);
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
          const saved = localStorage.getItem(storageKey);
          setBookmarks(saved ? JSON.parse(saved) : []);
          return;
        }

        const serverList = await res.json();
        const ids = serverList.map((b: any) => b.scholarship_id);

        setBookmarks(ids);
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch (e) {
        console.error("북마크 초기 로드 오류:", e);
        const saved = localStorage.getItem(storageKey);
        setBookmarks(saved ? JSON.parse(saved) : []);
      }
    };

    loadInitialBookmarks();
  }, [storageKey]);

  const toggleBookmark = async (scholarshipId: number) => {
    const token = localStorage.getItem("accessToken");

    try {
      await fetch(
        `http://127.0.0.1:8000/scholarships/${scholarshipId}/bookmark/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setBookmarks((prev) => {
        const updated = prev.includes(scholarshipId)
          ? prev.filter((id) => id !== scholarshipId)
          : [...prev, scholarshipId];

        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new Event("bookmark-updated"));
        return updated;
      });
    } catch (e) {
      console.error("북마크 처리 중 오류:", e);
    }
  };

  const removeBookmarkById = async (
    bookmarkId: number,
    scholarshipId: number
  ) => {
    const token = localStorage.getItem("accessToken");

    try {
      await fetch(`http://127.0.0.1:8000/mypage/me/bookmarks/${bookmarkId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setBookmarks((prev) => {
        const updated = prev.filter((id) => id !== scholarshipId);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new Event("bookmark-updated"));
        return updated;
      });
    } catch (e) {
      console.error("북마크 삭제 중 오류:", e);
    }
  };

  const resetBookmarks = () => {
    setBookmarks([]);
  };

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        toggleBookmark,
        removeBookmarkById,
        resetBookmarks,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmark = () => {
  const ctx = useContext(BookmarkContext);
  if (!ctx) {
    throw new Error("useBookmark must be used within a BookmarkProvider");
  }
  return ctx;
};
