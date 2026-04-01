import axios from "axios";

const url ="https://payu-main-service-717740758627.us-east1.run.app";
const api = axios.create({
  baseURL: url,
  withCredentials: true,
});

export default api;