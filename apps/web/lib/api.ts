const PROD_API_FALLBACK = "https://signhub-api-production.up.railway.app/v1";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname.endsWith(".railway.app")
    ? PROD_API_FALLBACK
    : "http://localhost:4000/v1");

type ApiOptions = RequestInit & {
  skipJsonContentType?: boolean;
  _retry?: boolean;
};

export async function api<T>(path: string, init?: ApiOptions): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!init?.skipJsonContentType && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers
  });

  if (res.status === 401 && !init?._retry && path !== "/auth/refresh") {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    if (refreshRes.ok) {
      return api<T>(path, { ...init, _retry: true });
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API request failed: ${res.status} ${text}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await res.json()) as T;
  }
  return undefined as T;
}
