export async function apiRequest(url: string, options: any = {}) {
  const access = localStorage.getItem("accessToken");
  const refresh = localStorage.getItem("refreshToken");

  options.headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };

  let response = await fetch(url, options);

  if (response.status === 401 && refresh) {
    const refreshRes = await fetch(
      "http://127.0.0.1:8000/auth/token/refresh/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      }
    );

    if (refreshRes.ok) {
      const data = await refreshRes.json();

      localStorage.setItem("accessToken", data.access);

      options.headers.Authorization = `Bearer ${data.access}`;

      response = await fetch(url, options);
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }
  }

  return response;
}
