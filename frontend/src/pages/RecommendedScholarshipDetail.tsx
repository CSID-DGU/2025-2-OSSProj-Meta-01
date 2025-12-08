import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/metalogo.png";
import bookmarkIcon from "../images/bookmark.png";
import bookmarkFilledIcon from "../images/bookmark_filled.png";
import arrowIcon from "../images/Arrow.png";
import { useBookmark } from "../contexts/BookmarkContext";
import { toast } from "react-hot-toast";

type ScholarshipDetailResponse = {
  scholarship_id: number;
  scholarship_name: string;
  start_date: string;
  end_date: string;
  url?: string;
  image_url?: string;
  is_bookmarked: boolean;
  detail?: {
    content?: string;
    parsed_content?: string;
    images?: string[];
    image_s3_urls?: string[];
    attachments?: any[];
    attachment_s3_urls?: any[];
    image_content?: { s3_url: string; parsed_content?: string }[];
    [key: string]: any;
  };
  summary?: Record<string, string>;
};

/* Content 후처리 */
const cleanContent = (text: string) => {
  return text
    .replace(/\n{2,}/g, "\n")
    .replace(/•/g, "\n• ")
    .replace(/–/g, "  - ")
    .replace(/※/g, "\n※ ")
    .replace(/([0-9]{4}\. [0-9]{2}\. [0-9]{2}\.)/g, "<b>$1</b>")
    .trim();
};

const cleanParsedHtml = (html: string) => {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/background-image:[^;"]*;?/gi, "")
    .replace(/url\(['"]?data:image[^'")]*['"]?\)/gi, "");
};

const ScholarshipDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState<ScholarshipDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toggleBookmark } = useBookmark();

  /* 상세조회 */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          toast.error("로그인이 필요합니다.");
          navigate("/login");
          return;
        }

        const res = await fetch(`http://127.0.0.1:8000/scholarships/${id}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          toast.error("장학금 상세 정보를 불러오지 못했습니다.");
          setItem(null);
          return;
        }

        const data: ScholarshipDetailResponse = await res.json();
        setItem(data);
      } catch (e) {
        toast.error("서버와 연결할 수 없습니다.");
        setItem(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div style={container}>불러오는 중…</div>;
  }

  if (!item) {
    return (
      <div style={container}>
        <p style={{ marginBottom: 12 }}>장학금 정보를 불러올 수 없습니다.</p>
        <button
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
          onClick={() => navigate(-1)}
        >
          ← 뒤로가기
        </button>
      </div>
    );
  }

  const dday = Math.ceil(
    (new Date(item.end_date).getTime() - Date.now()) / 86400000
  );

  const formattedContent = item.detail?.content
    ? cleanContent(item.detail.content)
    : "";

  /* 이미지 수집 */
  const collectImages = () => {
    const set = new Set<string>();

    const isValidImage = (src: string) => {
      if (!src) return false;
      if (src.startsWith("data:image")) return false;
      if (src.length < 50) return false;
      return true;
    };

    item.detail?.images?.forEach((src) => isValidImage(src) && set.add(src));
    item.detail?.image_s3_urls?.forEach(
      (src) => isValidImage(src) && set.add(src)
    );
    item.detail?.image_content?.forEach(
      (img) => img.s3_url && isValidImage(img.s3_url) && set.add(img.s3_url)
    );

    return Array.from(set);
  };

  const finalImages = collectImages();

  /* 첨부파일 수집 */
  const collectAttachments = () => {
    const list: string[] = [];

    const extract = (arr: any[]) => {
      arr.forEach((a) => {
        if (!a) return;

        if (typeof a === "string") {
          list.push(a);
        } else if (typeof a === "object") {
          if (a.s3_url) list.push(a.s3_url);
          if (a.url) list.push(a.url);
          if (a.link) list.push(a.link);
        }
      });
    };

    if (item.detail?.attachments) extract(item.detail.attachments);
    if (item.detail?.attachment_s3_urls)
      extract(item.detail.attachment_s3_urls);

    return list;
  };

  const attachments = collectAttachments();

  /* 렌더링 */
  return (
    <>
      <div style={container}>
        {/* Header */}
        <header style={header}>
          <img
            src={arrowIcon}
            alt="뒤로가기"
            style={back}
            onClick={() => navigate(-1)}
          />
          <img src={logo} alt="logo" style={logoStyle} />
        </header>

        {/* Title */}
        <div style={titleWrap}>
          <h2 style={title}>{item.scholarship_name}</h2>
          <img
            src={item.is_bookmarked ? bookmarkFilledIcon : bookmarkIcon}
            onClick={() => {
              toggleBookmark(item.scholarship_id);

              toast.success(
                item.is_bookmarked
                  ? "북마크가 해제되었습니다"
                  : "북마크에 저장되었습니다"
              );

              setItem((prev) =>
                prev ? { ...prev, is_bookmarked: !prev.is_bookmarked } : prev
              );
            }}
            alt="bookmark"
            style={bookmark}
          />
        </div>

        {/* Meta */}
        <div style={meta}>
          마감 <b style={{ marginLeft: 3 }}>{item.end_date}</b>
          <span style={{ marginLeft: 6 }}>
            {dday > 0 ? `· D-${dday}` : "· 마감"}
          </span>
        </div>

        {/* Summary */}
        {item.summary && (
          <div style={card}>
            {Object.entries(item.summary).map(([k, v]) => (
              <p key={k} style={summaryRow}>
                <b>{k}</b> : {v}
              </p>
            ))}
          </div>
        )}

        {/* 상세 내용 */}
        {formattedContent && (
          <div style={card}>
            <h3 style={sectionTitle}>상세 내용</h3>
            <div
              style={textBlock}
              dangerouslySetInnerHTML={{
                __html: formattedContent.replace(/\n/g, "<br/>"),
              }}
            />
          </div>
        )}

        {/* 본문 parsed_content */}
        {item.detail?.parsed_content && (
          <div style={card}>
            <h3 style={sectionTitle}>본문</h3>
            <div
              className="parsed-content-clean"
              dangerouslySetInnerHTML={{
                __html: cleanParsedHtml(item.detail.parsed_content),
              }}
              style={htmlContent}
            />
          </div>
        )}

        {/* 첨부파일 */}
        <div style={card}>
          <h3 style={sectionTitle}>첨부파일</h3>

          {attachments.length === 0 ? (
            <div style={{ color: "#777", fontSize: 14 }}>
              첨부파일이 없습니다.
            </div>
          ) : (
            attachments.map((file, index) => (
              <button
                key={file}
                onClick={() => window.open(file, "_blank")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "#f9fafb",
                  textAlign: "left",
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                📎 첨부파일 {index + 1} 다운로드
              </button>
            ))
          )}
        </div>

        {/* 이미지 */}
        {finalImages.length > 0 && (
          <div style={card}>
            <h3 style={sectionTitle}>첨부 이미지</h3>
            {finalImages.map((src) => (
              <img
                key={src}
                src={src}
                style={imgStyle}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ))}
          </div>
        )}

        {/* 원문 보기 */}
        {item.url && (
          <button
            style={linkBtn}
            onClick={() => window.open(item.url!, "_blank")}
          >
            원문 보기 →
          </button>
        )}
      </div>

      <BottomNav />

      <style>
        {`
          .parsed-content-clean ul,
          .parsed-content-clean li,
          .parsed-content-clean ol {
            list-style: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .parsed-content-clean *::before,
          .parsed-content-clean *::after {
            content: none !important;
            background: none !important;
          }
        `}
      </style>
    </>
  );
};

/* 스타일 */
const container: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "1rem",
  paddingBottom: "80px",
  fontFamily: "Pretendard",
};

const header: React.CSSProperties = {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  padding: "12px 0 16px",
  marginBottom: "1rem",
};

const back: React.CSSProperties = {
  position: "absolute",
  left: 8,
  top: "50%",
  transform: "translateY(-50%)",
  width: 15,
  height: 15,
  cursor: "pointer",
};

const logoStyle: React.CSSProperties = { width: 120 };

const titleWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 6,
};

const title: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: 0,
};

const bookmark: React.CSSProperties = {
  width: 22,
  height: 22,
  marginLeft: 8,
  cursor: "pointer",
};

const meta: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 14,
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #E5E7EB",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  padding: "1.1rem",
  marginBottom: "1.2rem",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  marginBottom: 12,
  fontSize: 16,
  fontWeight: 600,
};

const summaryRow: React.CSSProperties = { marginBottom: 6 };

const textBlock: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.7",
  fontSize: 14,
  color: "#374151",
};

const htmlContent: React.CSSProperties = {
  lineHeight: 1.6,
  fontSize: 14,
};

const imgStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  marginBottom: 12,
};

const linkBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  border: "1px solid #000",
  background: "#fff",
  borderRadius: 999,
  padding: "10px 12px",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
  marginTop: "1rem",
};

export default ScholarshipDetail;
