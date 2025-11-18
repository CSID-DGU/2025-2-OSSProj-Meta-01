import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import arrowIcon from "../images/Arrow.png";
import { useBookmark } from "../contexts/BookmarkContext";

type Item = {
  id: number;
  title: string;
  deadline: string;
  category: "교내" | "국가" | "외부";
  provider?: string;
  url?: string;
};

const CAT_COLOR: Record<Item["category"], string> = {
  교내: "#3b82f6",
  국가: "#10b981",
  외부: "#a78bfa",
};

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function buildMonthGrid(base: Date) {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function ScholarshipCalendar() {
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useBookmark();
  const [all, setAll] = useState<Item[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [selectedAlertDays, setSelectedAlertDays] = useState<
    Record<number, number>
  >({});
  const [showDropdownFor, setShowDropdownFor] = useState<number | null>(null);

  useEffect(() => {
    const savedAlerts = localStorage.getItem("alertDays");
    if (savedAlerts) {
      setSelectedAlertDays(JSON.parse(savedAlerts));
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/scholarships.json", {
          cache: "no-store",
        });
        const list: Item[] = await res.json();

        list.forEach((it) => {
          const [y, m, d] = it.deadline.split("-").map(Number);
          it.deadline = fmt(new Date(y, m - 1, d));
        });

        list.sort((a, b) => a.deadline.localeCompare(b.deadline));
        setAll(list);
      } catch (e) {
        console.error("장학금 로드 실패:", e);
      }
    })();
  }, []);

  const bookmarkedItems = useMemo(
    () => all.filter((i) => bookmarks.includes(i.id)),
    [all, bookmarks]
  );

  const grid = useMemo(() => buildMonthGrid(month), [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    bookmarkedItems.forEach((i) => {
      const key = i.deadline;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return map;
  }, [bookmarkedItems]);

  const calcAlertDate = (deadline: string, daysBefore: number) => {
    const d = new Date(deadline);
    d.setDate(d.getDate() - daysBefore);
    return fmt(d);
  };

  const handleAlertSelect = (
    id: number,
    daysBefore: number,
    deadline: string
  ) => {
    const alertDate = calcAlertDate(deadline, daysBefore);
    const newData = { ...selectedAlertDays, [id]: daysBefore };
    setSelectedAlertDays(newData);
    localStorage.setItem("alertDays", JSON.stringify(newData));
    alert(
      `알림일이 ${
        daysBefore === 0 ? "마감일 당일" : `${daysBefore}일 전`
      } (${alertDate})로 설정되었습니다.`
    );
    setShowDropdownFor(null);
  };

  const handleCancelAlert = (id: number) => {
    setSelectedAlertDays((prev) => {
      const updated = { ...prev };
      delete updated[id];
      localStorage.setItem("alertDays", JSON.stringify(updated));
      return updated;
    });
    alert("알림 설정이 취소되었습니다.");
  };

  const monthLabel = `${month.getFullYear()}년 ${String(
    month.getMonth() + 1
  ).padStart(2, "0")}월`;
  const thisMonth = month.getMonth();

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

        <div style={calendarCard}>
          <div style={calHeader}>
            <button
              style={navBtn}
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
            >
              ‹
            </button>
            <div>{monthLabel}</div>
            <button
              style={navBtn}
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
            >
              ›
            </button>
          </div>

          <div style={dowRow}>
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} style={dowCell}>
                {d}
              </div>
            ))}
          </div>

          <div style={gridWrap}>
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === thisMonth;
              const key = fmt(d);
              const items = eventsByDay.get(key) || [];
              const isToday = sameDay(d, new Date());
              return (
                <div
                  key={i}
                  style={{
                    ...cell,
                    opacity: inMonth ? 1 : 0.35,
                    border: isToday ? "2px solid #2563eb" : "1px solid #eee",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {d.getDate()}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    {items.slice(0, 3).map((it, idx) => (
                      <span
                        key={idx}
                        title={it.title}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          background: CAT_COLOR[it.category],
                        }}
                      />
                    ))}
                    {items.length > 3 && (
                      <span style={{ fontSize: 10, opacity: 0.6 }}>
                        +{items.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <section
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "1rem" }}>
            {bookmarkedItems.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280" }}>
                북마크된 장학금이 없습니다.
              </div>
            ) : (
              bookmarkedItems.map((it) => {
                const selectedDays = selectedAlertDays[it.id];
                const selectedText =
                  selectedDays !== undefined
                    ? selectedDays === 0
                      ? `D-Day (${calcAlertDate(it.deadline, selectedDays)})`
                      : `D-${selectedDays} (${calcAlertDate(
                          it.deadline,
                          selectedDays
                        )})`
                    : null;

                const today = new Date();
                const deadlineDate = new Date(it.deadline);
                const diffDays = Math.floor(
                  (deadlineDate.getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                const isExpired = diffDays < 0;
                const dayOptions = Array.from(
                  { length: Math.min(diffDays, 10) }, // 최대 10일까지만
                  (_, i) => i + 1
                );

                return (
                  <div key={it.id} style={itemCardStyle}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: CAT_COLOR[it.category],
                        }}
                      />
                      <strong style={{ fontSize: 15 }}>{it.title}</strong>
                    </div>

                    <div style={metaStyle}>
                      {it.provider ?? "기관"} · {it.category} · 마감{" "}
                      <b>{it.deadline}</b>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      {it.url && (
                        <button
                          style={pillBtn}
                          onClick={() => window.open(it.url!, "_blank")}
                        >
                          공고 보기
                        </button>
                      )}

                      <button
                        style={pillBtn}
                        onClick={() => toggleBookmark(it.id)}
                      >
                        북마크 해제
                      </button>

                      <button
                        style={{
                          ...pillBtn,
                          opacity: isExpired ? 0.5 : 1,
                          cursor: isExpired ? "not-allowed" : "pointer",
                        }}
                        disabled={isExpired}
                        onClick={() =>
                          !isExpired &&
                          setShowDropdownFor(
                            showDropdownFor === it.id ? null : it.id
                          )
                        }
                      >
                        {isExpired ? "마감" : "알림일 추가"}
                      </button>
                    </div>

                    {showDropdownFor === it.id && !isExpired && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          style={pillBtn}
                          onClick={() =>
                            handleAlertSelect(it.id, 0, it.deadline)
                          }
                        >
                          D-Day
                        </button>

                        {dayOptions.map((n) => (
                          <button
                            key={n}
                            style={{ ...pillBtn, marginRight: 6 }}
                            onClick={() =>
                              handleAlertSelect(it.id, n, it.deadline)
                            }
                          >
                            D-{n}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedText && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 13,
                          color: "#374151",
                          opacity: 0.85,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        설정된 알림일: {selectedText}
                        <button
                          style={{
                            ...pillBtn,
                            borderColor: "#374151",
                            color: "#374151",
                            padding: "3px 8px",
                            fontSize: 12,
                          }}
                          onClick={() => handleCancelAlert(it.id)}
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <BottomNav />
    </>
  );
}

/* --- 스타일 --- */
const containerStyle: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "1rem",
  color: "#111827",
  paddingBottom: "80px",
  fontFamily: "Pretendard, sans-serif",
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

const calendarCard: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
  marginBottom: "1rem",
  padding: 12,
};

const calHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 8px",
  fontSize: 16,
  fontWeight: 600,
};

const navBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#111827",
  fontSize: 22,
  cursor: "pointer",
};

const dowRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  padding: "6px 0",
  fontWeight: 700,
  opacity: 0.7,
};

const dowCell: React.CSSProperties = { textAlign: "center" };

const gridWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
};

const cell: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  minHeight: 52,
  padding: 6,
  border: "1px solid #eee",
};

const itemCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  background: "#fff",
  marginBottom: "1rem",
};

const metaStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  marginTop: 4,
};

const pillBtn: React.CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "6px 10px",
  cursor: "pointer",
  color: "#111827",
  fontSize: 13,
};
