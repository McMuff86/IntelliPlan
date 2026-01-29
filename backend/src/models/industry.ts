export interface IndustrySettings {
  usePhases: boolean;
  supportsSubtasks: boolean;
  terminology: {
    project: string;
    task: string;
    client: string;
  };
}

export interface Industry {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  settings: IndustrySettings;
  created_at: string;
  updated_at: string;
}

export interface IndustryResponse {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  settings: IndustrySettings;
  createdAt: string;
  updatedAt: string;
}

export const toIndustryResponse = (industry: Industry): IndustryResponse => ({
  id: industry.id,
  name: industry.name,
  description: industry.description,
  icon: industry.icon,
  settings: industry.settings,
  createdAt: industry.created_at,
  updatedAt: industry.updated_at,
});
