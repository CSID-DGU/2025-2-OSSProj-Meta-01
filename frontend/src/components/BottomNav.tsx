import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

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

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    const access = localStorage.getItem("accessToken");
    const refresh = localStorage.getItem("refreshToken");

    if (!access || !refresh) {
      alert("로그인 정보가 없습니다.");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/logout/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          refresh: refresh,
        }),
      });

      if (response.ok) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        alert("로그아웃 완료!");
        navigate("/login", { replace: true });
      } else {
        const errorData = await response.json();
        alert(errorData.error || "로그아웃 실패");
      }
    } catch (error) {
      alert("서버 연결에 문제가 발생했습니다.");
    }
  };

  return (
    <footer style={footerStyle}>
      <div style={iconContainer} onClick={() => navigate("/main")}>
        <img src={homeIcon} alt="홈" />
      </div>

      <div style={iconContainer} onClick={() => navigate("/calendar")}>
        <img src={calendarIcon} alt="캘린더" />
      </div>

      <div style={iconContainer} onClick={() => navigate("/profile")}>
        <img src={userIcon} alt="프로필" />
      </div>

      <div style={iconContainer} onClick={handleLogout}>
        <img src={logoutIcon} alt="로그아웃" />
      </div>
    </footer>
  );
}
