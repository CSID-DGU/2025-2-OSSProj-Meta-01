import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/metalogo.png";
import bookmarkIcon from "../images/bookmark.png";
import bookmarkFilledIcon from "../images/bookmark_filled.png";
import arrowIcon from "../images/Arrow.png";
import { useBookmark } from "../contexts/BookmarkContext";
import { toast } from "react-hot-toast";

const ALL_KEYWORDS = [
  "교내장학",
  "교외장학",
  "국가장학",
  "봉사",
  "성적우수",
  "등록금지원",
  "생활비지원",
  "이공계",
  "인문계",
  "예체능",
  "종교",
  "저소득층",
  "기업연계",
  "자격증",
];

type Scholarship = {
  id: number;
  title: string;
  category: string;
  deadline: string;
  amount?: string;
  isBookmarked: boolean;
  tags: string[];
};

type Keyword = {
  name: string;
  active: boolean;
};

const ScholarshipList: React.FC = () => {
  const [data, setData] = useState<Scholarship[]>([]);
  const [filtered, setFiltered] = useState<Scholarship[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [initialKeywords, setInitialKeywords] = useState<Keyword[]>([]);
  const [showKeywords, setShowKeywords] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { toggleBookmark } = useBookmark();

  /* 서버에서 내 관심 키워드 불러오기 */
  const loadUserKeywords = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const res = await fetch("http://127.0.0.1:8000/mypage/me/keywords/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("키워드 로드 실패");

      const userKeywords = await res.json();

      const merged = ALL_KEYWORDS.map((k) => ({
        name: k,
        active: userKeywords.some((uk: any) => uk.keyword === k),
      }));

      setKeywords(merged);
      setInitialKeywords(merged);
    } catch (e) {
      console.error("키워드 로드 오류:", e);
      const fallback = ALL_KEYWORDS.map((k) => ({ name: k, active: false }));
      setKeywords(fallback);
      setInitialKeywords(fallback);
    }
  };

  /* 장학금 리스트 API 호출 */
  const loadScholarships = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const res = await fetch("http://127.0.0.1:8000/scholarships/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("장학금 API 요청 실패");

      const list = await res.json();

      const converted: Scholarship[] = list.map((s: any) => {
        const mainCategory = s.keywords?.[0]?.keyword ?? "장학";

        return {
          id: s.scholarship_id,
          title: s.scholarship_name,
          category: mainCategory,
          deadline: s.end_date,
          amount: undefined,
          isBookmarked: s.is_bookmarked,
          tags: s.keywords ? s.keywords.map((k: any) => k.keyword) : [],
        };
      });

      converted.sort((a, b) => (a.deadline > b.deadline ? 1 : -1));
      setData(converted);
      setFiltered(converted);
    } catch (e: any) {
      setErr(e?.message ?? "장학금 불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  /* 검색 API 요청 */
  const searchScholarships = async (query: string) => {
    try {
      const token = localStorage.getItem("accessToken");

      const res = await fetch(
        `http://127.0.0.1:8000/scholarships/?search=${encodeURIComponent(
          query
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("검색 API 요청 실패");

      const list = await res.json();

      const converted: Scholarship[] = list.map((s: any) => {
        const mainCategory = s.keywords?.[0]?.keyword ?? "장학";

        return {
          id: s.scholarship_id,
          title: s.scholarship_name,
          category: mainCategory,
          deadline: s.end_date,
          amount: undefined,
          isBookmarked: s.is_bookmarked,
          tags: s.keywords ? s.keywords.map((k: any) => k.keyword) : [],
        };
      });

      setFiltered(converted);
    } catch (e) {
      console.error(e);
      toast.error("검색 중 오류가 발생했습니다");
    }
  };

  useEffect(() => {
    loadUserKeywords();
    loadScholarships();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(data);
      return;
    }

    const timer = setTimeout(() => {
      searchScholarships(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleKeywordClick = (kw: string) => {
    setKeywords((prev) => {
      const updated = prev.map((k) =>
        k.name === kw ? { ...k, active: !k.active } : k
      );

      const activeNames = updated.filter((k) => k.active).map((k) => k.name);

      if (search.trim()) {
        return updated;
      }

      if (activeNames.length === 0) {
        if (!search.trim()) {
          setFiltered(data);
        }
        return updated;
      }

      setFiltered(
        data.filter((s) =>
          activeNames.some((sel) => {
            if (["교내장학", "교외장학", "국가장학"].includes(sel)) {
              return s.category === sel;
            }
            return s.tags.includes(sel);
          })
        )
      );

      return updated;
    });
  };

  /* 장학금 배열 내부에서 북마크 값 업데이트 */
  const updateBookmarkState = (id: number) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
      )
    );

    setFiltered((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
      )
    );
  };

  return (
    <>
      <div style={container}>
        <header style={header}>
          <img
            src={arrowIcon}
            alt="뒤로가기"
            style={arrow}
            onClick={() => navigate(-1)}
          />
          <img src={logo} alt="DMETA 로고" style={logoStyle} />
        </header>

        <h2 style={title}>전체 장학금 리스트</h2>

        {/* 검색 입력창 */}
        <div style={{ margin: "10px 0" }}>
          <input
            type="text"
            placeholder="검색어를 입력하세요"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />
        </div>

        {/* 키워드 토글 */}
        <div style={keywordToggleWrap}>
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            style={keywordToggleBtn}
          >
            {showKeywords ? "관심키워드 숨기기 ▲" : "관심키워드 보기 ▼"}
          </button>

          {!showKeywords && keywords.length > 0 && (
            <div style={selectedKeywordsText}>
              {keywords
                .filter((k) => k.active)
                .map((k, i) => (
                  <span
                    key={i}
                    style={{ marginRight: 6, cursor: "pointer" }}
                    onClick={() => handleKeywordClick(k.name)}
                  >
                    #{k.name}
                  </span>
                ))}
            </div>
          )}
        </div>

        {showKeywords && (
          <div style={keywordWrap}>
            {keywords.map((kw, i) => (
              <div
                key={i}
                style={{
                  ...keywordTag,
                  background: kw.active ? "#f9a24e" : "#f3f4f6",
                  color: kw.active ? "#fff" : "#9ca3af",
                  border: kw.active ? "1px solid #f68a0a" : "1px solid #e5e7eb",
                }}
                onClick={() => handleKeywordClick(kw.name)}
              >
                #{kw.name}
              </div>
            ))}
          </div>
        )}

        {/* 리스트 */}
        <section>
          {loading && <div>불러오는 중…</div>}
          {err && <div style={{ color: "tomato" }}>에러: {err}</div>}

          {!loading && !err && (
            <ul style={ulStyle}>
              {filtered.map((s) => {
                const isBookmarked = s.isBookmarked;

                return (
                  <li key={s.id} style={itemCard}>
                    <div style={topRow}>
                      <div
                        style={{
                          fontWeight: 700,
                          flex: 1,
                          cursor: "pointer",
                          paddingRight: "32px",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                        onClick={() => navigate(`/scholarship/${s.id}`)}
                      >
                        {s.title}
                      </div>

                      <img
                        src={isBookmarked ? bookmarkFilledIcon : bookmarkIcon}
                        alt="bookmark"
                        style={{
                          ...bookmarkIconStyle,
                          position: "absolute",
                          right: 14,
                          top: 14,
                        }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await toggleBookmark(s.id);
                          updateBookmarkState(s.id);

                          toast.success(
                            isBookmarked
                              ? "북마크가 해제되었습니다"
                              : "북마크에 저장되었습니다"
                          );
                        }}
                      />
                    </div>

                    <div style={metaText}>
                      {s.tags?.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          {s.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              style={{ marginRight: 8, color: "#374151" }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {s.category} · 마감 <b>{s.deadline}</b>
                    </div>

                    {s.amount && (
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        {s.amount}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <BottomNav />
    </>
  );
};

/* 스타일 */
const container: React.CSSProperties = {
  maxWidth: 500,
  margin: "0 auto",
  padding: "20px",
  paddingBottom: "100px",
  fontFamily: "Pretendard, sans-serif",
  color: "#111827",
  background: "#fff",
};

const header: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 0 16px",
  marginBottom: 10,
};

const arrow: React.CSSProperties = {
  position: "absolute",
  left: 8,
  top: "50%",
  transform: "translateY(-50%)",
  width: 15,
  height: 15,
  cursor: "pointer",
  opacity: 0.8,
};

const logoStyle: React.CSSProperties = { width: 120 };

const title: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 10,
};

const keywordToggleWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
};

const keywordToggleBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const selectedKeywordsText: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 2,
  flex: 1,
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  color: "#374151",
};

const keywordWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 16,
};

const keywordTag: React.CSSProperties = {
  borderRadius: 20,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const ulStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 10,
};

const itemCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "14px",
  background: "#fff",
  position: "relative",
};

const topRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
};

const metaText: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 4,
};

const bookmarkIconStyle: React.CSSProperties = {
  width: 20,
  cursor: "pointer",
};

export default ScholarshipList;
