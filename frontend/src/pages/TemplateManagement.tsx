import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Breadcrumbs from '../components/Breadcrumbs';
import TemplateEditor from '../components/TemplateEditor';
import { industryService } from '../services/industryService';
import { productTypeService } from '../services/productTypeService';
import { taskTemplateService } from '../services/taskTemplateService';
import type { Industry, ProductType, TaskTemplate, TemplateTask } from '../types';

const categoryLabels: Record<string, string> = {
  planning: 'Planung',
  procurement: 'Beschaffung',
  production: 'Produktion',
  treatment: 'Behandlung',
  assembly: 'Montage',
  delivery: 'Lieferung',
  approval: 'Freigabe',
  documentation: 'Dokumentation',
};

export default function TemplateManagement() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [productTypes, setProductTypes] = useState<Map<string, ProductType[]>>(new Map());
  const [templates, setTemplates] = useState<Map<string, TaskTemplate[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [editorProductTypeId, setEditorProductTypeId] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const inds = await industryService.getAll();
      setIndustries(inds);

      const ptMap = new Map<string, ProductType[]>();
      const tmplMap = new Map<string, TaskTemplate[]>();

      for (const ind of inds) {
        const pts = await productTypeService.getAll(ind.id);
        ptMap.set(ind.id, pts);

        for (const pt of pts) {
          const tmpls = await taskTemplateService.getAll(pt.id);
          tmplMap.set(pt.id, tmpls);
        }
      }

      setProductTypes(ptMap);
      setTemplates(tmplMap);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleProductType = async (pt: ProductType) => {
    try {
      await productTypeService.getById(pt.id); // verify exists
      // For now, toggle is visual-only since product type active status
      // is managed at the backend level
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setEditorProductTypeId(template.productTypeId);
    setEditorOpen(true);
  };

  const handleCreateTemplate = (productTypeId: string) => {
    setEditingTemplate(null);
    setEditorProductTypeId(productTypeId);
    setEditorOpen(true);
  };

  const handleDeleteTemplate = async (template: TaskTemplate) => {
    if (template.isSystem) return;
    try {
      await taskTemplateService.delete(template.id);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Fehler beim Löschen des Templates');
    }
  };

  const handleEditorSave = async (data: {
    name: string;
    description: string;
    tasks: TemplateTask[];
    isDefault: boolean;
  }) => {
    try {
      if (editingTemplate) {
        await taskTemplateService.update(editingTemplate.id, {
          name: data.name,
          description: data.description,
          tasks: data.tasks,
          isDefault: data.isDefault,
        });
      } else {
        await taskTemplateService.create({
          productTypeId: editorProductTypeId,
          name: data.name,
          description: data.description,
          tasks: data.tasks,
          isDefault: data.isDefault,
        });
      }
      setEditorOpen(false);
      setEditingTemplate(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Fehler beim Speichern des Templates');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs
        items={[
          { label: 'Settings', href: '/settings' },
          { label: 'Branchen-Templates' },
        ]}
      />
      <Typography variant="h4" component="h1" gutterBottom>
        Branchen-Templates verwalten
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Verwalten Sie Produkttypen und Aufgaben-Vorlagen für Ihre Branchen.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {industries.map((industry) => {
        const pts = productTypes.get(industry.id) || [];
        return (
          <Paper key={industry.id} sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {industry.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {industry.description}
            </Typography>

            {/* Product type toggles */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {pts.map((pt) => (
                <FormControlLabel
                  key={pt.id}
                  control={
                    <Switch
                      checked={pt.isActive}
                      onChange={() => handleToggleProductType(pt)}
                      size="small"
                    />
                  }
                  label={pt.name}
                />
              ))}
            </Box>

            {/* Templates per product type */}
            {pts
              .filter((pt) => pt.isActive)
              .map((pt) => {
                const ptTemplates = templates.get(pt.id) || [];
                return (
                  <Accordion key={pt.id} variant="outlined" sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        {pt.name}
                        <Chip
                          label={`${ptTemplates.length} Vorlagen`}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {ptTemplates.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Keine Vorlagen vorhanden.
                        </Typography>
                      ) : (
                        <Stack spacing={1}>
                          {ptTemplates.map((tmpl) => (
                            <Paper
                              key={tmpl.id}
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Box>
                                <Typography variant="body1">
                                  {tmpl.name}
                                  {tmpl.isDefault && (
                                    <Chip label="Standard" size="small" color="primary" sx={{ ml: 1 }} />
                                  )}
                                  {tmpl.isSystem && (
                                    <Chip label="System" size="small" variant="outlined" sx={{ ml: 1 }} />
                                  )}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {tmpl.tasks.length} Schritte
                                  {tmpl.description ? ` — ${tmpl.description}` : ''}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={0.5}>
                                {!tmpl.isSystem && (
                                  <>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditTemplate(tmpl)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteTemplate(tmpl)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      )}

                      <Button
                        startIcon={<AddIcon />}
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={() => handleCreateTemplate(pt.id)}
                      >
                        Neues Template erstellen
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
          </Paper>
        );
      })}

      <TemplateEditor
        open={editorOpen}
        template={editingTemplate}
        onClose={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleEditorSave}
      />
    </Box>
  );
}
