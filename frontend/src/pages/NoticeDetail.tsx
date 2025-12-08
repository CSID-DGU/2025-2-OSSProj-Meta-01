import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/metalogo.png";
import arrowIcon from "../images/Arrow.png";

type Notice = {
  id: number;
  title: string;
  postedAt: string;
  url: string;
  category?: string;
  content?: string;
  startDate?: string;
  endDate?: string;
};

const color = {
  orange: "#f97316",
  text: "#111827",
  sub: "#6b7280",
  border: "#f1f1f1",
};

function isOngoing(start?: string, end?: string) {
  if (!start || !end) return false;
  const today = new Date();
  const s = new Date(start);
  const e = new Date(end);
  return today >= s && today <= e;
}

const NoticeDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/notices.json");
        const list: Notice[] = await res.json();
        const found = list.find((n) => n.id === Number(id)) ?? null;
        setNotice(found);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div style={containerStyle}>불러오는 중…</div>;

  if (!notice) {
    return (
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

        <p>존재하지 않는 공지입니다.</p>
        <Link to="/notices" style={{ textDecoration: "underline" }}>
          목록으로
        </Link>
      </div>
    );
  }

  const ongoing =
    notice.startDate && notice.endDate
      ? isOngoing(notice.startDate, notice.endDate)
      : null;

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

        <h2 style={titleStyle}>{notice.title}</h2>

        <div style={metaStyle}>
          {notice.category ?? "학사"} · {notice.postedAt}
          {notice.startDate && notice.endDate && (
            <>
              {" "}
              · {notice.startDate} ~ {notice.endDate}{" "}
              <span
                style={{
                  color: ongoing ? color.orange : "tomato",
                  fontWeight: 600,
                }}
              >
                {ongoing ? "진행 중" : "마감"}
              </span>
            </>
          )}
        </div>

        <div style={cardStyle}>
          {notice.content ? (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {notice.content}
            </div>
          ) : (
            <p style={{ color: color.sub }}>
              본문이 없습니다. 아래 ‘원문 보기’를 확인하세요.
            </p>
          )}
          {notice.url && (
            <button
              onClick={() => window.open(notice.url, "_blank")}
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
  color: color.text,
  background: "#fff",
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

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  marginTop: 0,
  color: color.text,
};

const metaStyle: React.CSSProperties = {
  fontSize: 13,
  color: color.sub,
  marginBottom: 14,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  border: `1px solid ${color.border}`,
  padding: "1rem",
  marginTop: "1rem",
  fontSize: 14,
  lineHeight: 1.5,
};

const linkBtn: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${color.orange}`,
  color: color.orange,
  borderRadius: 999,
  padding: "6px 12px",
  cursor: "pointer",
  marginTop: 14,
  fontWeight: 600,
  fontSize: 14,
};

export default NoticeDetail;
