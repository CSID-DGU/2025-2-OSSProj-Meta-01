// src/components/BottomNav.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ✅ 이미지 import (src/images 폴더 기준)
import homeIcon from "../images/free-icon-home.png";
import calendarIcon from "../images/free-icon-weekly-calendar-outline-event-interface-symbol.png";
import userIcon from "../images/free-icon-user.png";
import logoutIcon from "../images/free-icon-sign-out.png";

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  padding: "0.6rem 0",
  borderTop: "1px solid #ddd",
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "white",
  zIndex: 100,
};

const iconContainer: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  cursor: "pointer",
};

const iconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  opacity: 0.8,
  transition: "all 0.2s ease",
};

const activeIconStyle: React.CSSProperties = {
  ...iconStyle,
  opacity: 1,
  filter: "drop-shadow(0 0 3px #4facfe)",
  transform: "scale(1.05)",
};

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <footer style={footerStyle}>
      {/* 홈 */}
      <div style={iconContainer} onClick={() => navigate("/main")}>
        <img src={homeIcon} alt="홈" />
      </div>

      {/* 캘린더 */}
      <div style={iconContainer} onClick={() => navigate("/calendar")}>
        <img src={calendarIcon} alt="캘린더" />
      </div>

      {/* 프로필 */}
      <div style={iconContainer} onClick={() => navigate("/profile")}>
        <img src={userIcon} alt="프로필" />
      </div>

      {/* 로그아웃 */}
      <div
        style={iconContainer}
        onClick={() => {
          localStorage.removeItem("authToken");
          navigate("/login", { replace: true });
        }}
      >
        <img src={logoutIcon} alt="로그아웃" />
      </div>
    </footer>
  );
}
