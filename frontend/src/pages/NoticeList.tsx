import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/metalogo.png";

type Notice = {
  id: number;
  title: string;
  postedAt: string;
  url: string;
  category?: string;
  content?: string;
  startDate?: string;
  endDate?: string;
};

const color = {
  orange: "#f97316",
  text: "#111827",
  sub: "#6b7280",
  border: "#f1f1f1",
  bg: "#fff7ed",
};

function parseDate(str?: string) {
  if (!str) return null;
  const fixed = str.replace(/\./g, "-");
  const date = new Date(fixed);
  return isNaN(date.getTime()) ? null : date;
}

function normalize(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isOngoing(start?: string, end?: string) {
  if (!start || !end) return false;
  const today = normalize(new Date());
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e) return false;
  return today >= normalize(s) && today <= normalize(e);
}

function isUpcoming(start?: string) {
  if (!start) return false;
  const today = normalize(new Date());
  const s = parseDate(start);
  if (!s) return false;
  return today < normalize(s);
}

function isExpired(end?: string) {
  if (!end) return false;
  const today = normalize(new Date());
  const e = parseDate(end);
  if (!e) return false;
  return today > normalize(e);
}

export default function NoticeList() {
  const [data, setData] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/notices.json");
        const list: Notice[] = await res.json();
        list.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
        setData(list);
      } catch (e: any) {
        setErr(e?.message ?? "불러오기 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ongoing = useMemo(
    () => data.filter((n) => isOngoing(n.startDate, n.endDate)),
    [data]
  );

  const upcoming = useMemo(
    () => data.filter((n) => isUpcoming(n.startDate)),
    [data]
  );

  const expired = useMemo(
    () => data.filter((n) => isExpired(n.endDate)),
    [data]
  );

  const normal = useMemo(
    () => data.filter((n) => !n.startDate && !n.endDate),
    [data]
  );

  if (loading) return <div>불러오는 중…</div>;
  if (err) return <div style={{ color: "tomato" }}>에러: {err}</div>;
  if (!data.length) return <div>공지 없음</div>;

  return (
    <>
      <div style={container}>
        <header style={logoHeader}>
          <img src={logo} alt="DMETA 로고" style={{ width: 150 }} />
        </header>

        <h2 style={title}>학사공지 리스트</h2>

        {ongoing.length > 0 && (
          <section style={todayCard}>
            <h3 style={todayTitle}>진행 중 공지</h3>
            <ul style={ul}>
              {ongoing.map((n) => (
                <li key={n.id} style={li}>
                  <Link to={`/notice/${n.id}`} style={link}>
                    <div style={{ fontWeight: 700 }}>{n.title}</div>
                    <div style={meta}>
                      {n.startDate} ~ {n.endDate}{" "}
                      <span style={{ color: color.orange, fontWeight: 600 }}>
                        진행 중
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {upcoming.length > 0 && (
          <section style={todayCard}>
            <h3 style={{ ...todayTitle, color: "#fb923c" }}>예정 공지</h3>
            <ul style={ul}>
              {upcoming.map((n) => (
                <li key={n.id} style={li}>
                  <Link to={`/notice/${n.id}`} style={link}>
                    <div style={{ fontWeight: 700 }}>{n.title}</div>
                    <div style={meta}>
                      시작일 {n.startDate}{" "}
                      <span style={{ color: "#fb923c", fontWeight: 600 }}>
                        예정
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 style={subTitle}>전체 학사공지</h3>
          <ul style={ul}>
            {normal.map((n) => (
              <li key={n.id} style={li}>
                <Link to={`/notice/${n.id}`} style={link}>
                  <div style={{ fontWeight: 700 }}>{n.title}</div>
                  <div style={meta}>
                    {n.category ?? "학사"} · {n.postedAt}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {expired.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <h3 style={subTitle}>지난 공지</h3>
            <ul style={ul}>
              {expired.map((n) => (
                <li key={n.id} style={li}>
                  <Link to={`/notice/${n.id}`} style={link}>
                    <div style={{ fontWeight: 700 }}>{n.title}</div>
                    <div style={meta}>
                      {n.startDate} ~ {n.endDate}{" "}
                      <span style={{ color: "tomato", fontWeight: 600 }}>
                        마감
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <BottomNav />
    </>
  );
}

const container: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "1rem",
  fontFamily: "Pretendard, sans-serif",
  color: "#111827",
  background: "#fff",
  paddingBottom: "80px",
};

const logoHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 20,
};

const title: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 12,
  color: color.text,
};

const todayCard: React.CSSProperties = {
  background: color.bg,
  borderRadius: 16,
  padding: 16,
  marginBottom: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const todayTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: color.orange,
  marginBottom: 8,
};

const ul: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 10,
};

const li: React.CSSProperties = {
  border: `1px solid ${color.border}`,
  borderRadius: 12,
  padding: 12,
  background: "#fff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const link: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

const meta: React.CSSProperties = {
  fontSize: 12,
  color: color.sub,
  marginTop: 4,
};

const subTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  marginTop: 16,
  marginBottom: 10,
  color: color.text,
};
