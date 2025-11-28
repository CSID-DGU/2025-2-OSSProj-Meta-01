import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import logo from "../images/logo.png";
import arrowIcon from "../images/Arrow.png";
import { apiRequest } from "../api/apiClient";

/* ------------------- 타입 정의 ------------------- */
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
  category: "교내" | "국가" | "외부";
  url?: string;
};

/* ---- 키워드 타입 ---- */
// 전체 키워드 목록용
type KeywordBase = {
  keyword_id: number;
  keyword: string;
};

// 사용자 키워드 목록용
type UserKeyword = {
  user_keyword_id: number;
  keyword_id: number;
  keyword: string;
};

// 화면에서 사용할 통합 타입
type Keyword = {
  keyword_id: number;
  keyword: string;
  active: boolean;
  user_keyword_id?: number | null;
};

/* ---- 자격증 타입 ---- */
type CertBase = {
  certification_id: number;
  certification_name: string;
  category: string;
};

type UserCertListItem = {
  user_certification_id: number;
  certification_name: string;
  category: string;
};

type UserCertDetail = {
  certification_name: string;
  category: string;
  score: string | null;
  acquired_date: string;
  expiration_date: string | null;
};

/* ---- 북마크 타입 ---- */
type UserBookmark = {
  bookmark_id: number;
  scholarship_id: number;
  scholarship_name: string;
  start_date: string;
  end_date: string;
};

/* ----------------------------------------------------------- */
/*                       스타일 유틸                           */
/* ----------------------------------------------------------- */

const color = {
  orange: "#f97316",
  text: "#111827",
  sub: "#6b7280",
  border: "#e5e7eb",
  card: "#ffffff",
};

const catColor = (c: "교내" | "국가" | "외부") =>
  c === "교내" ? "#3b82f6" : c === "국가" ? "#10b981" : "#a78bfa";

/* ----------------------------------------------------------- */
/*                        페이지 시작                          */
/* ----------------------------------------------------------- */

const ProfilePage: React.FC = () => {
  const nav = useNavigate();

  /* ------------------- 기본 정보 ------------------- */
  const [form, setForm] = useState<Profile>({
    name: "",
    major: "",
    grade: "",
    gpa: "",
    incomeLevel: "",
  });
  const [editInfo, setEditInfo] = useState(false);

  /* ------------------- 비밀번호 ------------------- */
  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password1: "",
    new_password2: "",
  });

  /* ------------------- 장학금 ------------------- */
  const [schBase, setSchBase] = useState<ScholarshipItem[]>([]);

  /* ------------------- 키워드 ------------------- */
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [editingKeywords, setEditingKeywords] = useState(false);

  /* ------------------- 자격증 ------------------- */
  const [allCerts, setAllCerts] = useState<CertBase[]>([]);
  const [userCerts, setUserCerts] = useState<UserCertListItem[]>([]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [editingCertId, setEditingCertId] = useState<number | null>(null);
  const [editingCertDetail, setEditingCertDetail] =
    useState<UserCertDetail | null>(null);

  /* ------------------- 북마크 ------------------- */
  const [userBookmarks, setUserBookmarks] = useState<UserBookmark[]>([]);

  /* ----------------------------------------------------------- */
  /*                         초기 로드                           */
  /* ----------------------------------------------------------- */
  useEffect(() => {
    loadKeywords(); // 키워드 API 연동
    loadScholarships();
    loadMyInfo();
    loadAllCerts();
    loadUserCerts();
    loadBookmarks();
  }, []);

  /* ------------------- 키워드 로드 (API 연동) ------------------- */
  const loadKeywords = async () => {
    try {
      const [baseRes, userRes] = await Promise.all([
        apiRequest("http://127.0.0.1:8000/mypage/keywords/"),
        apiRequest("http://127.0.0.1:8000/mypage/me/keywords/"),
      ]);

      if (!baseRes.ok || !userRes.ok) return;

      const baseData: KeywordBase[] = await baseRes.json();
      const userData: UserKeyword[] = await userRes.json();

      const merged: Keyword[] = baseData.map((b) => {
        const uk = userData.find((u) => u.keyword_id === b.keyword_id);
        return {
          keyword_id: b.keyword_id,
          keyword: b.keyword,
          active: !!uk,
          user_keyword_id: uk ? uk.user_keyword_id : null,
        };
      });

      setKeywords(merged);
    } catch (e) {
      console.error(e);
    }
  };

  /* ------------------- 장학금 로드 ------------------- */
  const loadScholarships = async () => {
    const res = await fetch("/api/scholarships.json");
    setSchBase(await res.json());
  };

  /* ------------------- 마이페이지 정보 ------------------- */
  const loadMyInfo = async () => {
    const res = await apiRequest("http://127.0.0.1:8000/mypage/me/");
    if (!res.ok) return;
    const data = await res.json();

    // 백엔드 응답 구조에 맞게 일부만 매핑 (이름/학과는 필요 시 추가 작업)
    setForm({
      name: data.user_name ?? "",
      major: data.major_name ?? "",
      grade: String(data.year ?? ""),
      gpa: String(data.gpa ?? ""),
      incomeLevel: String(data.income_level ?? ""),
    });
  };

  /* ------------------- 자격증 전체 목록 ------------------- */
  const loadAllCerts = async () => {
    const res = await apiRequest(
      "http://127.0.0.1:8000/mypage/certifications/"
    );
    if (!res.ok) return;
    setAllCerts(await res.json());
  };

  /* ------------------- 사용자 자격증 목록 ------------------- */
  const loadUserCerts = async () => {
    const res = await apiRequest(
      "http://127.0.0.1:8000/mypage/me/certifications/"
    );
    if (!res.ok) return;
    setUserCerts(await res.json());
  };

  /* ------------------- 자격증 상세 ------------------- */
  const loadCertDetail = async (id: number) => {
    const res = await apiRequest(
      `http://127.0.0.1:8000/mypage/me/certifications/${id}/`
    );
    if (!res.ok) return;
    setEditingCertDetail(await res.json());
  };

  /* ------------------- 북마크 GET ------------------- */
  const loadBookmarks = async () => {
    const res = await apiRequest("http://127.0.0.1:8000/mypage/me/bookmarks/");
    if (!res.ok) return;
    setUserBookmarks(await res.json());
  };

  /* ------------------- 북마크 삭제 ------------------- */
  const handleUnbookmark = async (bookmarkId: number) => {
    const res = await apiRequest(
      `http://127.0.0.1:8000/mypage/me/bookmarks/${bookmarkId}/`,
      { method: "DELETE" }
    );

    const data = await res.json();

    if (res.ok) {
      setUserBookmarks(data.bookmarks);
    } else {
      alert("북마크 해제 실패");
    }
  };

  /* ----------------------------------------------------------- */
  /*                       개인정보 저장                         */
  /* ----------------------------------------------------------- */
  const handleSaveInfo = async () => {
    const res = await apiRequest("http://127.0.0.1:8000/mypage/me/", {
      method: "PATCH",
      body: JSON.stringify({
        gpa: form.gpa,
        income_level: form.incomeLevel,
      }),
    });

    if (res.ok) {
      alert("개인정보가 저장되었습니다.");
      setEditInfo(false);
      loadMyInfo();
    } else {
      alert("저장 실패");
    }
  };

  /* ----------------------------------------------------------- */
  /*                     비밀번호 변경 API                        */
  /* ----------------------------------------------------------- */
  const handleChangePassword = async () => {
    const res = await apiRequest("http://127.0.0.1:8000/mypage/me/", {
      method: "PATCH",
      body: JSON.stringify(pwForm),
    });

    const data = await res.json();

    if (res.ok) {
      alert("비밀번호가 변경되었습니다.");
      setPwForm({ old_password: "", new_password1: "", new_password2: "" });
    } else {
      // 백엔드 에러 포맷에 맞춰 메시지 표시
      const detail = data.details;
      const firstKey = detail && Object.keys(detail)[0];
      const msgArray = firstKey ? detail[firstKey] : null;
      const msg =
        (Array.isArray(msgArray) && msgArray[0]) ||
        detail?.error?.[0] ||
        data.error ||
        "비밀번호 변경 실패";
      alert(msg);
    }
  };

  /* ----------------------------------------------------------- */
  /*                       키워드 로직                          */
  /* ----------------------------------------------------------- */

  const handleToggleKeyword = (keywordId: number) => {
    if (!editingKeywords) return;
    setKeywords((prev) =>
      prev.map((k) =>
        k.keyword_id === keywordId ? { ...k, active: !k.active } : k
      )
    );
  };

  const handleCancelKeywords = () => {
    // 서버 상태로 되돌리기
    loadKeywords();
    setEditingKeywords(false);
  };

  const handleSaveKeywords = async () => {
    try {
      const toAdd = keywords.filter((k) => k.active && !k.user_keyword_id);
      const toRemove = keywords.filter((k) => !k.active && k.user_keyword_id);

      // 추가
      for (const k of toAdd) {
        await apiRequest("http://127.0.0.1:8000/mypage/me/keywords/add/", {
          method: "POST",
          body: JSON.stringify({ keyword_id: k.keyword_id }),
        });
      }

      // 삭제
      for (const k of toRemove) {
        await apiRequest(
          `http://127.0.0.1:8000/mypage/me/keywords/${k.user_keyword_id}/`,
          { method: "DELETE" }
        );
      }

      await loadKeywords();
      setEditingKeywords(false);
      alert("관심 키워드가 저장되었습니다.");
    } catch (e) {
      console.error(e);
      alert("관심 키워드 저장 중 오류가 발생했습니다.");
    }
  };

  /* ----------------------------------------------------------- */
  /*                        자격증 추가                          */
  /* ----------------------------------------------------------- */

  const handleAddCert = async (payload: {
    certification_id: number;
    score: string;
    acquired_date: string;
    expiration_date: string | null;
  }) => {
    const res = await apiRequest(
      "http://127.0.0.1:8000/mypage/me/certifications/add/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (res.ok) {
      alert("자격증이 추가되었습니다.");
      setAddModalOpen(false);
      // 백엔드에서 certifications 목록을 바로 내려주므로 사용해도 되고,
      // 그냥 다시 조회하는 방식으로 유지
      loadUserCerts();
    } else {
      alert(data.error || "추가 실패");
    }
  };

  /* ----------------------------------------------------------- */
  /*                   자격증 수정 + 삭제                         */
  /* ----------------------------------------------------------- */

  const handleSaveEditCert = async () => {
    if (!editingCertId || !editingCertDetail) return;

    const res = await apiRequest(
      `http://127.0.0.1:8000/mypage/me/certifications/${editingCertId}/`,
      {
        method: "PATCH",
        body: JSON.stringify({
          score: editingCertDetail.score,
          acquired_date: editingCertDetail.acquired_date,
          expiration_date: editingCertDetail.expiration_date,
        }),
      }
    );

    const data = await res.json();

    if (res.ok) {
      alert("수정되었습니다.");
      setEditModalOpen(false);
      loadUserCerts();
    } else {
      alert(data.error || "수정 실패");
    }
  };

  const handleDeleteCert = async () => {
    if (!editingCertId) return;

    const res = await apiRequest(
      `http://127.0.0.1:8000/mypage/me/certifications/${editingCertId}/`,
      { method: "DELETE" }
    );

    const data = await res.json();

    if (res.ok) {
      alert("삭제되었습니다.");
      setEditModalOpen(false);
      loadUserCerts();
    } else {
      alert(data.error || "삭제 실패");
    }
  };

  const openEditCertModal = async (id: number) => {
    setEditingCertId(id);
    await loadCertDetail(id);
    setEditModalOpen(true);
  };

  /* ----------------------------------------------------------- */
  /*                        북마크 JOIN                          */
  /* ----------------------------------------------------------- */

  const bookmarkRows = useMemo(() => {
    return userBookmarks
      .map((b) => {
        const base = schBase.find((s) => s.id === b.scholarship_id);
        if (!base) return null;
        return {
          bookmark_id: b.bookmark_id,
          id: base.id,
          title: base.title,
          provider: base.provider,
          deadline: base.deadline,
          category: base.category,
          url: base.url,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.deadline.localeCompare(b!.deadline));
  }, [userBookmarks, schBase]);

  /* ----------------------------------------------------------- */
  /*                          렌더링                              */
  /* ----------------------------------------------------------- */

  return (
    <>
      <div style={wrap}>
        {/* Header */}
        <header style={headerStyle}>
          <img src={arrowIcon} style={arrowStyle} onClick={() => nav(-1)} />
          <img src={logo} style={logoStyle} />
        </header>

        {/* ================== 내 정보 ================== */}
        <section style={card}>
          <h3 style={sectionTitle}>내 정보</h3>

          <div style={formWrap}>
            <EditableInput
              label="이름"
              value={form.name}
              readOnly={!editInfo}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <EditableInput
              label="학과"
              value={form.major}
              readOnly={!editInfo}
              onChange={(v) => setForm({ ...form, major: v })}
            />
            <EditableInput
              label="학년"
              value={form.grade}
              readOnly={!editInfo}
              onChange={(v) => setForm({ ...form, grade: v })}
            />
            <EditableInput
              label="GPA"
              value={form.gpa}
              readOnly={!editInfo}
              onChange={(v) => setForm({ ...form, gpa: v })}
            />
            <EditableInput
              label="소득분위"
              value={form.incomeLevel}
              readOnly={!editInfo}
              onChange={(v) => setForm({ ...form, incomeLevel: v })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {editInfo ? (
              <>
                <button style={cancelBtn} onClick={() => setEditInfo(false)}>
                  취소
                </button>
                <button style={saveBtn} onClick={handleSaveInfo}>
                  저장
                </button>
              </>
            ) : (
              <button style={editBtn} onClick={() => setEditInfo(true)}>
                편집
              </button>
            )}
          </div>
        </section>

        {/* ============= 관심 키워드 ============= */}
        <section style={card}>
          <h3 style={sectionTitle}>내 관심 키워드</h3>
          <div
            style={{
              minHeight: 80,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {keywords.map((kw) => (
              <div
                key={kw.keyword_id}
                onClick={() => handleToggleKeyword(kw.keyword_id)}
                style={{
                  background: kw.active ? "#f9a24e" : "#f3f4f6",
                  color: kw.active ? "#fff" : "#9ca3af",
                  borderRadius: 20,
                  padding: "6px 10px",
                  cursor: editingKeywords ? "pointer" : "default",
                  border: kw.active ? "1px solid #f68a0a" : "1px solid #e5e7eb",
                }}
              >
                #{kw.keyword}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {editingKeywords ? (
              <>
                <button style={cancelBtn} onClick={handleCancelKeywords}>
                  취소
                </button>
                <button style={saveBtn} onClick={handleSaveKeywords}>
                  저장
                </button>
              </>
            ) : (
              <button style={editBtn} onClick={() => setEditingKeywords(true)}>
                편집
              </button>
            )}
          </div>
        </section>

        {/* ============= 자격증 목록 ============= */}
        <section style={card}>
          <h3 style={sectionTitle}>내 자격증/어학성적</h3>

          <div style={certList}>
            {userCerts.length === 0 ? (
              <div style={{ fontSize: 14, color: color.sub }}>
                등록된 자격증이 없습니다.
              </div>
            ) : (
              userCerts.map((uc) => (
                <div
                  key={uc.user_certification_id}
                  style={certItem}
                  onClick={() => openEditCertModal(uc.user_certification_id)}
                >
                  <strong>{uc.certification_name}</strong>
                  <span style={{ fontSize: 13, color: color.sub }}>
                    {uc.category}
                  </span>
                </div>
              ))
            )}
          </div>

          <div style={addCert} onClick={() => setAddModalOpen(true)}>
            + 자격증 추가
          </div>
        </section>

        {/* ============= 북마크 목록 ============= */}
        <section style={card}>
          <div style={sectionTop}>
            <h3 style={sectionTitle}>북마크 관리</h3>
            <span style={badge}>장학금 {bookmarkRows.length}건</span>
          </div>

          <div style={listWrap}>
            {bookmarkRows.length === 0 ? (
              <div style={{ fontSize: 14, color: color.sub }}>
                북마크된 장학금이 없습니다.
              </div>
            ) : (
              bookmarkRows.map((s) => (
                <div key={s!.bookmark_id} style={bookmarkItem}>
                  <div style={bookmarkLeft}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: catColor(s!.category),
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>{s!.title}</div>
                      <div style={metaText}>
                        {s!.category} · 마감 {s!.deadline} · {s!.provider}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {s!.url && (
                      <button
                        style={miniBtn}
                        onClick={() => window.open(s!.url!, "_blank")}
                      >
                        공고 보기
                      </button>
                    )}

                    <button
                      style={miniBtn}
                      onClick={() => handleUnbookmark(s!.bookmark_id)}
                    >
                      북마크 해제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ============= 계정 ============= */}
        <section style={card}>
          <h3 style={sectionTitle}>계정</h3>

          {/* 비밀번호 변경 섹션 (아래로 이동) */}
          <div
            style={{
              display: "grid",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <input
              placeholder="기존 비밀번호"
              type="password"
              value={pwForm.old_password}
              onChange={(e) =>
                setPwForm({ ...pwForm, old_password: e.target.value })
              }
              style={modalInput}
            />
            <input
              placeholder="새 비밀번호"
              type="password"
              value={pwForm.new_password1}
              onChange={(e) =>
                setPwForm({ ...pwForm, new_password1: e.target.value })
              }
              style={modalInput}
            />
            <input
              placeholder="새 비밀번호 확인"
              type="password"
              value={pwForm.new_password2}
              onChange={(e) =>
                setPwForm({ ...pwForm, new_password2: e.target.value })
              }
              style={modalInput}
            />
            <button style={saveBtn} onClick={handleChangePassword}>
              비밀번호 변경
            </button>
          </div>

          <button style={logoutBtn}>회원탈퇴</button>
        </section>
      </div>

      <BottomNav />

      {/* 모달: 자격증 추가 */}
      {addModalOpen && (
        <AddCertModal
          allCerts={allCerts}
          onClose={() => setAddModalOpen(false)}
          onSave={handleAddCert}
        />
      )}

      {/* 모달: 자격증 수정 */}
      {editModalOpen && editingCertDetail && (
        <EditCertModal
          detail={editingCertDetail}
          setDetail={setEditingCertDetail}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveEditCert}
          onDelete={handleDeleteCert}
        />
      )}
    </>
  );
};

/* ----------------------------------------------------------- */
/*               재사용 EditableInput 컴포넌트                 */
/* ----------------------------------------------------------- */

const EditableInput = ({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onChange: (v: string) => void;
}) => (
  <label style={{ display: "grid", gap: 4 }}>
    <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
    <input
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "10px",
        height: 42,
        background: readOnly ? "#fff" : "#fef2e8",
      }}
    />
  </label>
);

/* ----------------------------------------------------------- */
/*                 자격증 추가 모달 컴포넌트                  */
/* ----------------------------------------------------------- */

const AddCertModal: React.FC<{
  allCerts: CertBase[];
  onClose: () => void;
  onSave: (c: {
    certification_id: number;
    score: string;
    acquired_date: string;
    expiration_date: string | null;
  }) => void;
}> = ({ allCerts, onClose, onSave }) => {
  const [form, setForm] = useState({
    certification_id: 0,
    score: "",
    acquired_date: "",
    expiration_date: "",
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
          <select
            value={form.certification_id}
            onChange={(e) =>
              setForm({ ...form, certification_id: Number(e.target.value) })
            }
            style={modalInput}
          >
            <option value={0}>자격증 선택</option>
            {allCerts.map((c) => (
              <option key={c.certification_id} value={c.certification_id}>
                {c.certification_name} ({c.category})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.acquired_date}
            onChange={(e) =>
              setForm({ ...form, acquired_date: e.target.value })
            }
            style={modalInput}
          />

          <input
            placeholder="점수 (선택)"
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
            style={modalInput}
          />

          <input
            type="date"
            value={form.expiration_date}
            onChange={(e) =>
              setForm({ ...form, expiration_date: e.target.value })
            }
            style={modalInput}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={modalCancel} onClick={onClose}>
            취소
          </button>

          <button
            style={modalSave}
            onClick={() =>
              form.certification_id &&
              form.acquired_date &&
              onSave({
                certification_id: form.certification_id,
                score: form.score,
                acquired_date: form.acquired_date,
                expiration_date: form.expiration_date || null,
              })
            }
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------- */
/*                 자격증 수정 모달 컴포넌트                  */
/* ----------------------------------------------------------- */

const EditCertModal: React.FC<{
  detail: UserCertDetail;
  setDetail: (d: UserCertDetail) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}> = ({ detail, setDetail, onClose, onSave, onDelete }) => {
  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h3 style={modalTitle}>{detail.certification_name}</h3>

        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e7eb",
            margin: "12px 0 16px 0",
          }}
        />

        <div style={{ display: "grid", gap: 12 }}>
          <input
            placeholder="점수"
            value={detail.score || ""}
            onChange={(e) => setDetail({ ...detail, score: e.target.value })}
            style={modalInput}
          />

          <input
            type="date"
            value={detail.acquired_date}
            onChange={(e) =>
              setDetail({ ...detail, acquired_date: e.target.value })
            }
            style={modalInput}
          />

          <input
            type="date"
            value={detail.expiration_date || ""}
            onChange={(e) =>
              setDetail({ ...detail, expiration_date: e.target.value })
            }
            style={modalInput}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            style={{ ...modalCancel, borderColor: "#ef4444", color: "#ef4444" }}
            onClick={onDelete}
          >
            삭제
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={modalCancel} onClick={onClose}>
              취소
            </button>
            <button style={modalSave} onClick={onSave}>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------- */
/*                           스타일                            */
/* ----------------------------------------------------------- */

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
  objectFit: "contain",
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  padding: 20,
  marginBottom: 26,
  border: `1px solid ${color.border}`,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 14,
};

const sectionTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const formWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 14,
};

const editBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  border: `1.5px solid ${color.orange}`,
  background: color.orange,
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const cancelBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  border: `1.5px solid ${color.orange}`,
  background: "#fff",
  color: color.orange,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const saveBtn: React.CSSProperties = { ...editBtn };

const badge: React.CSSProperties = {
  fontSize: 12,
  border: `1px solid ${color.border}`,
  borderRadius: 999,
  padding: "4px 10px",
};

const listWrap: React.CSSProperties = { display: "grid", gap: 10 };

const bookmarkItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: `1px solid ${color.border}`,
  borderRadius: 14,
  padding: "12px 14px",
};

const bookmarkLeft: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const metaText: React.CSSProperties = { fontSize: 12, color: color.sub };

const miniBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: `1px solid ${color.border}`,
  background: "white",
  fontSize: 12,
  cursor: "pointer",
};

const addCert: React.CSSProperties = {
  color: color.orange,
  fontSize: 14,
  fontWeight: 600,
  marginTop: 12,
  cursor: "pointer",
};

const certList: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginBottom: 12,
};

const certItem: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  borderBottom: `1px solid ${color.border}`,
  paddingBottom: 8,
  cursor: "pointer",
};

const logoutBtn: React.CSSProperties = {
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
  inset: 0,
  background: "rgba(0,0,0,0.25)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalBox: React.CSSProperties = {
  background: "#fff",
  padding: "24px 24px 28px",
  borderRadius: 16,
  width: 340,
  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
};

const modalTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  textAlign: "center",
};

const modalInput: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  background: "#f9fafb",
  marginBottom: 4,
};

const modalCancel: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 10,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: 14,
};

const modalSave: React.CSSProperties = {
  background: color.orange,
  color: "#fff",
  borderRadius: 10,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
  border: "none",
};

export default ProfilePage;
