export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Non authentifié");
  }
  return res;
}
