import { apiBaseUrl } from "./client";

export function resolveAssetUrl(assetUrl: string) {
  if (assetUrl.startsWith("data:") || /^https?:\/\//.test(assetUrl)) {
    return assetUrl;
  }

  const apiOrigin = new URL(apiBaseUrl).origin;
  return `${apiOrigin}${assetUrl}`;
}
