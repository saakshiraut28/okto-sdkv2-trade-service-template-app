// src/api/client.ts
import axios from "axios";

export const tradeServiceClient = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Add interceptor to inject custom header
tradeServiceClient.interceptors.request.use((config) => {
  const secret = import.meta.env.VITE_TRADE_SERVICE_SECRET;
  if (secret) {
    config.headers["x-authorization-secret"] = secret;
  }
  return config;
});
