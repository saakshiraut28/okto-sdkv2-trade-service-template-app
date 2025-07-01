// src/utils/apiError.ts

import { AxiosError } from "axios";
import { ErrorResponse } from "../types/api/tradeService";

export function handleApiError(err: unknown): string {
  if (isAxiosError(err)) {
    const apiError = err.response?.data as { error?: ErrorResponse };

    if (apiError?.error?.message) {
      return apiError.error.message;
    }

    if (err.response?.status === 404) {
      return "API endpoint not found.";
    }

    return "An unexpected error occurred while calling the API.";
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Unknown error occurred.";
}

function isAxiosError(err: unknown): err is AxiosError {
  return (err as AxiosError)?.isAxiosError === true;
}
