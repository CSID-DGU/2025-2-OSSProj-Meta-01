import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DEPARTMENT_MAP } from "../constants/departments";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import arrowIcon from "../images/Arrow.png";

type Notice = {
  id: number;
  title: string;
  postedAt: string;
  period?: string;
  college?: string;
  department?: string;
  category?: string;
  author?: string;
  url: string;
  content?: string;
};

const color = {
  text: "#111827",
  sub: "#6b7280",
  border: "#e5e7eb",
  hover: "#f9fafb",
  activeBorder: "#9ca3af",
};

const chipBtn: React.CSSProperties = {
  padding: "8px 12px",
  border: `1px solid ${color.border}`,
  borderRadius: 10,
  background: "#fff",
  cursor: "pointer",
  whiteSpace: "nowrap",
  color: color.text,
  fontSize: 13,
  transition: "all 0.15s ease",
};

const selectedChip: React.CSSProperties = {
  ...chipBtn,
  borderColor: color.activeBorder,
  fontWeight: 600,
};

export default function NoticeBoard() {
  const navigate = useNavigate();
  const [all, setAll] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"공지사항" | "학과별">("학과별");
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);
  const [depQuery, setDepQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const collegeKeys = Object.keys(DEPARTMENT_MAP);
  const [selectedCollege, setSelectedCollege] = useState<string>(
    collegeKeys[0] ?? ""
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/notices.json");
        const list: Notice[] = await res.json();
        list.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
        setAll(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const departments = useMemo(() => {
    const base = new Set<string>(DEPARTMENT_MAP[selectedCollege] ?? []);
    all.forEach((n) => {
      if (n.college === selectedCollege && n.department) base.add(n.department);
    });
    const q = depQuery.trim();
    return [...base].filter((d) => (q ? d.includes(q) : true));
  }, [all, selectedCollege, depQuery]);

  const filtered = useMemo(() => {
    if (mode !== "학과별" || selectedDeps.length === 0) return all;
    return all.filter(
      (n) => n.department && selectedDeps.includes(n.department)
    );
  }, [all, mode, selectedDeps]);

  const today = new Date();
  const normalize = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayNormalized = normalize(today);
  const monthLabel = today.toLocaleString("en-US", { month: "short" });
  const dayLabel = String(today.getDate()).padStart(2, "0");

  const todayList = useMemo(() => {
    return filtered.filter((n) => {
      const posted = new Date(n.postedAt);
      const postedNorm = normalize(posted);

      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (n.period && n.period.includes("~")) {
        const [s, e] = n.period
          .split("~")
          .map((p) => p.trim().replace(/\./g, "-"));
        startDate = s ? new Date(s) : null;
        endDate = e ? new Date(e) : null;
      }

      const isPostedToday = postedNorm.getTime() === todayNormalized.getTime();
      const isWithinPeriod =
        startDate &&
        endDate &&
        todayNormalized >= normalize(startDate) &&
        todayNormalized <= normalize(endDate);

      return isPostedToday || isWithinPeriod;
    });
  }, [filtered]);

  const toggleDept = (dep: string) => {
    setSelectedDeps((prev) =>
      prev.includes(dep) ? prev.filter((d) => d !== dep) : [...prev, dep]
    );
  };

  if (loading) return <div style={{ padding: 16 }}>불러오는 중…</div>;

  return (
    <>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <img
            src={arrowIcon}
            alt="뒤로가기"
            style={arrowStyle}
            onClick={() => navigate(-1)}
          />
          <img src={logo} alt="DMETA 로고" style={logoStyle} />
        </header>

        <h2 style={titleStyle}>학사공지 리스트</h2>

        {todayList.length > 0 && (
          <section style={todayCardStyle}>
            <div style={{ fontSize: 12, color: color.sub, marginBottom: 6 }}>
              Today
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {dayLabel} {monthLabel}
            </div>
            <ul style={todayListStyle}>
              {todayList.map((n) => (
                <li
                  key={n.id}
                  onClick={() => navigate(`/notice/${n.id}`)}
                  style={miniItemStyle}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {n.period ?? n.postedAt}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{n.title}</div>
                  {(n.college || n.department) && (
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                      {n.college ?? ""}
                      {n.college && n.department ? " · " : ""}
                      {n.department ?? ""}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section style={filterCardStyle}>
          <div style={filterHeaderRow}>
            <h3 style={sectionTitleStyle}>학과선택</h3>
            <button
              style={toggleBtnStyle}
              onClick={() => setShowFilter((v) => !v)}
            >
              {showFilter ? "접기" : "펴기"}
            </button>
          </div>

          {showFilter && (
            <>
              <div style={tabs}>
                <button
                  style={mode === "공지사항" ? tabActive : tab}
                  onClick={() => setMode("공지사항")}
                >
                  공지사항
                </button>
                <button
                  style={mode === "학과별" ? tabActive : tab}
                  onClick={() => setMode("학과별")}
                >
                  학과별 공지
                </button>
              </div>

              {mode === "학과별" && (
                <>
                  <div style={collegeRow}>
                    {collegeKeys.map((col) => (
                      <button
                        key={col}
                        onClick={() => {
                          setSelectedCollege(col);
                          setSelectedDeps([]);
                        }}
                        style={col === selectedCollege ? tabActive : tab}
                      >
                        {col}
                      </button>
                    ))}
                  </div>

                  <div style={filterInfoRow}>
                    <div style={{ fontSize: 12, color: color.sub }}>
                      {selectedCollege} | 원하는 학과를 선택하세요
                    </div>
                    <input
                      placeholder="학과 검색"
                      value={depQuery}
                      onChange={(e) => setDepQuery(e.target.value)}
                      style={searchInputStyle}
                    />
                  </div>

                  <div style={chipsGrid}>
                    {departments.map((dep) => (
                      <button
                        key={dep}
                        style={
                          selectedDeps.includes(dep) ? selectedChip : chipBtn
                        }
                        onClick={() => toggleDept(dep)}
                      >
                        {dep}
                      </button>
                    ))}
                  </div>

                  {selectedDeps.length > 0 && (
                    <div style={selectedRow}>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>
                        선택: {selectedDeps.join(", ")}
                      </div>
                      <button
                        style={clearBtn}
                        onClick={() => setSelectedDeps([])}
                      >
                        선택 해제
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>

        <section style={listCardStyle}>
          <h3 style={sectionTitleStyle}>전체 학사공지</h3>
          <ul style={listStyle}>
            {filtered.map((n) => (
              <li key={n.id} style={itemStyle}>
                <Link
                  to={`/notice/${n.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>
                    {n.title}
                  </div>
                  <div style={metaStyle}>
                    {n.college ?? "-"} / {n.department ?? "-"} ·{" "}
                    {n.category ?? "공지"}
                  </div>
                  <div style={{ fontSize: 11, color: color.sub, marginTop: 2 }}>
                    {n.period ?? n.postedAt}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <BottomNav />
    </>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "1rem",
  paddingBottom: "90px",
  fontFamily: "Pretendard, sans-serif",
  color: color.text,
  backgroundColor: "#fff",
};

const headerStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 0 16px",
  marginBottom: "1rem",
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

const titleStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: 700,
  marginBottom: "0.8rem",
};

const todayCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 1px 5px rgba(0,0,0,0.05)",
  marginBottom: 16,
};
const todayListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  marginTop: 10,
  display: "grid",
  gap: 6,
};
const miniItemStyle: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${color.border}`,
  borderRadius: 10,
  padding: 10,
  cursor: "pointer",
  transition: "background 0.15s ease",
};
// @ts-ignore
miniItemStyle[":hover" as any] = { background: color.hover };

const filterCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 1px 5px rgba(0,0,0,0.05)",
  marginBottom: 16,
};
const filterHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const toggleBtnStyle: React.CSSProperties = {
  padding: "5px 10px",
  border: `1px solid ${color.border}`,
  borderRadius: 8,
  background: "#fff",
  cursor: "pointer",
  color: "#111",
  fontSize: 12,
};
// @ts-ignore
toggleBtnStyle[":hover" as any] = { background: color.hover };

const tabs: React.CSSProperties = {
  display: "flex",
  gap: 8,
  borderBottom: `1px solid ${color.border}`,
  paddingBottom: 8,
  flexWrap: "wrap",
  marginTop: 8,
};
const tab: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${color.border}`,
  background: "#fff",
  cursor: "pointer",
  color: color.text,
  fontSize: 13,
};
// @ts-ignore
tab[":hover" as any] = { background: color.hover };
const tabActive: React.CSSProperties = {
  ...tab,
  borderColor: color.activeBorder,
  fontWeight: 600,
};

const collegeRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  margin: "8px 0",
};
const filterInfoRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "8px 0",
  gap: 8,
};
const searchInputStyle: React.CSSProperties = {
  width: 200,
  padding: "6px 8px",
  border: `1px solid ${color.border}`,
  borderRadius: 8,
  outline: "none",
  fontSize: 13,
};
// @ts-ignore
searchInputStyle[":focus" as any] = { borderColor: color.activeBorder };

const chipsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
  gap: 6,
};
const clearBtn: React.CSSProperties = {
  padding: "5px 8px",
  border: `1px solid ${color.border}`,
  borderRadius: 8,
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
  color: color.sub,
};
const selectedRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 6,
};
const listCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  boxShadow: "0 1px 5px rgba(0,0,0,0.05)",
  padding: 14,
};
const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: "15px",
  fontWeight: 700,
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 8,
};
const itemStyle: React.CSSProperties = {
  border: `1px solid ${color.border}`,
  borderRadius: 10,
  padding: 12,
  background: "#fff",
  transition: "background 0.15s ease",
  cursor: "pointer",
};
// @ts-ignore
itemStyle[":hover" as any] = { background: color.hover };
const metaStyle: React.CSSProperties = {
  fontSize: 12,
  color: color.sub,
};
