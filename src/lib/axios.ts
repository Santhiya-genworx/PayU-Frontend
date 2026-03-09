import axios from "axios";
import { apiUrl } from "../config/env";

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

export default api;