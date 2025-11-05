import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import bookmarkIcon from "../images/bookmark.png";
import bookmarkFilledIcon from "../images/bookmark_filled.png";
import arrowIcon from "../images/Arrow.png";
import { useBookmark } from "../contexts/BookmarkContext";

type Scholarship = {
  id: number;
  title: string;
  provider: string;
  deadline: string;
  amount?: string;
  category?: string;
};

type Keyword = {
  name: string;
  active: boolean;
};

const ScholarshipList: React.FC = () => {
  const [data, setData] = useState<Scholarship[]>([]);
  const [filtered, setFiltered] = useState<Scholarship[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [showKeywords, setShowKeywords] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const { bookmarks, toggleBookmark } = useBookmark();

  // ✅ localStorage에서 키워드 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("keywords");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((k: any) =>
            typeof k === "string" ? { name: k, active: true } : k
          );
          setKeywords(normalized);
          const active = normalized
            .filter((k: Keyword) => k.active)
            .map((k: Keyword) => k.name);
          setSelectedKeywords(active);
        }
      } catch {
        setKeywords([]);
      }
    }

    (async () => {
      try {
        const res = await fetch("/api/scholarships.json");
        if (!res.ok) throw new Error("JSON 파일 불러오기 실패");
        const list: Scholarship[] = await res.json();
        list.sort((a, b) => (a.deadline > b.deadline ? 1 : -1));
        setData(list);
        setFiltered(list);
      } catch (e: any) {
        setErr(e?.message ?? "장학금 불러오기 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ 키워드 클릭 시 토글 & 필터링 (다중 선택 지원)
  const handleKeywordClick = (kw: string) => {
    setSelectedKeywords((prev) => {
      const isSelected = prev.includes(kw);
      const updated = isSelected ? prev.filter((k) => k !== kw) : [...prev, kw];

      if (updated.length === 0) {
        setFiltered(data);
      } else {
        setFiltered(
          data.filter((s) => {
            return updated.some((sel) => {
              if (sel === "교내장학") return s.category === "교내";
              if (sel === "국가장학") return s.category === "국가";
              if (sel === "교외장학") return s.category === "외부";
              return false;
            });
          })
        );
      }
      return updated;
    });
  };

  const activeKeywords = keywords.filter((k) => k.active);

  return (
    <>
      <div style={container}>
        {/* ===== Header ===== */}
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

        {/* ===== 키워드 토글 버튼 + 전체 키워드 표시 ===== */}
        <div style={keywordToggleWrap}>
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            style={keywordToggleBtn}
          >
            {showKeywords ? "관심키워드 숨기기 ▲" : "관심키워드 보기 ▼"}
          </button>

          {/* 버튼 옆에 모든 키워드 표시 (펼쳐질 때는 숨김) */}
          {selectedKeywords.length > 0 && !showKeywords && (
            <div style={selectedKeywordsText}>
              {selectedKeywords.map((kw, i) => (
                <span key={i}>#{kw} </span>
              ))}
            </div>
          )}
        </div>

        {/* ===== 키워드 영역 ===== */}
        {showKeywords && (
          <div style={keywordWrap}>
            {activeKeywords.map((kw, i) => {
              const isSelected = selectedKeywords.includes(kw.name);
              return (
                <div
                  key={i}
                  style={{
                    ...keywordTag,
                    background: isSelected ? "#f9a24e" : "#f3f4f6",
                    color: isSelected ? "#fff" : "#9ca3af",
                    border: isSelected
                      ? "1px solid #f68a0a"
                      : "1px solid #e5e7eb",
                  }}
                  onClick={() => handleKeywordClick(kw.name)}
                >
                  #{kw.name}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== 장학금 카드 ===== */}
        <section>
          {loading && <div>불러오는 중…</div>}
          {err && <div style={{ color: "tomato" }}>에러: {err}</div>}
          {!loading && !err && (
            <ul style={ulStyle}>
              {filtered.map((s) => {
                const isBookmarked = bookmarks.includes(s.id);
                return (
                  <li key={s.id} style={itemCard}>
                    <div style={topRow}>
                      <div
                        style={{
                          fontWeight: 700,
                          flex: 1,
                          cursor: "pointer",
                        }}
                        onClick={() => navigate(`/scholarship/${s.id}`)}
                      >
                        {s.title}
                      </div>

                      <img
                        src={isBookmarked ? bookmarkFilledIcon : bookmarkIcon}
                        alt="bookmark"
                        style={bookmarkIconStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(s.id);
                        }}
                      />
                    </div>

                    <div style={metaText}>
                      {s.provider} · {s.category ?? "장학"} · 마감{" "}
                      <b>{s.deadline}</b>
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

/* ---------------- Styles ---------------- */
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

const logoStyle: React.CSSProperties = {
  width: 120,
  height: "auto",
  objectFit: "contain",
};

const title: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 10,
};

const keywordToggleWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap", // ✅ 줄바꿈 가능
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
  color: "#374151",
  transition: "0.2s",
};

const selectedKeywordsText: React.CSSProperties = {
  fontSize: 14,
  color: "#374151",
  lineHeight: 1.6,
  flex: 1,
  wordBreak: "keep-all",
  whiteSpace: "normal", // ✅ 모든 키워드 줄바꿈 허용
};

const keywordWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
  transition: "max-height 0.3s ease",
};

const keywordTag: React.CSSProperties = {
  borderRadius: 20,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 600,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  cursor: "pointer",
  transition: "all 0.2s ease",
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
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const topRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const metaText: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 4,
};

const bookmarkIconStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  cursor: "pointer",
};

export default ScholarshipList;
