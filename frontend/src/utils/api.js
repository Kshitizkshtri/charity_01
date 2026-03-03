import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("charity_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);
export const updateWallet = (wallet_address) =>
  api.patch("/auth/wallet", { wallet_address });

// Campaigns
export const getCampaigns = (params) => api.get("/campaigns", { params });
export const getCampaign = (id) => api.get(`/campaigns/${id}`);
export const createCampaign = (data) => api.post("/campaigns", data);
export const recordDonation = (campaignId, data) =>
  api.post(`/campaigns/${campaignId}/donate`, data);
export const getCampaignDonations = (id, params) =>
  api.get(`/campaigns/${id}/donations`, { params });
export const recordMilestoneRelease = (campaignId, idx, data) =>
  api.post(`/campaigns/${campaignId}/milestones/${idx}/release`, data);
export const getPlatformStats = () => api.get("/campaigns/stats/platform");

// Organizations
export const getOrganizations = () => api.get("/organizations");
export const getOrganization = (id) => api.get(`/organizations/${id}`);
export const registerOrganization = (data) => api.post("/organizations", data);
export const verifyOrganization = (id, verified) =>
  api.patch(`/organizations/${id}/verify`, { verified });
export const getMyOrg = () => api.get("/organizations/me/profile");

// IPFS
export const uploadFile = (formData) =>
  api.post("/ipfs/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const uploadJSON = (data, name) =>
  api.post("/ipfs/json", { data, name });

export default api;
