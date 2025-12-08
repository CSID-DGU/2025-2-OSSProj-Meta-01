import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../images/logo.png";
import { toast } from "react-hot-toast";

const SignupStep2: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [agree, setAgree] = useState(false);
  const [channel, setChannel] = useState("");
  const [university, setUniversity] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 필드 검증 로직 수정
  const validateFields = () => {
    const newErrors: Record<string, string> = {};

    // 알림 수신 동의한 경우에만 채널 필수
    if (agree && !channel.trim()) {
      newErrors.channel = "알림 수신 채널을 선택해주세요.";
    }

    // 대학은 항상 필수
    if (!university.trim()) {
      newErrors.university = "대학교를 선택해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!state) {
      toast.error("회원가입 정보가 누락되었습니다. 다시 진행해주세요.");
      navigate("/signup");
      return;
    }

    if (!validateFields()) return;

    const finalData = {
      id: state.id,
      password: state.password,
      user_name: state.user_name,
      phone: state.phone,
      email: state.email,
      major: state.major,
      year: state.year,
      gpa: state.gpa,
      income_level: state.income_level,
      receive_notifications: agree,
      notification_channel: agree ? channel : null,
      university: university,
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("회원가입이 완료되었습니다!");
        navigate("/login");
      } else {
        const messages = Object.values(data).flat().join("\n");
        toast.error(messages || "회원가입에 실패했습니다.");
      }
    } catch (error) {
      toast.error("서버와 연결할 수 없습니다.");
    }
  };

  // 동적으로 border 에러 색
  const selectWithError = (field: string) => ({
    ...selectStyle,
    border: errors[field] ? "1px solid red" : "1px solid #ccc",
  });

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

        {/* 알림 동의 체크 */}
        <div style={{ marginBottom: "1.5rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.9rem", color: "#333" }}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);

                // 체크 해제 시 채널 필수 아님 → 기존 에러 제거
                if (!e.target.checked) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.channel;
                    return copy;
                  });
                }
              }}
              style={{ marginRight: "8px" }}
            />
            선택 | 알림 수신에 동의합니다.
          </label>
        </div>

        {/* 알림 수신 채널 (조건부 필수) */}
        <label style={labelStyle}>
          {agree && <span style={required}>필수</span>}
          알림 수신 채널
        </label>

        <select
          value={agree ? channel : ""}
          disabled={!agree}
          onChange={(e) => {
            setChannel(e.target.value);
            setErrors((prev) => ({ ...prev, channel: "" }));
          }}
          style={{
            ...selectWithError("channel"),
            backgroundColor: !agree ? "#f5f5f5" : "#fff",
            color: !agree ? "#bbb" : channel ? "#333" : "#888",
          }}
        >
          <option value="">채널을 선택하세요</option>
          <option value="sms">문자</option>
        </select>

        {/* 동의했을 때만 에러 표시 */}
        {agree && errors.channel && <p style={errorText}>{errors.channel}</p>}

        {/* 대학교 선택 (항상 필수) */}
        <label style={labelStyle}>
          <span style={required}>필수</span> 대학교 선택
        </label>

        <select
          value={university}
          onChange={(e) => {
            setUniversity(e.target.value);
            setErrors((prev) => ({ ...prev, university: "" }));
          }}
          style={{
            ...selectWithError("university"),
            color: university ? "#333" : "#888",
          }}
        >
          <option value="">학교를 선택하세요</option>
          <option value="dongguk">동국대학교</option>
          <option value="snu">서울대학교</option>
          <option value="yonsei">연세대학교</option>
        </select>
        {errors.university && <p style={errorText}>{errors.university}</p>}

        <div style={{ marginTop: "1.5rem" }}>
          <button style={buttonStyle} onClick={handleSignup}>
            가입하기
          </button>

          <button
            style={backButtonStyle}
            onClick={() =>
              navigate("/signup", {
                state: {
                  ...state,
                  agree: agree,
                  channel: channel,
                  university: university,
                },
              })
            }
          >
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

/* 스타일 */
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
  marginBottom: "0.4rem",
  borderRadius: "8px",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  outline: "none",
  color: "#888",
};

const errorText: React.CSSProperties = {
  color: "red",
  fontSize: "0.75rem",
  textAlign: "left",
  marginBottom: "0.8rem",
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
