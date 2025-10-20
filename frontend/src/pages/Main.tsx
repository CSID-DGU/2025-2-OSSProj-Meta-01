import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";

import logo from "../images/logo.png";
import notification from "../images/notification.png";

import banner1_1_1 from "../images/banner1_1_1.png";
// 배너 이미지 1500 x 2070
import banner2_2 from "../images/banner2_2.png"; // 추가 배너 있다면
//import banner3 from "../images/banner3.png"; // 추가 배너 있다면

type Notice = {
  id: number;
  title: string;
  postedAt: string;
  url: string;
  category?: string;
};

type ScholarshipPreview = {
  id: number;
  title: string;
  deadline: string;
  category?: string;
};

const Main: React.FC = () => {
  const navigate = useNavigate();

  const [topNotices, setTopNotices] = useState<Notice[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeErr, setNoticeErr] = useState<string | null>(null);

  const [schPrev, setSchPrev] = useState<ScholarshipPreview[]>([]);
  const [schLoad, setSchLoad] = useState(true);
  const [schErr, setSchErr] = useState<string | null>(null);

  const [currentBanner, setCurrentBanner] = useState(0);
  const banners = [banner1_1_1, banner2_2];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/notices.json");
        const list: Notice[] = await res.json();
        list.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
        setTopNotices(list.slice(0, 3));
      } catch (e: any) {
        setNoticeErr(e?.message ?? "학사공지 불러오기 실패");
      } finally {
        setNoticeLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/scholarships.json");
        const list: ScholarshipPreview[] = await res.json();
        list.sort((a, b) => (a.deadline > b.deadline ? 1 : -1));
        setSchPrev(list.slice(0, 3));
      } catch (e: any) {
        setSchErr(e?.message ?? "장학금 불러오기 실패");
      } finally {
        setSchLoad(false);
      }
    })();
  }, []);

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0 }}>
          <img
            src={logo}
            alt="로고"
            style={{ width: "150px", height: "auto" }}
          />
        </h2>
        <span
          style={{ color: "#4facfe", cursor: "pointer" }}
          onClick={() => navigate("/notifications")}
        >
          <img
            src={notification}
            alt="알림"
            style={{ width: "28px", height: "28px" }}
          />
        </span>
      </header>

      <section style={bannerSectionStyle}>
        <div style={bannerWrapperStyle}>
          <img
            src={banners[currentBanner]}
            alt="배너"
            style={bannerImageStyle}
          />
        </div>
      </section>

      <section style={recommendCardStyle}>
        <div style={recommendHeaderStyle}>추천 장학금</div>
        <p style={recommendDescStyle}>
          조건에 맞는 장학금을 자동으로 추천합니다.
        </p>
      </section>

      <section style={scholarshipCardStyle}>
        <div style={scholarshipHeaderStyle}>장학금 공지사항</div>

        <div style={scholarshipContentStyle}>
          {schLoad && <div style={{ marginTop: 8 }}>불러오는 중…</div>}
          {schErr && (
            <div style={{ marginTop: 8, color: "tomato" }}>에러: {schErr}</div>
          )}

          {!schLoad && !schErr && (
            <ul style={listStyle}>
              {schPrev.map((s) => (
                <li
                  key={s.id}
                  style={listItemStyle}
                  onClick={() => navigate(`/scholarship/${s.id}`)}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {s.category ?? "장학"} · 마감 {s.deadline}
                  </div>
                </li>
              ))}
              {!schPrev.length && <li>표시할 장학금이 없습니다.</li>}
            </ul>
          )}

          <button style={buttonStyle} onClick={() => navigate("/scholarship")}>
            장학금 전체 보기
          </button>
        </div>
      </section>

      <section style={noticeCardStyle}>
        <div style={noticeHeaderStyle}>학사공지</div>

        <div style={noticeContentStyle}>
          {noticeLoading && <div style={{ marginTop: 8 }}>불러오는 중…</div>}
          {noticeErr && (
            <div style={{ marginTop: 8, color: "tomato" }}>
              에러: {noticeErr}
            </div>
          )}

          {!noticeLoading && !noticeErr && (
            <ul style={listStyle}>
              {topNotices.map((n) => (
                <li
                  key={n.id}
                  style={listItemStyle}
                  onClick={() => navigate(`/notice/${n.id}`)}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {n.category ?? "학사"} · {n.postedAt}
                  </div>
                </li>
              ))}
              {!topNotices.length && <li>표시할 공지가 없습니다.</li>}
            </ul>
          )}

          <button style={buttonStyle} onClick={() => navigate("/notices")}>
            학사공지 전체 보기
          </button>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

const bannerSectionStyle: React.CSSProperties = {
  marginBottom: "1rem",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const bannerWrapperStyle: React.CSSProperties = {
  width: "100%",
  height: "600px",
  backgroundColor: "#fff",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: "12px",
};

const bannerImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center top",
  borderRadius: "12px",
  transition: "opacity 0.8s ease-in-out",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "1rem",
  fontFamily: "Arial, sans-serif",
  paddingBottom: "80px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
  borderBottom: "1px solid #ddd",
  paddingBottom: "0.5rem",
  color: "#000",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  color: "#333",
  padding: "1rem",
  marginBottom: "1rem",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  marginTop: "0.5rem",
  border: "1px solid #ffa938",
  borderRadius: "8px",
  background: "white",
  color: "#ffa938",
  fontWeight: "bold",
  cursor: "pointer",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  marginTop: 10,
  display: "grid",
  gap: 8,
};

const listItemStyle: React.CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid #eee",
  cursor: "pointer",
};

const headerBaseStyle: React.CSSProperties = {
  height: "25px",
  display: "flex",
  alignItems: "center",
  padding: "0 14px",
  fontWeight: 600,
  fontSize: "16px",
  lineHeight: "1",
  borderTopLeftRadius: "16px",
  borderTopRightRadius: "16px",
  borderBottom: "none",
};

const recommendCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  overflow: "hidden",
  marginBottom: "1rem",
};

const recommendHeaderStyle: React.CSSProperties = {
  ...headerBaseStyle,
  background: "linear-gradient(to right, #ffa938, #ffcfa5)",
  color: "white",
  fontWeight: 600,
  padding: "10px 14px",
  fontSize: "16px",
  borderTopLeftRadius: "16px",
  borderTopRightRadius: "16px",
  borderBottom: "none",
};

const recommendDescStyle: React.CSSProperties = {
  color: "#777",
  fontSize: "14px",
  padding: "24px",
  textAlign: "center",
};

const scholarshipCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  overflow: "hidden",
  marginBottom: "1rem",
};

const scholarshipHeaderStyle: React.CSSProperties = {
  ...headerBaseStyle,
  background: "linear-gradient(to right, #ffa938, #ffcfa5)",
  color: "white",
  fontWeight: 600,
  padding: "10px 14px",
  fontSize: "16px",
  borderTopLeftRadius: "16px",
  borderTopRightRadius: "16px",
  borderBottom: "none",
};

const scholarshipContentStyle: React.CSSProperties = {
  padding: "1rem",
  color: "#333",
};

const noticeCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  overflow: "hidden",
  marginBottom: "1rem",
};

const noticeHeaderStyle: React.CSSProperties = {
  ...headerBaseStyle,
  background: "linear-gradient(to right, #ffa938, #ffcfa5)",
  color: "white",
  fontWeight: 600,
  padding: "10px 14px",
  fontSize: "16px",
  borderTopLeftRadius: "16px",
  borderTopRightRadius: "16px",
  borderBottom: "none",
};

const noticeContentStyle: React.CSSProperties = {
  padding: "1rem",
  color: "#333",
};

export default Main;
