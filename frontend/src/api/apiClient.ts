import { toast } from "react-hot-toast";

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const access = localStorage.getItem("accessToken");
  const refresh = localStorage.getItem("refreshToken");

  options.headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };

  // 최초 요청
  let response = await fetch(url, options);

  // accessToken 만료 → refreshToken 시도
  if (response.status === 401 && refresh) {
    const refreshRes = await fetch(
      "http://127.0.0.1:8000/auth/token/refresh/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      }
    );

    // refreshToken 정상 → accessToken 재발급 후 재요청
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem("accessToken", data.access);

      // Authorization 헤더 갱신
      options.headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${data.access}`,
      };

      // 요청 재시도
      response = await fetch(url, options);
    }

    // refreshToken 실패 → 완전히 만료됨
    else {
      // 토큰 삭제
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      // 토스트 메시지 출력
      toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");

      // 로그인 화면으로 이동
      window.location.href = "/login";
      return Promise.reject("Session expired");
    }
  }

  return response;
}
