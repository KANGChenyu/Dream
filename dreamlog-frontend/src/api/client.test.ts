import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, apiBaseUrl, createApiClient } from "./client";

describe("createApiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("attaches bearer token when available", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" })
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api/v1",
      getToken: () => "abc123",
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await client.get("/auth/me");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/auth/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer abc123"
        })
      })
    );
  });

  it("sends json content type and serialized body when a body exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: "ok" })
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api/v1",
      getToken: () => null,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await client.post("/auth/login/phone", { phone: "13800000000", code: "000000" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/auth/login/phone",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({ phone: "13800000000", code: "000000" })
      })
    );
  });

  it("throws ApiError with backend detail for failed responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "验证码错误" })
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api/v1",
      getToken: () => null,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await expect(
      client.post("/auth/login/phone", { phone: "13800000000", code: "000000" })
    ).rejects.toMatchObject(new ApiError("验证码错误", 400));
  });
});

describe("api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("uses the configured api base url and local storage token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 })
    });
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("dreamlog_token", "stored-token");

    await api.get("/auth/me");

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/auth/me`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer stored-token"
        })
      })
    );
  });
});
