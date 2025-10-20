import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import bookmarkIcon from "../images/bookmark.png";
import bookmarkFilledIcon from "../images/bookmark_filled.png";
import { useBookmark } from "../contexts/BookmarkContext";
import arrowIcon from "../images/Arrow.png";

type Scholarship = {
  id: number;
  title: string;
  provider: string;
  deadline: string;
  amount?: string;
  category?: string;
};

const ScholarshipList: React.FC = () => {
  const [data, setData] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const { bookmarks, toggleBookmark } = useBookmark();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/scholarships.json");
        const list: Scholarship[] = await res.json();
        list.sort((a, b) => (a.deadline > b.deadline ? 1 : -1));
        setData(list);
      } catch (e: any) {
        setErr(e?.message ?? "장학금 불러오기 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <div style={containerStyle}>
        <header style={logoHeaderStyle}>
          <img
            src={arrowIcon}
            alt="뒤로가기"
            style={arrowStyle}
            onClick={() => navigate(-1)}
          />

          <img src={logo} alt="DMETA 로고" style={logoStyle} />
        </header>

        <h2 style={titleStyle}>전체 장학금 리스트</h2>

        <section style={listCardStyle}>
          <div style={listContentStyle}>
            {loading && <div>불러오는 중…</div>}
            {err && <div style={{ color: "tomato" }}>에러: {err}</div>}
            {!loading && !err && (
              <ul style={ulStyle}>
                {data.map((s) => {
                  const isBookmarked = bookmarks.includes(s.id);
                  return (
                    <li key={s.id} style={itemCardStyle}>
                      <div style={topRowStyle}>
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

                      <div style={metaStyle}>
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
          </div>
        </section>
      </div>

      <BottomNav />
    </>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "1rem",
  color: "#111827",
  paddingBottom: "80px",
  fontFamily: "Arial, sans-serif",
};

const logoHeaderStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 0 16px",
  marginBottom: "1rem",
};

const arrowStyle: React.CSSProperties = {
  position: "absolute",
  left: "8px",
  top: "50%",
  transform: "translateY(-50%)",
  width: "15px",
  height: "15px",
  cursor: "pointer",
  opacity: 0.8,
};

const logoStyle: React.CSSProperties = {
  width: "120px",
  height: "auto",
  objectFit: "contain",
};

const titleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "0.8rem",
};

const listCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  overflow: "hidden",
};

const listContentStyle: React.CSSProperties = {
  padding: "1rem",
};

const ulStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 10,
};

const itemCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  background: "#fff",
  cursor: "pointer",
  transition: "transform 0.1s ease, box-shadow 0.1s ease",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const bookmarkIconStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  cursor: "pointer",
};

const metaStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  marginTop: 4,
};

export default ScholarshipList;
