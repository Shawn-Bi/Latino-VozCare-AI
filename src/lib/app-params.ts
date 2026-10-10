import { getAccessToken } from "@base44/sdk";

// Minimal app-params for OAuthConsent and other platform pages.
export const appParams = {
  get token() {
    try {
      return getAccessToken();
    } catch {
      return null;
    }
  },
  appId: "6aca7bb397b1030686eef3a2",
};