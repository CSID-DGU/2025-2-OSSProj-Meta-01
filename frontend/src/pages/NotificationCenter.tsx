import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import arrowIcon from "../images/Arrow.png";
import { useBadge } from "../contexts/BadgeContext";

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

  // 페이지 진입 시 배지 0으로 초기화
  useEffect(() => {
    setCount(0);
  }, [setCount]);

  // 모든 북마크 알림 조회
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      // 1) 캘린더에서 전체 bookmark_id 목록 가져오기
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

      // bookmark_id 배열
      const bookmarkIds = calendarItems.map((item) => item.bookmark_id);

      if (bookmarkIds.length === 0) {
        setNotifications([]);
        return;
      }

      // 2) 각 bookmark_id에 대해 알림 조회
      const allNotifications: NotificationItem[] = [];

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

        const notiList: NotificationItem[] = await res.json();

        // bookmark_id 추가
        const enriched = notiList.map((n) => ({
          ...n,
          bookmark_id: id,
        }));

        allNotifications.push(...enriched);
      }

      // 최신 알림 → 오래된 알림 순 정렬 (선택)
      allNotifications.sort(
        (a, b) =>
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      );

      setNotifications(allNotifications);
    } catch (e) {
      console.error("알림 불러오기 실패:", e);
    }
  };

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

      // 삭제된 알림만 즉시 제거
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    } catch (e) {
      console.error("알림 삭제 실패:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // 날짜 그룹핑
  const grouped = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const tKey = today.toISOString().split("T")[0];
    const yKey = yesterday.toISOString().split("T")[0];

    const groups: Record<string, NotificationItem[]> = {
      오늘: [],
      어제: [],
      이전: [],
    };

    notifications.forEach((n) => {
      if (n.end_date === tKey) groups["오늘"].push(n);
      else if (n.end_date === yKey) groups["어제"].push(n);
      else groups["이전"].push(n);
    });

    return groups;
  }, [notifications]);

  return (
    <>
      <div style={container}>
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

        {Object.entries(grouped).map(([label, list]) =>
          list.length > 0 ? (
            <section key={label} style={sectionCard}>
              <h3 style={sectionTitle}>{label}</h3>

              {list.map((n) => (
                <div key={n.notification_id} style={card}>
                  <div style={cardHeader}>
                    <div style={{ fontSize: 15, fontWeight: "600" }}>
                      {n.scholarship_name}
                    </div>

                    <button
                      onClick={() => deleteNotification(n.notification_id)}
                      style={deleteBtn}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={date}>마감일: {n.end_date}</div>
                  <div style={date}>알림 예정: D-{n.notification_date}</div>
                </div>
              ))}
            </section>
          ) : null
        )}

        {notifications.length === 0 && (
          <div style={empty}>새로운 알림이 없습니다.</div>
        )}
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
  marginBottom: "1rem",
};

const sectionCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  padding: "16px 18px",
  marginBottom: "1.5rem",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 14,
  color: "#111",
};

const card: React.CSSProperties = {
  background: "#fafafa",
  borderRadius: 10,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  padding: "12px 14px",
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
  marginTop: 40,
};

export default NotificationCenter;
