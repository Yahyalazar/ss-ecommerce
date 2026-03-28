const DEV_API_ORIGIN = "http://localhost:5000";
const PROD_API_ORIGIN = "https://full-stack-ecommerce-n5at.onrender.com";

const resolveApiOrigin = () => {
  const explicitUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const envSpecificUrl =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_API_URL_PROD?.trim()
      : process.env.NEXT_PUBLIC_API_URL_DEV?.trim();

  return (
    explicitUrl ||
    envSpecificUrl ||
    (process.env.NODE_ENV === "production"
      ? PROD_API_ORIGIN
      : DEV_API_ORIGIN)
  );
};

const normalizeApiBaseUrl = (value: string) =>
  value.replace(/\/+$/, "").replace(/\/api\/v1$/, "");

export const API_ORIGIN = normalizeApiBaseUrl(resolveApiOrigin());
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
export const AUTH_API_BASE_URL = API_BASE_URL;
export const GRAPHQL_URL = `${API_BASE_URL}/graphql`;
