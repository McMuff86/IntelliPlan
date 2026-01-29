export interface ProductType {
  id: string;
  industry_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductTypeResponse {
  id: string;
  industryId: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const toProductTypeResponse = (pt: ProductType): ProductTypeResponse => ({
  id: pt.id,
  industryId: pt.industry_id,
  name: pt.name,
  description: pt.description,
  icon: pt.icon,
  isActive: pt.is_active,
  createdAt: pt.created_at,
  updatedAt: pt.updated_at,
});
