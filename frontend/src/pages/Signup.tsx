import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../images/logo.png";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // Step2 → Step1 에서 전달된 state

  // Step1 입력값을 state 기반으로 초기화(되돌아왔을 때 값 유지됨)
  const [id, setId] = useState(state?.id || "");
  const [password, setPassword] = useState(state?.password || "");
  const [userName, setUserName] = useState(state?.user_name || "");
  const [phone, setPhone] = useState(state?.phone || "");
  const [email, setEmail] = useState(state?.email || "");
  const [major, setMajor] = useState(state?.major?.toString() || "");
  const [year, setYear] = useState(state?.year || "");
  const [gpa, setGpa] = useState(state?.gpa?.toString() || "");
  const [incomeLevel, setIncomeLevel] = useState(state?.income_level || "");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateFields = () => {
    const newErrors: Record<string, string> = {};

    if (!id.trim()) newErrors.id = "ID를 입력해주세요.";
    if (password.length < 6)
      newErrors.password = "비밀번호는 6자 이상이어야 합니다.";
    if (!userName.trim()) newErrors.userName = "이름을 입력해주세요.";
    if (!/^[0-9]{10,11}$/.test(phone))
      newErrors.phone = "전화번호는 숫자 10~11자리여야 합니다.";
    if (!email.includes("@"))
      newErrors.email = "올바른 이메일 형식이 아닙니다.";
    if (!major.trim() || isNaN(Number(major)))
      newErrors.major = "학과 번호는 숫자로 입력해주세요.";
    if (!year.trim()) newErrors.year = "학년을 입력해주세요.";

    if (!gpa.trim()) newErrors.gpa = "학점을 입력해주세요.";
    else if (isNaN(Number(gpa)))
      newErrors.gpa = "학점은 숫자 형식으로 입력해주세요.";
    else {
      const num = Number(gpa);
      if (num < 0 || num > 4.5)
        newErrors.gpa = "학점은 0~4.50 사이여야 합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateFields()) return;

    const signupData: any = {
      id,
      password,
      user_name: userName,
      phone,
      email,
      major: Number(major),
      year,
      gpa: Number(gpa),
    };

    if (incomeLevel.trim() !== "") {
      signupData.income_level = incomeLevel;
    }

    // ★ replace 제거 (state 날아가는 문제 해결)
    navigate("/signup-step2", { state: signupData });
  };

  const inputWithError = (field: string) => ({
    ...inputStyle,
    border: errors[field] ? "1px solid red" : "1px solid #ccc",
  });

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

        <div style={{ width: "100%" }}>
          <input
            type="text"
            placeholder="ID"
            style={inputWithError("id")}
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          {errors.id && <p style={errorText}>{errors.id}</p>}

          <input
            type="password"
            placeholder="비밀번호"
            style={inputWithError("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <p style={errorText}>{errors.password}</p>}

          <input
            type="text"
            placeholder="이름"
            style={inputWithError("userName")}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          {errors.userName && <p style={errorText}>{errors.userName}</p>}

          <input
            type="text"
            placeholder="전화번호"
            style={inputWithError("phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && <p style={errorText}>{errors.phone}</p>}

          <input
            type="email"
            placeholder="이메일"
            style={inputWithError("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p style={errorText}>{errors.email}</p>}

          <input
            type="text"
            placeholder="학과 번호 (예: 1)"
            style={inputWithError("major")}
            value={major}
            onChange={(e) => setMajor(e.target.value)}
          />
          {errors.major && <p style={errorText}>{errors.major}</p>}

          <input
            type="text"
            placeholder="학년 (예: 2)"
            style={inputWithError("year")}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          {errors.year && <p style={errorText}>{errors.year}</p>}

          <input
            type="text"
            placeholder="학점 (예: 3.0)"
            style={inputWithError("gpa")}
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
          />
          {errors.gpa && <p style={errorText}>{errors.gpa}</p>}

          <select
            value={incomeLevel}
            onChange={(e) => setIncomeLevel(e.target.value)}
            style={{
              ...inputWithError("incomeLevel"),
              width: "100%",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "0.4rem",
              color: incomeLevel ? "#333" : "#888",
            }}
          >
            <option value="">소득분위 (선택 없음)</option>
            <option value="1분위">1분위</option>
            <option value="2분위">2분위</option>
            <option value="3분위">3분위</option>
            <option value="4분위">4분위</option>
            <option value="5분위">5분위</option>
            <option value="6분위">6분위</option>
            <option value="7분위">7분위</option>
            <option value="8분위">8분위</option>
            <option value="9분위">9분위</option>
            <option value="10분위">10분위</option>
          </select>

          <button style={buttonStyle} onClick={handleNext}>
            다음 단계
          </button>

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
  maxHeight: "80vh",
  overflowY: "auto",
};

const inputStyle: React.CSSProperties = {
  width: "90%",
  padding: "12px",
  marginBottom: "0.4rem",
  borderRadius: "8px",
  backgroundColor: "#fff",
  outline: "none",
  color: "#333",
};

const errorText: React.CSSProperties = {
  color: "red",
  fontSize: "0.75rem",
  textAlign: "left",
  marginBottom: "0.8rem",
  marginLeft: "5%",
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
