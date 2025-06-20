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

export const tradeServiceSandboxClient = axios.create({
  baseURL: "/trade-sandbox-api-proxy",
  timeout: 30000,
});

export const tradeServiceProductionClient = axios.create({
  baseURL: "https://okto-trade-service-kong.okto.tech/v1",
  timeout: 30000,
  headers: {
    "X-Api-Key": TRADE_PRODUCTION_API_KEY,
  },
});

