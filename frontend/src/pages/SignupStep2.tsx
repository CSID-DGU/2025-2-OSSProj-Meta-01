import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";

const SignupStep2: React.FC = () => {
  const navigate = useNavigate();
  const [agree, setAgree] = useState(false);
  const [channel, setChannel] = useState("");
  const [university, setUniversity] = useState("");

  const handleSignup = () => {
    if (!agree || !channel || !university) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    alert("회원가입이 완료되었습니다!");
    navigate("/login");
  };

  return (
    <div style={containerStyle}>
      <div style={overlayStyle} />
      <div style={cardStyle}>
        <img
          src={logo}
          alt="DMETA logo"
          style={{
            width: "150px",
            margin: "0 auto 1rem auto",
            display: "block",
          }}
        />
        <h2 style={{ marginBottom: "1.5rem", color: "#333" }}>회원가입</h2>

        <div style={{ marginBottom: "1.5rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.9rem", color: "#333" }}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            선택 | 알림 수신에 동의합니다.
          </label>
        </div>

        <label style={labelStyle}>
          <span style={required}>필수</span> 알림 수신 채널
        </label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          style={selectStyle}
        >
          <option value="">채널을 선택하세요</option>
          <option value="sms">문자</option>
          {/* <option value="email">이메일</option> */}
        </select>

        <label style={labelStyle}>
          <span style={required}>필수</span> 대학교 선택
        </label>
        <select
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          style={selectStyle}
        >
          <option value="">학교를 선택하세요</option>
          <option value="dongguk">동국대학교</option>
          <option value="snu">서울대학교</option>
          <option value="yonsei">연세대학교</option>
        </select>

        <div style={{ marginTop: "1.5rem" }}>
          <button style={buttonStyle} onClick={handleSignup}>
            가입하기
          </button>

          <button style={backButtonStyle} onClick={() => navigate("/signup")}>
            이전 단계
          </button>
        </div>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#555" }}>
          이미 계정이 있으신가요?{" "}
          <span
            onClick={() => navigate("/login")}
            style={{
              color: "#F7931E",
              fontWeight: "bold",
              cursor: "pointer",
            }}
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
  minHeight: "100vh",
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
  minHeight: "600px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  textAlign: "left",
  fontSize: "0.9rem",
  marginBottom: "0.3rem",
  color: "#333",
};

const required: React.CSSProperties = {
  color: "#F7931E",
  marginRight: "4px",
  fontWeight: "bold",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
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

const backButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  marginTop: "0.6rem",
  borderRadius: "8px",
  border: "1px solid #F7931E",
  backgroundColor: "white",
  color: "#F7931E",
  fontWeight: "bold",
  cursor: "pointer",
};

export default SignupStep2;
