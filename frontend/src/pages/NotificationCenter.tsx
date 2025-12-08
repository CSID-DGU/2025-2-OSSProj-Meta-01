import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/metalogo.png";
import arrowIcon from "../images/Arrow.png";
import { useBadge } from "../contexts/BadgeContext";
import { toast } from "react-hot-toast";

type CalendarItem = {
  bookmark_id: number;
  scholarship_id: number;
  scholarship_name: string;
  end_date: string;
  doc_id?: string;
};

type NotificationItem = {
  notification_id: number;
  notification_date: number;
  scholarship_id: number;
  scholarship_name: string;
  end_date: string;
  bookmark_id: number;
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const { setCount } = useBadge();

  // 페이지 진입 시 배지 초기화
  useEffect(() => {
    setCount(0);
  }, [setCount]);

  // 알림 데이터 불러오기
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const calRes = await fetch(
        "http://127.0.0.1:8000/notification/calendar/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!calRes.ok) throw new Error("캘린더 조회 실패");

      const calendarItems: CalendarItem[] = await calRes.json();
      const bookmarkIds = calendarItems.map((item) => item.bookmark_id);

      if (bookmarkIds.length === 0) {
        setNotifications([]);
        return;
      }

      const all: NotificationItem[] = [];

      for (const id of bookmarkIds) {
        const res = await fetch(
          `http://127.0.0.1:8000/notification/bookmarks/${id}/notifications/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) continue;

        const notiList = await res.json();

        const enriched = notiList.map((n: NotificationItem) => ({
          ...n,
          bookmark_id: id,
        }));

        all.push(...enriched);
      }

      all.sort(
        (a, b) =>
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      );

      setNotifications(all);
    } catch (e) {
      console.error("알림 불러오기 실패:", e);
      toast.error("알림 정보를 불러오지 못했습니다.");
    }
  };

  // 알림 삭제
  const deleteNotification = async (id: number) => {
    try {
      const token = localStorage.getItem("accessToken");

      const res = await fetch(
        `http://127.0.0.1:8000/notification/notifications/${id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("삭제 실패");

      await res.json();

      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));

      toast.success("알림이 삭제되었습니다.");
    } catch (e) {
      console.error("알림 삭제 실패:", e);
      toast.error("알림 삭제에 실패했습니다.");
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <>
      <div style={container}>
        {/* 헤더 */}
        <header style={headerStyle}>
          <img
            src={arrowIcon}
            alt="뒤로가기"
            style={arrowStyle}
            onClick={() => navigate(-1)}
          />
          <img src={logo} alt="DMETA 로고" style={logoStyle} />
        </header>

        <h2 style={title}>알림 센터</h2>

        <p style={tip}>
          내가 추가한 알림(D-n)만 저장돼요. 기본 제공되는 D-1 알림은 자동
          발송되지만 기록되지 않아요.
        </p>

        <section style={sectionCard}>
          <h3 style={sectionTitle}>설정된 알림</h3>

          {notifications.length === 0 && (
            <div style={empty}>설정된 알림이 없습니다.</div>
          )}

          {notifications.map((n) => (
            <div key={n.notification_id} style={card}>
              <div style={cardHeader}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {n.scholarship_name}
                </div>

                <button
                  style={deleteBtn}
                  onClick={() => deleteNotification(n.notification_id)}
                >
                  ✕
                </button>
              </div>

              <div style={date}>마감일: {n.end_date}</div>
              <div style={date}>알림 예정: D-{n.notification_date}</div>
            </div>
          ))}
        </section>
      </div>

      <BottomNav />
    </>
  );
};

/* 스타일 */
const container: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "1rem",
  paddingBottom: "90px",
  fontFamily: "Pretendard, sans-serif",
  color: "#000",
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

const title: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: "0.5rem",
};

const tip: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginBottom: "1.2rem",
  lineHeight: 1.4,
};

const sectionCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  padding: "16px 18px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 14,
};

const card: React.CSSProperties = {
  background: "#fafafa",
  borderRadius: 10,
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  marginBottom: "10px",
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const deleteBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#999",
  fontSize: "16px",
};

const date: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginTop: 4,
};

const empty: React.CSSProperties = {
  textAlign: "center",
  color: "#666",
  marginTop: 20,
};

export default NotificationCenter;
