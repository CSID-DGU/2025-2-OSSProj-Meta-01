import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/metalogo.png";
import arrowIcon from "../images/Arrow.png";
import { useBookmark } from "../contexts/BookmarkContext";
import { useBadge } from "../contexts/BadgeContext";
import { toast } from "react-hot-toast";

type CalendarItem = {
  bookmark_id: number;
  scholarship_id: number;
  scholarship_name: string;
  end_date: string;
  doc_id?: string;
};

type NotificationItem = {
  notification_id: number;
  notification_date: number;
  scholarship_id: number;
  scholarship_name: string;
  end_date: string;
  doc_id?: string;
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
  const location = useLocation();
  const { toggleBookmark } = useBookmark();
  const { setCount } = useBadge();

  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [showDropdownFor, setShowDropdownFor] = useState<number | null>(null);
  const [selectedDayItems, setSelectedDayItems] = useState<
    CalendarItem[] | null
  >(null);

  const [notificationsMap, setNotificationsMap] = useState<
    Record<number, NotificationItem[]>
  >({});

  // 캘린더 데이터 호출
  const fetchCalendar = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://127.0.0.1:8000/notification/calendar/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("캘린더 API 실패");

      const list = await res.json();
      setCalendarItems(list);
    } catch (e) {
      console.error("캘린더 불러오기 실패:", e);
      toast.error("캘린더 정보를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [location.key]);

  // 각 bookmark_id 별로 알림 목록 불러오기
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    calendarItems.forEach(async (item) => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/notification/bookmarks/${item.bookmark_id}/notifications/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) return;

        const list = await res.json();
        setNotificationsMap((prev) => ({
          ...prev,
          [item.bookmark_id]: list,
        }));
      } catch (err) {
        console.log("알림 불러오기 실패", err);
        toast.error("알림 정보를 불러오지 못했습니다.");
      }
    });
  }, [calendarItems]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    calendarItems.forEach((item) => {
      const key = item.end_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [calendarItems]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const monthLabel = `${month.getFullYear()}년 ${String(
    month.getMonth() + 1
  ).padStart(2, "0")}월`;
  const thisMonth = month.getMonth();

  const sortedItems = useMemo(() => {
    return [...calendarItems].sort(
      (a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
    );
  }, [calendarItems]);

  // 알림 추가
  const handleAlertSelect = async (
    bookmarkId: number,
    daysBefore: number,
    deadline: string
  ) => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `http://127.0.0.1:8000/notification/bookmarks/${bookmarkId}/notifications/add/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notification_date: daysBefore }),
        }
      );

      const data = await res.json();

      if (data.notifications) {
        setNotificationsMap((prev) => ({
          ...prev,
          [bookmarkId]: data.notifications,
        }));

        setCount((prev) => prev + 1);
      }

      toast.success(`D-${daysBefore} 알림이 설정되었습니다.`);
      setShowDropdownFor(null);
    } catch (err) {
      console.log("알림 추가 실패", err);
      toast.error("알림 설정에 실패했습니다.");
    }
  };

  // 알림 삭제
  const handleCancelAlert = async (
    bookmarkId: number,
    notificationId: number
  ) => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `http://127.0.0.1:8000/notification/notifications/${notificationId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();

      if (data.notifications) {
        setNotificationsMap((prev) => ({
          ...prev,
          [bookmarkId]: data.notifications,
        }));

        setCount((prev) => Math.max(prev - 1, 0));
      }

      toast.success("알림이 삭제되었습니다.");
    } catch (err) {
      console.log("알림 삭제 실패", err);
      toast.error("알림 삭제에 실패했습니다.");
    }
  };

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

        {/* 캘린더 */}
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
                  onClick={() => items.length > 0 && setSelectedDayItems(items)}
                  style={{
                    ...cell,
                    opacity: inMonth ? 1 : 0.35,
                    border: isToday ? "2px solid #2563eb" : "1px solid #eee",
                    cursor: items.length > 0 ? "pointer" : "default",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {d.getDate()}
                  </div>

                  {/* 점 표시 */}
                  <div
                    style={{
                      display: "flex",
                      gap: 3,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    {items.slice(0, 3).map((it) => (
                      <span
                        key={it.scholarship_id}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          background: "#F97316",
                          display: "inline-block",
                          flexShrink: 0,
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

        {/* 리스트 영역 */}
        <section
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "1rem" }}>
            {sortedItems.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280" }}>
                북마크된 장학금이 없습니다.
              </div>
            ) : (
              sortedItems.map((it) => {
                const notis = notificationsMap[it.bookmark_id] || [];

                const deadline = it.end_date;
                const deadlineDate = new Date(deadline);
                const diffDays = Math.floor(
                  (deadlineDate.getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                const isExpired = diffDays < 0;
                const dayOptions = Array.from(
                  { length: Math.min(diffDays, 10) },
                  (_, i) => i + 1
                );

                return (
                  <div key={it.bookmark_id} style={itemCardStyle}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: "#F97316",
                          flexShrink: 0,
                        }}
                      />
                      <strong style={{ fontSize: 15 }}>
                        {it.scholarship_name}
                      </strong>
                    </div>

                    <div style={metaStyle}>
                      마감 <b>{deadline}</b>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button
                        style={pillBtn}
                        onClick={() =>
                          window.open(
                            `https://www.google.com/search?q=${it.scholarship_name}`,
                            "_blank"
                          )
                        }
                      >
                        공고 보기
                      </button>

                      <button
                        style={pillBtn}
                        onClick={() => {
                          toggleBookmark(it.scholarship_id);
                          setCalendarItems((prev) =>
                            prev.filter(
                              (item) =>
                                item.scholarship_id !== it.scholarship_id
                            )
                          );
                          toast.success("북마크가 해제되었습니다.");
                        }}
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
                            showDropdownFor === it.bookmark_id
                              ? null
                              : it.bookmark_id
                          )
                        }
                      >
                        {isExpired ? "마감" : "알림일 추가"}
                      </button>
                    </div>

                    {showDropdownFor === it.bookmark_id && !isExpired && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          style={pillBtn}
                          onClick={() =>
                            handleAlertSelect(it.bookmark_id, 0, deadline)
                          }
                        >
                          D-Day
                        </button>

                        {dayOptions.map((n) => (
                          <button
                            key={n}
                            style={{ ...pillBtn, marginRight: 6 }}
                            onClick={() =>
                              handleAlertSelect(it.bookmark_id, n, deadline)
                            }
                          >
                            D-{n}
                          </button>
                        ))}
                      </div>
                    )}

                    {notis.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {notis.map((n) => (
                          <div
                            key={n.notification_id}
                            style={{
                              fontSize: 13,
                              opacity: 0.85,
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <span>설정된 알림일: D-{n.notification_date}</span>
                            <button
                              style={{
                                ...pillBtn,
                                borderColor: "#374151",
                                color: "#374151",
                                padding: "2px 6px",
                                fontSize: 12,
                              }}
                              onClick={() =>
                                handleCancelAlert(
                                  it.bookmark_id,
                                  n.notification_id
                                )
                              }
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {selectedDayItems && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginBottom: 10 }}>해당 날짜 마감 장학금</h3>

            {selectedDayItems.map((it) => (
              <div key={it.scholarship_id} style={{ marginBottom: 10 }}>
                <b>{it.scholarship_name}</b>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  마감일: {it.end_date}
                </div>
              </div>
            ))}

            <button style={pillBtn} onClick={() => setSelectedDayItems(null)}>
              닫기
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}

/* 스타일 */
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
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  width: "80%",
  maxWidth: "350px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
};
