import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../images/logo.png";

export const majorOptions = [
  { major_id: 1, major_name: "불교학과" },
  { major_id: 2, major_name: "문화유산학과" },
  { major_id: 3, major_name: "국어국문문예창작학부" },
  { major_id: 4, major_name: "영어영문학부" },
  { major_id: 5, major_name: "일본학과" },
  { major_id: 6, major_name: "중어중문학과" },
  { major_id: 7, major_name: "철학과" },
  { major_id: 8, major_name: "사학과" },
  { major_id: 9, major_name: "수학과" },
  { major_id: 10, major_name: "화학과" },
  { major_id: 11, major_name: "통계학과" },
  { major_id: 12, major_name: "물리반도체과학부" },
  { major_id: 13, major_name: "물리학과" },
  { major_id: 14, major_name: "법학과" },
  { major_id: 15, major_name: "정치외교학전공" },
  { major_id: 16, major_name: "행정학전공" },
  { major_id: 17, major_name: "북한학전공" },
  { major_id: 18, major_name: "경제학과" },
  { major_id: 19, major_name: "국제통상학과" },
  { major_id: 20, major_name: "사회학전공" },
  { major_id: 21, major_name: "미디어커뮤니케이션학전공" },
  { major_id: 22, major_name: "식품산업관리학과" },
  { major_id: 23, major_name: "광고홍보학과" },
  { major_id: 24, major_name: "사회복지학과" },
  { major_id: 25, major_name: "경찰행정학부" },
  { major_id: 26, major_name: "경영학과" },
  { major_id: 27, major_name: "회계학과" },
  { major_id: 28, major_name: "경영정보학과" },
  { major_id: 29, major_name: "바이오환경과학과" },
  { major_id: 30, major_name: "생명과학과" },
  { major_id: 31, major_name: "식품생명공학과" },
  { major_id: 32, major_name: "의생명공학과" },
  { major_id: 33, major_name: "전자전기공학부" },
  { major_id: 34, major_name: "정보통신공학과" },
  { major_id: 35, major_name: "건설환경공학과" },
  { major_id: 36, major_name: "화공생물공학과" },
  { major_id: 37, major_name: "기계로봇에너지공학과" },
  { major_id: 38, major_name: "건축공학부" },
  { major_id: 39, major_name: "산업시스템공학과" },
  { major_id: 40, major_name: "에너지신소재공학과" },
  { major_id: 41, major_name: "컴퓨터AI학부" },
  { major_id: 42, major_name: "시스템반도체학부" },
  { major_id: 43, major_name: "의료인공지능공학과" },
  { major_id: 44, major_name: "지능형네트워크융합학과" },
  { major_id: 45, major_name: "지능IoT학과" },
  { major_id: 46, major_name: "교육학과" },
  { major_id: 47, major_name: "국어교육과" },
  { major_id: 48, major_name: "역사교육과" },
  { major_id: 49, major_name: "지리교육과" },
  { major_id: 50, major_name: "수학교육과" },
  { major_id: 51, major_name: "가정교육과" },
  { major_id: 52, major_name: "체육교육과" },
  { major_id: 53, major_name: "미술학부" },
  { major_id: 54, major_name: "연극학부" },
  { major_id: 55, major_name: "영화영상학과" },
  { major_id: 56, major_name: "스포츠문화학과" },
  { major_id: 57, major_name: "한국음악과" },
  { major_id: 58, major_name: "약학과" },
  { major_id: 59, major_name: "융합보안학과" },
  { major_id: 60, major_name: "사회복지상담학과" },
  { major_id: 61, major_name: "글로벌무역학과" },
  { major_id: 62, major_name: "다르마칼리지" },
  { major_id: 63, major_name: "열린전공학부" },
];

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

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

    if (!major.trim()) newErrors.major = "학과를 선택해주세요.";
    if (!year.trim()) newErrors.year = "학년을 선택해주세요.";

    if (!gpa.trim()) newErrors.gpa = "학점을 입력해주세요.";
    else if (isNaN(Number(gpa)))
      newErrors.gpa = "학점은 숫자 형식으로 입력해주세요.";
    else {
      const num = Number(gpa);
      if (num < 0 || num > 4.5)
        newErrors.gpa = "학점은 0~4.50 사이여야 합니다.";
    }

    // 🔥 추가된 부분: 소득분위 필수 처리
    if (!incomeLevel.trim()) newErrors.incomeLevel = "소득분위를 선택해주세요.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const inputWithError = (field: string) => ({
    ...inputStyle,
    border: errors[field] ? "1px solid red" : "1px solid #ccc",
  });

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
      income_level: incomeLevel, // 🔥 필수값이라 조건문 제거
    };

    navigate("/signup-step2", { state: signupData });
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

        <div style={{ width: "100%" }}>
          <input
            type="text"
            placeholder="ID"
            style={inputWithError("id")}
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setErrors((prev) => ({ ...prev, id: "" }));
            }}
          />
          {errors.id && <p style={errorText}>{errors.id}</p>}

          <input
            type="password"
            placeholder="비밀번호"
            style={inputWithError("password")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: "" }));
            }}
          />
          {errors.password && <p style={errorText}>{errors.password}</p>}

          <input
            type="text"
            placeholder="이름"
            style={inputWithError("userName")}
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              setErrors((prev) => ({ ...prev, userName: "" }));
            }}
          />
          {errors.userName && <p style={errorText}>{errors.userName}</p>}

          <input
            type="text"
            placeholder="전화번호"
            style={inputWithError("phone")}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErrors((prev) => ({ ...prev, phone: "" }));
            }}
          />
          {errors.phone && <p style={errorText}>{errors.phone}</p>}

          <input
            type="email"
            placeholder="이메일"
            style={inputWithError("email")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: "" }));
            }}
          />
          {errors.email && <p style={errorText}>{errors.email}</p>}

          <select
            value={major}
            onChange={(e) => {
              setMajor(e.target.value);
              setErrors((prev) => ({ ...prev, major: "" }));
            }}
            style={{
              ...inputWithError("major"),
              width: "100%",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "0.4rem",
              color: major ? "#333" : "#888",
            }}
          >
            <option value="">학과 선택</option>
            {majorOptions.map((m) => (
              <option key={m.major_id} value={m.major_id}>
                {m.major_name}
              </option>
            ))}
          </select>
          {errors.major && <p style={errorText}>{errors.major}</p>}

          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setErrors((prev) => ({ ...prev, year: "" }));
            }}
            style={{
              ...inputWithError("year"),
              width: "100%",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "0.4rem",
              color: year ? "#333" : "#888",
            }}
          >
            <option value="">학년 선택</option>
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
            <option value="4">4학년</option>
            <option value="5">5학년</option>
            <option value="6">6학년</option>
          </select>
          {errors.year && <p style={errorText}>{errors.year}</p>}

          <input
            type="text"
            placeholder="학점 (예: 3.0)"
            style={inputWithError("gpa")}
            value={gpa}
            onChange={(e) => {
              setGpa(e.target.value);
              setErrors((prev) => ({ ...prev, gpa: "" }));
            }}
          />
          {errors.gpa && <p style={errorText}>{errors.gpa}</p>}

          {/* 소득분위 영역 */}
          <select
            value={incomeLevel}
            onChange={(e) => {
              setIncomeLevel(e.target.value);
              setErrors((prev) => ({ ...prev, incomeLevel: "" }));
            }}
            style={{
              ...inputWithError("incomeLevel"),
              width: "100%",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "0.4rem",
              color: incomeLevel ? "#333" : "#888",
            }}
          >
            <option value="">소득분위 선택</option>
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
          {errors.incomeLevel && <p style={errorText}>{errors.incomeLevel}</p>}

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
