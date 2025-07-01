import {
  tradeServiceStagingClient,
  tradeServiceSandboxClient,
  tradeServiceProductionClient,
} from "./client";

import {
  GetQuoteRequest,
  GetQuoteResponseData,
  GetBestRouteRequest,
  GetCallDataRequest,
  GetCallDataResponse,
  GetBestRouteResponse,
  IntentDetailsResponse,
  GetOrderDetailsRequest,
  RegisterIntentRequest,
} from "../types/api/tradeService";

// pathfinder
export const getQuote = async (
  env: string,
  payload: GetQuoteRequest
): Promise<GetQuoteResponseData> => {
  let tradeServiceClient;
  switch (env) {
    case "production":
      tradeServiceClient = tradeServiceProductionClient;
      break;
    case "staging":
      tradeServiceClient = tradeServiceStagingClient;
      break;
    case "sandbox":
      tradeServiceClient = tradeServiceSandboxClient;
      break;
    default:
      throw new Error("Invalid environment");
  }

  const response = await tradeServiceClient.post("/get-quote", payload);
  return response.data.data;
};

// get complete route info
export const getBestRoute = async (
  env: string,
  payload: GetBestRouteRequest
): Promise<GetBestRouteResponse> => {
  let tradeServiceClient;
  switch (env) {
    case "production":
      tradeServiceClient = tradeServiceProductionClient;
      break;
    case "staging":
      tradeServiceClient = tradeServiceStagingClient;
      break;
    case "sandbox":
      tradeServiceClient = tradeServiceSandboxClient;
      break;
    default:
      throw new Error("Invalid environment");
  }
  const response = await tradeServiceClient.post("/get-best-route", payload);
  return response.data.data;
};

// generate call data for trade
export const getCallData = async (
  env: string,
  payload: GetCallDataRequest
): Promise<GetCallDataResponse> => {
  let tradeServiceClient;
  switch (env) {
    case "production":
      tradeServiceClient = tradeServiceProductionClient;
      break;
    case "staging":
      tradeServiceClient = tradeServiceStagingClient;
      break;
    case "sandbox":
      tradeServiceClient = tradeServiceSandboxClient;
      break;
    default:
      throw new Error("Invalid environment");
  }
  const response = await tradeServiceClient.post("/get-call-data", payload);
  return response.data.data;
};

// execute cross chain order
export const registerIntent = async (
  env: string,
  payload: RegisterIntentRequest
): Promise<null> => {
  let tradeServiceClient;
  switch (env) {
    case "production":
      tradeServiceClient = tradeServiceProductionClient;
      break;
    case "staging":
      tradeServiceClient = tradeServiceStagingClient;
      break;
    case "sandbox":
      tradeServiceClient = tradeServiceSandboxClient;
      break;
    default:
      throw new Error("Invalid environment");
  }
  const response = await tradeServiceClient.post("/intent/register", payload);
  return response.data.data;
};

// get order details
export const getOrderDetails = async (
  env: string,
  payload: GetOrderDetailsRequest
): Promise<IntentDetailsResponse> => {
  let tradeServiceClient;
  switch (env) {
    case "production":
      tradeServiceClient = tradeServiceProductionClient;
      break;
    case "staging":
      tradeServiceClient = tradeServiceStagingClient;
      break;
    case "sandbox":
      tradeServiceClient = tradeServiceSandboxClient;
      break;
    default:
      throw new Error("Invalid environment");
  }
  const response = await tradeServiceClient.post("/order-details", payload);
  return response.data.data;
};
