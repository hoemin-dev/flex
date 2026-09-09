const configuredApiUrl = import.meta.env.VITE_FLEX_API_URL?.trim();

export const backendConfig = {
  apiUrl: (configuredApiUrl || "http://localhost:8787").replace(/\/$/, "")
};
