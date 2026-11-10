const configuredBasePath = import.meta.env.VITE_API_BASE_PATH ?? "/api";

export const apiBasePath = configuredBasePath.replace(/\/$/, "");
