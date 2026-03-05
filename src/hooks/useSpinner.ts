import { useLoading } from "../context/loadingContext";

export const useSpinner = () => {
  const { startLoading, stopLoading } = useLoading();

  const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    startLoading();
    try {
      const response = await fetch(input, init);
      return response;
    } finally {
      stopLoading();
    }
  };

  return apiFetch;
};