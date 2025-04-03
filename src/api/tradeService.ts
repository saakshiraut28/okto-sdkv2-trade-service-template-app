import { tradeServiceClient } from "./client";

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
  payload: GetQuoteRequest
): Promise<GetQuoteResponseData> => {
  const response = await tradeServiceClient.post("/get-quote", payload);
  return response.data.data;
};

// get complete route info
export const getBestRoute = async (
  payload: GetBestRouteRequest
): Promise<GetBestRouteResponse> => {
  const response = await tradeServiceClient.post("/get-best-route", payload);
  return response.data.data;
};

// generate call data for trade
export const getCallData = async (
  payload: GetCallDataRequest
): Promise<GetCallDataResponse> => {
  const response = await tradeServiceClient.post("/get-call-data", payload);
  return response.data.data;
};

// execute cross chain order
export const registerIntent = async (
  payload: RegisterIntentRequest
): Promise<null> => {
  const response = await tradeServiceClient.post("/intent/register", payload);
  return response.data.data;
};

// get order details
export const getOrderDetails = async (
  payload: GetOrderDetailsRequest
): Promise<IntentDetailsResponse> => {
  const response = await tradeServiceClient.post("/order-details", payload);
  return response.data.data;
};
