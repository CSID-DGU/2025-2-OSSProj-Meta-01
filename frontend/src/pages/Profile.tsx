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

  useEffect(() => {
    const saved = localStorage.getItem("profile");
    if (saved) setForm(JSON.parse(saved));

    const savedCerts = localStorage.getItem("certificates");
    if (savedCerts) setCerts(JSON.parse(savedCerts));

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
        <header style={headerStyle}>
          <img
            src={arrowIcon}
            alt="뒤로가기"
            style={arrowStyle}
            onClick={() => nav(-1)}
          />
          <img src={logo} alt="DMETA 로고" style={logoStyle} />
        </header>

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

        <section style={card}>
          <h3 style={sectionTitle}>내 자격증/어학성적</h3>
          <div style={certList}>
            {certs.length === 0 ? (
              <div style={{ fontSize: 14, color: color.sub }}>
                등록된 자격증이 없습니다.
              </div>
            ) : (
              certs.map((c, i) => (
                // @ts-ignore
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
            onClick={() => {
              if (form.name && form.date) onSave(form);
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

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

const wrap: React.CSSProperties = {
  maxWidth: 480,
  margin: "0 auto",
  padding: "20px",
  paddingBottom: "100px",
  fontFamily: "Pretendard, sans-serif",
  color: color.text,
  background: "#fff",
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
  padding: "10px 16px",
  borderRadius: 12,
  border: `1px solid ${color.orange}`,
  background: color.orange,
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 14,
};
const certList = { display: "grid", gap: 12, marginBottom: 12 };
const certItem = {
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

/* ===== Modal Styles ===== */
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

const modalInput: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  background: "#f9fafb",
  color: "#111827",
  outline: "none",
};

const modalCancel: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 10,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: 14,
  color: "#374151",
};

const modalSave: React.CSSProperties = {
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
