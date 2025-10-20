import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");

  const handleNext = () => {
    if (!studentId || !password) {
      alert("ID와 비밀번호는 필수입니다.");
      return;
    }
    localStorage.setItem("studentId", studentId);
    localStorage.setItem("password", password);

    navigate("/signup-step2");
  };

  return (
    <div style={containerStyle}>
      <div style={overlayStyle} />
      <div style={cardStyle}>
        <img
          src={logo}
          alt="DMETA logo"
          style={{ width: "150px", marginBottom: "1rem" }}
        />
        <h2 style={{ marginBottom: "1.5rem", color: "#333" }}>회원가입</h2>

        <input
          type="text"
          placeholder="ID"
          style={inputStyle}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          style={inputStyle}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input type="text" placeholder="이름" style={inputStyle} />
        <input type="text" placeholder="전화번호" style={inputStyle} />
        <input type="email" placeholder="이메일" style={inputStyle} />
        <input type="text" placeholder="학과" style={inputStyle} />
        <input type="text" placeholder="학년" style={inputStyle} />
        <input type="text" placeholder="학점" style={inputStyle} />
        <input type="text" placeholder="소득분위" style={inputStyle} />

        <button style={buttonStyle} onClick={handleNext}>
          다음 단계
        </button>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#555" }}>
          이미 계정이 있으신가요?{" "}
          <span
            onClick={() => navigate("/login")}
            style={{ color: "#F7931E", fontWeight: "bold", cursor: "pointer" }}
          >
            로그인
          </span>
        </p>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  backgroundImage: "url('/background.jpeg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  position: "relative",
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(255,255,255,0.6)",
  zIndex: 1,
  pointerEvents: "none",
};

const cardStyle: React.CSSProperties = {
  zIndex: 2,
  backgroundColor: "white",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  padding: "2rem",
  width: "320px",
  textAlign: "center",
};

const inputStyle: React.CSSProperties = {
  width: "90%",
  padding: "12px",
  marginBottom: "1rem",
  borderRadius: "8px",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  outline: "none",
  color: "#333",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(90deg, #FFA938 0%, #FFCFA5 100%)",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

export default Signup;
