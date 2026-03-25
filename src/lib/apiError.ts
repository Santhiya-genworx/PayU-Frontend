export interface ApiError {
  response?: { status?: number; data?: { message?: string } };
  message?: string;
}

export function isApiError(err: unknown): err is ApiError {
  return typeof err === "object" && err !== null;
}
