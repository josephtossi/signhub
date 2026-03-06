const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ApiOptions = RequestInit & {
  token?: string;
  skipJsonContentType?: boolean;
};

export async function api<T>(path: string, init?: ApiOptions): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }
  if (!init?.skipJsonContentType && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers
  });

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
