// src/api/client.ts
import axios from "axios";
import {
  TRADE_PRODUCTION_API_KEY,
  TRADE_SANDBOX_API_KEY,
  TRADE_STAGING_API_KEY,
} from "./consts";

export const tradeServiceStagingClient = axios.create({
  baseURL: "https://okto-trade-service-kong.oktostage.com/v1",
  timeout: 30000,
  headers: {
    "X-Api-Key": TRADE_STAGING_API_KEY,
  },
});

// Only for Local Development
export const tradeServiceSandboxClient = axios.create({
  baseURL: "/trade-sandbox-api-proxy",
  timeout: 30000,
});

// export const tradeServiceSandboxClient = axios.create({
//   baseURL: "https://sandbox-okto-trade-service-kong.okto.tech/v1",
//   timeout: 30000,
//   headers: {
//     "X-Api-Key": TRADE_SANDBOX_API_KEY,
//   },
// });

export const tradeServiceProductionClient = axios.create({
  baseURL: "https://okto-trade-service-kong.okto.tech/v1",
  timeout: 30000,
  headers: {
    "X-Api-Key": TRADE_PRODUCTION_API_KEY,
  },
});

tradeServiceSandboxClient.interceptors.request.use((config) => {
  const storedSecret = localStorage.getItem("TRADE_SERVICE_SECRET");
  const defaultSecret = import.meta.env.VITE_TRADE_SERVICE_SANDBOX_API_KEY;

  config.headers["X-Api-Key"] = storedSecret || defaultSecret;

  return config;
});