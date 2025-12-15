import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import homeIcon from "../images/free-icon-home.png";
import calendarIcon from "../images/free-icon-weekly-calendar-outline-event-interface-symbol.png";
import userIcon from "../images/free-icon-user.png";
import logoutIcon from "../images/free-icon-sign-out.png";

import { useBookmark } from "../contexts/BookmarkContext";

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
  const { resetBookmarks } = useBookmark();

  const handleLogout = () => {
    resetBookmarks();

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    toast.success("로그아웃 되었습니다.");
    navigate("/login", { replace: true });
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
