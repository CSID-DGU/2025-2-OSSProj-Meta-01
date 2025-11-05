import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import arrowIcon from "../images/Arrow.png";
import { useBookmark } from "../contexts/BookmarkContext";

type Profile = {
  name: string;
  major: string;
  grade: string;
  gpa: string;
  incomeLevel: string;
};

type ScholarshipItem = {
  id: number;
  title: string;
  provider: string;
  deadline: string;
  amount?: string;
  category: "교내" | "국가" | "외부";
  url?: string;
};

type Certificate = {
  name: string;
  date: string;
  score?: string;
};

type Keyword = {
  name: string;
  active: boolean;
};

const color = {
  orange: "#f97316",
  text: "#111827",
  sub: "#6b7280",
  border: "#e5e7eb",
  card: "#ffffff",
};

const catColor = (c: "교내" | "국가" | "외부") =>
  c === "교내" ? "#3b82f6" : c === "국가" ? "#10b981" : "#a78bfa";

const ProfilePage: React.FC = () => {
  const nav = useNavigate();
  const { bookmarks, toggleBookmark } = useBookmark();

  const [form, setForm] = useState<Profile>({
    name: "",
    major: "",
    grade: "1",
    gpa: "",
    incomeLevel: "",
  });

  const [schBase, setSchBase] = useState<ScholarshipItem[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [showModal, setShowModal] = useState(false);

  // ✅ 관심 키워드 상태
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const adminDefault: Keyword[] = [
      { name: "교내장학", active: true },
      { name: "교외장학", active: true },
      { name: "국가장학", active: true },
      { name: "등록금지원", active: true },
      { name: "생활비지원", active: true },
      { name: "이공계", active: true },
      { name: "인문계", active: true },
      { name: "예체능", active: true },
      { name: "봉사", active: true },
      { name: "성적우수", active: true },
      { name: "저소득층", active: true },
      { name: "기업연계", active: true },
      { name: "자격증", active: true },
      { name: "종교", active: true },
    ];

    const saved = localStorage.getItem("keywords");
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setKeywords(adminDefault);
        localStorage.setItem("keywords", JSON.stringify(adminDefault));
      } else {
        setKeywords(parsed);
      }
    } catch {
      setKeywords(adminDefault);
      localStorage.setItem("keywords", JSON.stringify(adminDefault));
    }

    // ✅ 프로필 및 자격증 로드
    const savedProfile = localStorage.getItem("profile");
    if (savedProfile) setForm(JSON.parse(savedProfile));

    const savedCerts = localStorage.getItem("certificates");
    if (savedCerts) setCerts(JSON.parse(savedCerts));

    // ✅ 장학 데이터 로드
    (async () => {
      try {
        const res = await fetch("/api/scholarships.json");
        const list: ScholarshipItem[] = await res.json();
        setSchBase(list);
      } catch (e) {
        console.error("장학금 목록 로드 실패:", e);
      }
    })();
  }, []);

  const handleToggle = (kwName: string) => {
    if (!editing) return;
    setKeywords((prev) =>
      prev.map((k) => (k.name === kwName ? { ...k, active: !k.active } : k))
    );
  };

  const handleCancel = () => {
    const saved = localStorage.getItem("keywords");
    if (saved) setKeywords(JSON.parse(saved));
    setEditing(false);
  };

  const handleSave = () => {
    localStorage.setItem("keywords", JSON.stringify(keywords));
    setEditing(false);
  };

  const handleAddCert = (cert: Certificate) => {
    const updated = [...certs, cert];
    setCerts(updated);
    localStorage.setItem("certificates", JSON.stringify(updated));
    setShowModal(false);
  };

  const schRows = useMemo(
    () =>
      schBase
        .filter((s) => bookmarks.includes(s.id))
        .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [schBase, bookmarks]
  );

  return (
    <>
      <div style={wrap}>
        {/* ===== Header ===== */}
        <header style={headerStyle}>
          <img
            src={arrowIcon}
            alt="뒤로가기"
            style={arrowStyle}
            onClick={() => nav(-1)}
          />
          <img src={logo} alt="DMETA 로고" style={logoStyle} />
        </header>

        {/* ===== 내 정보 ===== */}
        <section style={card}>
          <h3 style={sectionTitle}>내 정보</h3>
          <div style={formWrap}>
            <Input label="이름" value={form.name} placeholder="홍길동" />
            <Input
              label="학과"
              value={form.major}
              placeholder="예: 산업시스템공학과"
            />
            <Input label="학년" value={form.grade} placeholder="예: 4학년" />
            <Input label="GPA" value={form.gpa} placeholder="예: 3.80" />
            <Input
              label="소득분위"
              value={form.incomeLevel}
              placeholder="예: 4분위"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button style={editBtn}>편집</button>
          </div>
        </section>

        {/* ===== 내 관심 키워드 ===== */}
        <section style={card}>
          <h3 style={sectionTitle}>내 관심 키워드</h3>

          {/* 키워드 목록 */}
          <div
            style={{
              minHeight: 80,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {keywords.map((kw, i) => (
              <div
                key={i}
                onClick={() => handleToggle(kw.name)}
                style={{
                  background: kw.active ? "#f7b787" : "#f3f4f6",
                  color: kw.active ? "#fff" : "#9ca3af",
                  borderRadius: 20,
                  padding: "6px 10px",
                  fontSize: 14,
                  fontWeight: 500,
                  border: kw.active ? "1px solid #F97316" : "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: editing ? "pointer" : "default",
                  transition: "all 0.2s ease",
                }}
              >
                #{kw.name}
              </div>
            ))}
          </div>

          {/* 버튼 그룹 (항상 하단 오른쪽 정렬) */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 10,
            }}
          >
            {editing ? (
              <>
                <button style={cancelBtn} onClick={handleCancel}>
                  취소
                </button>
                <button style={saveBtn} onClick={handleSave}>
                  저장
                </button>
              </>
            ) : (
              <button style={editBtn} onClick={() => setEditing(true)}>
                편집
              </button>
            )}
          </div>
        </section>

        {/* ===== 자격증 ===== */}
        <section style={card}>
          <h3 style={sectionTitle}>내 자격증/어학성적</h3>
          <div style={certList}>
            {certs.length === 0 ? (
              <div style={{ fontSize: 14, color: color.sub }}>
                등록된 자격증이 없습니다.
              </div>
            ) : (
              certs.map((c, i) => (
                <div key={i} style={certItem}>
                  <strong>{c.name}</strong>
                  <span style={certText}>
                    취득일: {c.date}
                    {c.score && ` / 점수: ${c.score}`}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={addCert} onClick={() => setShowModal(true)}>
            + 자격증 추가
          </div>
        </section>

        {/* ===== 북마크 관리 ===== */}
        <section style={card}>
          <div style={sectionTop}>
            <h3 style={sectionTitle}>북마크 관리</h3>
            <span style={badge}>장학금 {schRows.length}건</span>
          </div>
          <div style={listWrap}>
            {schRows.length === 0 ? (
              <div style={{ fontSize: 14, color: color.sub }}>
                북마크된 장학금이 없습니다.
              </div>
            ) : (
              schRows.map((s) => (
                <div key={s.id} style={bookmarkItem}>
                  <div style={bookmarkLeft}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: catColor(s.category),
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.title}</div>
                      <div style={metaText}>
                        {s.category} · 마감 {s.deadline} · {s.provider}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {s.url && (
                      <button
                        style={miniBtn}
                        onClick={() => window.open(s.url!, "_blank")}
                      >
                        공고 보기
                      </button>
                    )}
                    <button
                      style={miniBtn}
                      onClick={() => toggleBookmark(s.id)}
                    >
                      북마크 해제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ===== 계정 ===== */}
        <section style={card}>
          <h3 style={sectionTitle}>계정</h3>
          <button style={logoutBtn}>회원탈퇴</button>
        </section>
      </div>

      <BottomNav />

      {showModal && (
        <AddCertModal
          onClose={() => setShowModal(false)}
          onSave={handleAddCert}
        />
      )}
    </>
  );
};

/* ------------------- Sub Components ------------------- */
const Input: React.FC<{
  label: string;
  value: string;
  placeholder: string;
}> = ({ label, value, placeholder }) => (
  <label style={{ display: "grid", gap: 4 }}>
    <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
    <input
      value={value}
      placeholder={placeholder}
      readOnly
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "10px",
        height: 42,
        background: "#fff",
        outline: "none",
        color: "#111827",
      }}
    />
  </label>
);

const AddCertModal: React.FC<{
  onClose: () => void;
  onSave: (c: Certificate) => void;
}> = ({ onClose, onSave }) => {
  const [form, setForm] = useState<Certificate>({
    name: "",
    date: "",
    score: "",
  });

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h3 style={modalTitle}>자격증 추가</h3>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e7eb",
            margin: "12px 0 16px 0",
          }}
        />
        <div style={{ display: "grid", gap: 12 }}>
          <input
            placeholder="자격증 이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={modalInput}
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={modalInput}
          />
          <input
            placeholder="점수 (선택)"
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
            style={modalInput}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button style={modalCancel} onClick={onClose}>
            취소
          </button>
          <button
            style={modalSave}
            onClick={() => form.name && form.date && onSave(form)}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------- Styles ------------------- */
const wrap: React.CSSProperties = {
  maxWidth: 480,
  margin: "0 auto",
  padding: "20px",
  paddingBottom: "100px",
  fontFamily: "Pretendard, sans-serif",
  color: color.text,
  background: "#fff",
};

const headerStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 0 16px",
  marginBottom: 20,
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

const card = {
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  padding: 20,
  marginBottom: 26,
  border: `1px solid ${color.border}`,
};

const sectionTitle = { fontSize: 16, fontWeight: 700, marginBottom: 14 };
const sectionTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};
const formWrap = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 14,
};
const editBtn = {
  padding: "8px 16px",
  borderRadius: 10,
  border: `1.5px solid ${color.orange}`,
  background: color.orange,
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const cancelBtn = {
  padding: "8px 16px",
  borderRadius: 10,
  border: `1.5px solid ${color.orange}`,
  background: "#fff",
  color: color.orange,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const saveBtn = {
  ...editBtn,
};

const certList = { display: "grid", gap: 12, marginBottom: 12 };
const certItem: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  borderBottom: `1px solid ${color.border}`,
  paddingBottom: 8,
};
const certText = { fontSize: 13, color: "#374151", marginTop: 2 };
const addCert = {
  color: color.orange,
  fontSize: 14,
  fontWeight: 600,
  marginTop: 12,
  cursor: "pointer",
};
const badge = {
  fontSize: 12,
  border: `1px solid ${color.border}`,
  borderRadius: 999,
  padding: "4px 10px",
};
const listWrap = { display: "grid", gap: 10 };
const bookmarkItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: `1px solid ${color.border}`,
  borderRadius: 14,
  padding: "12px 14px",
};
const bookmarkLeft = { display: "flex", alignItems: "center", gap: 8 };
const metaText = { fontSize: 12, color: color.sub, marginTop: 2 };
const miniBtn = {
  padding: "6px 10px",
  borderRadius: 999,
  border: `1px solid ${color.border}`,
  background: "white",
  fontSize: 12,
  cursor: "pointer",
  color: "#000",
};
const logoutBtn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: `1px solid ${color.border}`,
  background: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  color: "#000",
};
const modalOverlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.25)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalBox: React.CSSProperties = {
  background: "#fff",
  padding: "24px 24px 28px 24px",
  borderRadius: 16,
  width: 340,
  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
};

const modalTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#111827",
  textAlign: "center",
};
const modalInput = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  background: "#f9fafb",
  color: "#111827",
  outline: "none",
};
const modalCancel = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 10,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: 14,
  color: "#374151",
};
const modalSave = {
  border: "none",
  background: color.orange,
  color: "#fff",
  borderRadius: 10,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

export default ProfilePage;
