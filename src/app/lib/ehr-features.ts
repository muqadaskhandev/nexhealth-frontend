import { api } from "./api";

export type EhrFeature = {
  id: string;
  label: string;
  description: string;
  status: "coming_soon" | "available";
};

export type EhrFeaturesResponse = {
  enabled: boolean;
  message: string;
  features: EhrFeature[];
};

export const EHR_COMING_SOON_MESSAGE =
  "EHR synchronization is coming soon. You can preview settings now, but live sync is not available yet.";

export const ehrApi = {
  features: () => api.get<EhrFeaturesResponse>("/api/ehr/features"),
};
