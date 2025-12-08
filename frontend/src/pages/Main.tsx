import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import "./Main.css";

import logo from "../images/metalogo.png";
import notification from "../images/notification.png";

import banner1_1_1 from "../images/banner1_1_1.png";
import banner2_2 from "../images/banner2_2.png";

import { useBadge } from "../contexts/BadgeContext";
import { toast } from "react-hot-toast";

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

type Scholarship = {
  scholarship_id: number;
  scholarship_name: string;
  start_date: string;
  end_date: string;
  url: string;
  image_url: string | null;
  is_bookmarked: boolean;
  keywords: { keyword_id: number; keyword: string }[];
};

const Main: React.FC = () => {
  const navigate = useNavigate();
  const { count, refreshCount } = useBadge();

  // 학사공지 상태
  const [topNotices, setTopNotices] = useState<Notice[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeErr, setNoticeErr] = useState<string | null>(null);

  // 장학금 공지사항 미리보기 상태
  const [schPrev, setSchPrev] = useState<ScholarshipPreview[]>([]);
  const [schLoad, setSchLoad] = useState(true);
  const [schErr, setSchErr] = useState<string | null>(null);

  // 추천 장학금 상태
  const [recommendations, setRecommendations] = useState<Scholarship[]>([]);
  const [recLoad, setRecLoad] = useState(true);
  const [recErr, setRecErr] = useState<string | null>(null);

  // 배너
  const [currentBanner, setCurrentBanner] = useState(0);
  const banners = [banner1_1_1, banner2_2];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // 학사공지 불러오기
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/notices.json");
        const list: Notice[] = await res.json();
        list.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
        setTopNotices(list.slice(0, 3));
      } catch (e: any) {
        const msg = e?.message ?? "학사공지 불러오기 실패";
        setNoticeErr(msg);
        toast.error(msg);
      } finally {
        setNoticeLoading(false);
      }
    })();
    refreshCount();
  }, []);

  // 장학금 공지 미리보기 불러오기
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          toast.error("로그인이 필요합니다.");
          navigate("/login");
          return;
        }

        const res = await fetch("http://127.0.0.1:8000/scholarships/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) throw new Error("장학금 API 요청 실패");

        const rawList = await res.json();

        const converted: ScholarshipPreview[] = rawList.map((s: any) => ({
          id: s.scholarship_id,
          title: s.scholarship_name,
          deadline: s.end_date,
          category: s.keywords?.[0]?.keyword ?? "장학",
        }));

        converted.sort((a, b) => (a.deadline > b.deadline ? 1 : -1));

        setSchPrev(converted.slice(0, 3));
      } catch (e: any) {
        const msg = e?.message ?? "장학금 불러오기 실패";
        setSchErr(msg);
        toast.error(msg);
      } finally {
        setSchLoad(false);
      }
    })();
  }, []);

  // 추천 장학금 API 불러오기
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          toast.error("로그인이 필요합니다.");
          navigate("/login");
          return;
        }

        const res = await fetch(
          "http://127.0.0.1:8000/scholarships/recommendations/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error("추천 장학금 불러오기 실패");

        const data: Scholarship[] = await res.json();
        setRecommendations(data);
      } catch (e: any) {
        const msg = e?.message ?? "추천 장학금 불러오기 오류";
        setRecErr(msg);
        toast.error(msg);
      } finally {
        setRecLoad(false);
      }
    })();
  }, []);

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      <header style={headerStyle}>
        <h2 style={{ margin: 0 }}>
          <img src={logo} alt="로고" style={{ width: "150px" }} />
        </h2>

        {/* 알림 아이콘 + 뱃지 추가 */}
        <div
          onClick={() => navigate("/notifications")}
          style={{
            cursor: "pointer",
            position: "relative",
            width: "30px",
            height: "30px",
          }}
        >
          <img src={notification} alt="알림" style={{ width: "28px" }} />

          {count > 0 && (
            <div
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                backgroundColor: "red",
                color: "white",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {count}
            </div>
          )}
        </div>
      </header>

      {/* 배너 */}
      <section style={bannerSectionStyle}>
        <div style={bannerWrapperStyle}>
          <img
            className="main-banner"
            src={banners[currentBanner]}
            alt="배너"
            style={bannerImageStyle}
          />
        </div>
      </section>

      {/* 추천 장학금 섹션 */}
      <section style={recommendCardStyle}>
        <div style={recommendHeaderStyle}>추천 장학금</div>

        <div style={{ padding: "1rem", color: "#333" }}>
          {recommendations.length === 0 && (
            <p style={recommendDescStyle}>
              조건에 맞는 장학금을 자동으로 추천합니다.
            </p>
          )}

          {recLoad && <div style={{ textAlign: "center" }}>불러오는 중…</div>}

          {!recLoad && !recErr && recommendations.length === 0 && (
            <div
              style={{ textAlign: "center", padding: "20px 0", color: "#777" }}
            >
              추천할 장학금이 아직 없습니다.
            </div>
          )}

          {!recLoad && !recErr && recommendations.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                marginTop: 12,
                display: "grid",
                gap: 12,
              }}
            >
              {recommendations.slice(0, 3).map((s) => (
                <li
                  key={s.scholarship_id}
                  onClick={() => navigate(`/recommended/${s.scholarship_id}`)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "12px",
                    backgroundColor: "#fafafa",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    cursor: "pointer",
                    transition: "0.15s",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {s.scholarship_name}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    마감 {s.end_date}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {s.keywords.map((k) => (
                      <span
                        key={k.keyword_id}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          backgroundColor: "#ffe7c8",
                          color: "#b56500",
                          borderRadius: "8px",
                        }}
                      >
                        {k.keyword}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 장학금 공지사항 */}
      <section style={scholarshipCardStyle}>
        <div style={scholarshipHeaderStyle}>장학금 공지사항</div>

        <div style={scholarshipContentStyle}>
          {schLoad && <div>불러오는 중…</div>}

          {!schLoad && !schErr && (
            <ul style={listStyle}>
              {schPrev.map((s) => (
                <li
                  key={s.id}
                  style={listItemStyle}
                  onClick={() => navigate(`/scholarship/${s.id}`)}
                >
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {s.category ?? "장학"} · 마감 {s.deadline}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button style={buttonStyle} onClick={() => navigate("/scholarship")}>
            장학금 전체 보기
          </button>
        </div>
      </section>

      {/* 학사공지 */}
      <section style={noticeCardStyle}>
        <div style={noticeHeaderStyle}>학사공지</div>

        <div style={noticeContentStyle}>
          {noticeLoading && <div>불러오는 중…</div>}

          {!noticeLoading && !noticeErr && (
            <ul style={listStyle}>
              {topNotices.map((n) => (
                <li
                  key={n.id}
                  style={listItemStyle}
                  onClick={() => navigate(`/notice/${n.id}`)}
                >
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {n.category ?? "학사"} · {n.postedAt}
                  </div>
                </li>
              ))}
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

// 스타일
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
  padding: "10px 14px",
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
  padding: "10px 14px",
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
  padding: "10px 14px",
};

const noticeContentStyle: React.CSSProperties = {
  padding: "1rem",
  color: "#333",
};

export default Main;
