import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import arrowIcon from "../images/Arrow.png";

const RecommendedDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");

        const res = await fetch(`http://127.0.0.1:8000/scholarships/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("API 요청 실패");

        const data = await res.json();
        setItem(data);
      } catch (e) {
        setItem(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>불러오는 중…</div>;
  if (!item)
    return <div style={{ padding: 20 }}>존재하지 않는 장학금입니다.</div>;

  return (
    <>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "1rem" }}>
        <header
          style={{ display: "flex", alignItems: "center", marginBottom: 16 }}
        >
          <img
            src={arrowIcon}
            style={{ width: 20, cursor: "pointer", marginRight: 8 }}
            onClick={() => navigate(-1)}
          />
          <img src={logo} style={{ width: 120 }} />
        </header>

        <h2 style={{ marginBottom: 8 }}>{item.scholarship_name}</h2>
        <div style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>
          마감: {item.end_date}
        </div>

        <div
          style={{
            background: "#fff",
            padding: 16,
            borderRadius: 12,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <p>기관: {item.provider ?? "미기재"}</p>

          <div style={{ marginTop: 12 }}>
            {item.keywords?.map((k: any) => (
              <span
                key={k.keyword_id}
                style={{
                  padding: "4px 8px",
                  background: "#ffe7c8",
                  color: "#b56500",
                  borderRadius: 8,
                  marginRight: 6,
                }}
              >
                {k.keyword}
              </span>
            ))}
          </div>

          {item.url && (
            <button
              style={{
                marginTop: 20,
                padding: "8px 12px",
                border: "1px solid #ffa938",
                background: "white",
                borderRadius: 8,
                cursor: "pointer",
              }}
              onClick={() => window.open(item.url, "_blank")}
            >
              원문보기 →
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </>
  );
};

export default RecommendedDetail;
