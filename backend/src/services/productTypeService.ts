import { pool } from '../config/database';
import type { ProductType } from '../models/productType';

export async function listProductTypes(industryId?: string): Promise<ProductType[]> {
  if (industryId) {
    const result = await pool.query<ProductType>(
      `SELECT * FROM product_types WHERE industry_id = $1 ORDER BY name ASC`,
      [industryId]
    );
    return result.rows;
  }

  const result = await pool.query<ProductType>(
    `SELECT * FROM product_types ORDER BY name ASC`
  );
  return result.rows;
}

export async function getProductTypeById(id: string): Promise<ProductType | null> {
  const result = await pool.query<ProductType>(
    `SELECT * FROM product_types WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export interface CreateProductTypeDTO {
  industry_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active?: boolean;
}

export async function createProductType(data: CreateProductTypeDTO): Promise<ProductType> {
  const result = await pool.query<ProductType>(
    `INSERT INTO product_types (industry_id, name, description, icon, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.industry_id,
      data.name,
      data.description || null,
      data.icon || null,
      data.is_active ?? true,
    ]
  );
  return result.rows[0];
}

export interface UpdateProductTypeDTO {
  name?: string;
  description?: string | null;
  icon?: string | null;
  is_active?: boolean;
}

export async function updateProductType(id: string, data: UpdateProductTypeDTO): Promise<ProductType | null> {
  const fields: string[] = [];
  const values: (string | boolean | null)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.icon !== undefined) {
    fields.push(`icon = $${paramIndex++}`);
    values.push(data.icon);
  }
  if (data.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }

  if (fields.length === 0) {
    return getProductTypeById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<ProductType>(
    `UPDATE product_types SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteProductType(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM product_types WHERE id = $1`,
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
