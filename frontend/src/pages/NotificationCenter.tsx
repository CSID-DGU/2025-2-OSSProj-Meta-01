import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import arrowIcon from "../images/Arrow.png";

type Notification = {
  id: number;
  title: string;
  date: string;
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const dummy: Notification[] = [
      { id: 1, title: "교내장학금 신청 안내", date: "2025-10-09" },
      { id: 2, title: "학사 공지: 수강신청 마감", date: "2025-10-08" },
      { id: 3, title: "국가근로장학(2차) 신청 안내", date: "2025-10-07" },
      { id: 4, title: "졸업논문 제출 공지 (~10/30)", date: "2025-10-07" },
    ];
    setNotifications(dummy);
  }, []);

  const deleteNotification = (id: number) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const grouped = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const tKey = today.toISOString().split("T")[0];
    const yKey = yesterday.toISOString().split("T")[0];

    const groups: Record<string, Notification[]> = {
      오늘: [],
      어제: [],
      이전: [],
    };

    notifications.forEach((n) => {
      if (n.date === tKey) groups["오늘"].push(n);
      else if (n.date === yKey) groups["어제"].push(n);
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
                <div key={n.id} style={card}>
                  <div style={cardHeader}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {n.title}
                    </div>
                    <button
                      onClick={() => deleteNotification(n.id)}
                      style={deleteBtn}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={date}>{n.date}</div>
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
  transition: "transform 0.1s ease, box-shadow 0.1s ease",
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
