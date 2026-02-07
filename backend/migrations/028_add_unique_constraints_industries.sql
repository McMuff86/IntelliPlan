-- Deduplicate industries: keep the oldest row per name
DELETE FROM industries
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM industries
  ORDER BY name, created_at ASC
);

-- Deduplicate product_types: keep the oldest row per (industry_id, name)
DELETE FROM product_types
WHERE id NOT IN (
  SELECT DISTINCT ON (industry_id, name) id
  FROM product_types
  ORDER BY industry_id, name, created_at ASC
);

-- Deduplicate task_templates: keep the oldest row per (product_type_id, name)
DELETE FROM task_templates
WHERE id NOT IN (
  SELECT DISTINCT ON (product_type_id, name) id
  FROM task_templates
  ORDER BY product_type_id, name, created_at ASC
);

-- Add unique constraints
ALTER TABLE industries ADD CONSTRAINT uq_industries_name UNIQUE (name);
ALTER TABLE product_types ADD CONSTRAINT uq_product_types_industry_name UNIQUE (industry_id, name);
ALTER TABLE task_templates ADD CONSTRAINT uq_task_templates_product_type_name UNIQUE (product_type_id, name);
