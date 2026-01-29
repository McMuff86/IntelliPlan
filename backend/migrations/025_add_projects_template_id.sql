ALTER TABLE projects ADD COLUMN IF NOT EXISTS task_template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL;
