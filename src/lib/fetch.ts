export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/api/auth/force-logout";
    return new Promise(() => {});
  }
  return res;
}
