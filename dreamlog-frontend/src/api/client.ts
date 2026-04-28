/// <reference types="vite/client" />

interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  fetchImpl?: typeof fetch;
}

type RequestBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiClient({ baseUrl, getToken, fetchImpl }: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: RequestBody): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
      Accept: "application/json"
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await (fetchImpl ?? fetch)(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      let message = `Request failed: ${response.status}`;

      try {
        const data = (await response.json()) as { detail?: unknown };
        if (typeof data.detail === "string") {
          message = data.detail;
        }
      } catch {
        message = `Request failed: ${response.status}`;
      }

      throw new ApiError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: RequestBody) => request<T>("POST", path, body),
    put: <T>(path: string, body?: RequestBody) => request<T>("PUT", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path)
  };
}

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1",
  getToken: () => localStorage.getItem("dreamlog_token")
});
