import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  content?: string;
  url?: string;
  contact?: string;
};

const ScholarshipDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const { bookmarks, toggleBookmark } = useBookmark();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/scholarships.json");
      const list: Scholarship[] = await res.json();
      setItem(list.find((s) => s.id === Number(id)) ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div style={containerStyle}>불러오는 중…</div>;
  if (!item)
    return <div style={containerStyle}>존재하지 않는 장학금입니다.</div>;

  const isBookmarked = bookmarks.includes(item.id);
  const dday = Math.ceil(
    (new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <img
            src={arrowIcon}
            alt="뒤로가기"
            style={arrowStyle}
            onClick={() => navigate(-1)}
          />
          <img src={logo} alt="DMETA 로고" style={logoStyle} />
        </header>

        <div style={titleWrap}>
          <h2 style={titleStyle}>{item.title}</h2>
          <img
            src={isBookmarked ? bookmarkFilledIcon : bookmarkIcon}
            alt="bookmark"
            onClick={() => toggleBookmark(item.id)}
            style={{
              width: 22,
              height: 22,
              cursor: "pointer",
              marginLeft: 8,
            }}
          />
        </div>

        <div style={metaStyle}>
          {item.provider} · {item.category ?? "장학"} · 마감{" "}
          <b style={{ color: "#000" }}>{item.deadline}</b>{" "}
          {dday > 0 ? (
            <span style={{ color: "#000" }}>D-{dday}</span>
          ) : (
            <span style={{ color: "#000" }}>마감</span>
          )}
        </div>

        <div style={cardStyle}>
          {item.amount && (
            <p>
              <b>지원금액:</b> {item.amount}
            </p>
          )}
          {item.content ? (
            <p style={{ lineHeight: 1.6 }}>{item.content}</p>
          ) : (
            <p style={{ color: "#6b7280" }}>
              상세 내용은 ‘원문 보기’를 확인하세요.
            </p>
          )}
          <div style={{ marginTop: 10 }}>
            <a
              href={`tel:${item.contact ?? "02-0000-0000"}`}
              style={{
                color: "#111827",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {item.contact ?? "02-0000-0000"}
            </a>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              동국대 장학팀 문의
            </div>
          </div>

          {item.url && (
            <button
              onClick={() => window.open(item.url, "_blank")}
              style={linkBtn}
            >
              원문 보기 →
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "1rem",
  fontFamily: "Pretendard, sans-serif",
  paddingBottom: "80px",
  color: "#111827",
};

const headerStyle: React.CSSProperties = {
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

const titleWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 6,
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const metaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 14,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  border: "1px solid #f1f1f1",
  padding: "1rem",
  marginTop: "1rem",
  fontSize: 14,
  lineHeight: 1.5,
};

const linkBtn: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #000",
  color: "#000",
  borderRadius: 999,
  padding: "6px 12px",
  cursor: "pointer",
  marginTop: 14,
  fontWeight: 600,
  fontSize: 14,
};

export default ScholarshipDetail;
