import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";
import toast from "react-hot-toast";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: studentId,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);

        toast.success("로그인 성공!");
        navigate("/main", { replace: true });
      } else {
        toast.error(
          data.error?.[0] || "로그인 실패. 아이디/비밀번호를 확인하세요."
        );
      }
    } catch (error) {
      toast.error("서버 연결에 문제가 발생했습니다.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundImage: "url('/background.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.6)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          zIndex: 2,
          textAlign: "center",
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          padding: "2rem",
          width: "320px",
        }}
      >
        <img
          src={logo}
          alt="DMETA Logo"
          style={{ width: "150px", marginBottom: "1rem" }}
        />

        <h2 style={{ marginBottom: "1.5rem", color: "#333" }}>로그인</h2>

        <input
          type="text"
          placeholder="ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          style={{
            width: "90%",
            padding: "12px",
            marginBottom: "1rem",
            borderRadius: "8px",
            border: "1px solid #ccc",
            backgroundColor: "#fff",
            outline: "none",
            color: "#333",
          }}
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "90%",
            padding: "12px",
            marginBottom: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #ccc",
            backgroundColor: "#fff",
            outline: "none",
            color: "#333",
          }}
        />

        <button
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "0.5rem",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(90deg, #FFA938 0%, #FFCFA5 100%)",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          onClick={handleLogin}
        >
          로그인하기
        </button>

        <button
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #F7931E",
            backgroundColor: "white",
            color: "#F7931E",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          onClick={() => navigate("/signup")}
        >
          회원가입하기
        </button>
      </div>
    </div>
  );
};

export default Login;
