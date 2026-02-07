import { pool } from '../config/database';
import logger from '../config/logger';

interface SeedTemplateTask {
  id: string;
  order: number;
  name: string;
  category: string;
  estimatedDuration?: number;
  durationUnit: 'hours' | 'days';
  dependsOn?: string[];
  isOptional: boolean;
}

function makeTaskId(prefix: string, order: number): string {
  return `${prefix}_${String(order).padStart(3, '0')}`;
}

function buildTasks(prefix: string, definitions: {
  name: string;
  category: string;
  duration?: number;
  unit?: 'hours' | 'days';
  dependsOnOrders?: number[];
  isOptional?: boolean;
}[]): SeedTemplateTask[] {
  return definitions.map((def, i) => {
    const order = i + 1;
    return {
      id: makeTaskId(prefix, order),
      order,
      name: def.name,
      category: def.category,
      estimatedDuration: def.duration,
      durationUnit: def.unit || 'days',
      dependsOn: def.dependsOnOrders?.map(o => makeTaskId(prefix, o)),
      isOptional: def.isOptional ?? false,
    };
  });
}

async function seedIndustries(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ─── 1. Schreinerei / Zimmerei ───
    const carpentryResult = await client.query<{ id: string }>(
      `INSERT INTO industries (name, description, icon, settings)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        'Schreinerei / Zimmerei',
        'Holzverarbeitung, Türen, Möbel, Innenausbau',
        'carpentry',
        JSON.stringify({
          usePhases: false,
          supportsSubtasks: false,
          terminology: { project: 'Auftrag', task: 'Arbeitsschritt', client: 'Kunde' },
        }),
      ]
    );

    if (carpentryResult.rows.length > 0) {
      const carpentryId = carpentryResult.rows[0].id;

      // Product types for Schreinerei
      const carpentryProducts = [
        { name: 'Rahmentüren', description: 'Türrahmen und Türblätter', icon: 'door' },
        { name: 'Stahlzargen-Türen', description: 'Stahlzargen mit Türblatt', icon: 'door_sliding' },
        { name: 'Schränke / Einbauschränke', description: 'Korpusmöbel und Einbauschränke', icon: 'cabinet' },
        { name: 'Küchen', description: 'Küchenbau und -montage', icon: 'kitchen' },
        { name: 'Schiebetüren', description: 'Schiebetürsysteme', icon: 'door_sliding' },
        { name: 'Badmöbel', description: 'Badezimmermöbel', icon: 'bathroom' },
        { name: 'Büromöbel', description: 'Büroeinrichtung', icon: 'desk' },
        { name: 'Treppen', description: 'Treppenbau', icon: 'stairs' },
        { name: 'Fenster', description: 'Fensterbau', icon: 'window' },
        { name: 'Innenausbau', description: 'Allgemeiner Innenausbau', icon: 'construction' },
      ];

      for (const prod of carpentryProducts) {
        const ptResult = await client.query<{ id: string }>(
          `INSERT INTO product_types (industry_id, name, description, icon)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (industry_id, name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [carpentryId, prod.name, prod.description, prod.icon]
        );
        const ptId = ptResult.rows[0].id;

        // Templates per product type
        if (prod.name === 'Rahmentüren') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Standard Rahmentür',
              'Kompletter Ablauf für Rahmentüren: AVOR bis Montage',
              JSON.stringify(buildTasks('rt', [
                { name: 'AVOR / Liefertermin klären', category: 'planning', duration: 1 },
                { name: 'Türblatt bestellen', category: 'procurement', duration: 1, dependsOnOrders: [1] },
                { name: 'Beschlag bestellen', category: 'procurement', duration: 1, dependsOnOrders: [1] },
                { name: 'Produktion Rahmen', category: 'production', duration: 3, dependsOnOrders: [2, 3] },
                { name: 'Produktion Türblatt', category: 'production', duration: 2, dependsOnOrders: [2] },
                { name: 'Behandlung Rahmen', category: 'treatment', duration: 2, dependsOnOrders: [4] },
                { name: 'Behandlung Türblatt', category: 'treatment', duration: 2, dependsOnOrders: [5] },
                { name: 'Montage Rahmen', category: 'assembly', duration: 1, dependsOnOrders: [6] },
                { name: 'Montage Türblatt', category: 'assembly', duration: 0.5, dependsOnOrders: [7, 8] },
              ])),
            ]
          );
        } else if (prod.name === 'Stahlzargen-Türen') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Standard Stahlzargen',
              'Ablauf für Stahlzargen-Türen',
              JSON.stringify(buildTasks('sz', [
                { name: 'Bestellung Umfassung', category: 'procurement', duration: 1 },
                { name: 'Montage Umfassung', category: 'assembly', duration: 1, dependsOnOrders: [1] },
                { name: 'Montagevorbereitung Türblätter', category: 'planning', duration: 0.5, dependsOnOrders: [2] },
                { name: 'Türblatt bestellen', category: 'procurement', duration: 1, dependsOnOrders: [3] },
                { name: 'Beschlag bestellen', category: 'procurement', duration: 1, dependsOnOrders: [3] },
                { name: 'Montage Türblatt', category: 'assembly', duration: 1, dependsOnOrders: [4, 5] },
              ])),
            ]
          );
        } else if (prod.name === 'Schränke / Einbauschränke') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Standard Schrank',
              'Kompletter Ablauf für Schränke und Einbauschränke',
              JSON.stringify(buildTasks('sc', [
                { name: 'Projektgespräch / Aufmass', category: 'planning', duration: 0.5 },
                { name: 'AVOR / Liefertermin', category: 'planning', duration: 1, dependsOnOrders: [1] },
                { name: 'Material bestellen', category: 'procurement', duration: 1, dependsOnOrders: [2] },
                { name: 'Produktion Korpus', category: 'production', duration: 3, dependsOnOrders: [3] },
                { name: 'Produktion Fronten', category: 'production', duration: 2, dependsOnOrders: [3] },
                { name: 'Behandlung', category: 'treatment', duration: 2, dependsOnOrders: [4, 5] },
                { name: 'Beschläge montieren', category: 'assembly', duration: 1, dependsOnOrders: [6] },
                { name: 'Vormontage', category: 'assembly', duration: 1, dependsOnOrders: [7] },
                { name: 'Lieferung & Montage', category: 'assembly', duration: 1, dependsOnOrders: [8] },
              ])),
            ]
          );
        } else if (prod.name === 'Küchen') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Standard Küche',
              'Vollständiger Küchenbau-Ablauf mit 17 Schritten',
              JSON.stringify(buildTasks('ku', [
                { name: 'Beratungsgespräch', category: 'planning', duration: 2, unit: 'hours' },
                { name: 'Aufmass vor Ort', category: 'planning', duration: 2, unit: 'hours', dependsOnOrders: [1] },
                { name: 'Planung & Offerte', category: 'planning', duration: 4, unit: 'hours', dependsOnOrders: [2] },
                { name: 'Kundenfreigabe', category: 'approval', dependsOnOrders: [3] },
                { name: 'Geräte bestellen', category: 'procurement', duration: 1, dependsOnOrders: [4] },
                { name: 'Arbeitsplatte bestellen', category: 'procurement', duration: 1, dependsOnOrders: [4] },
                { name: 'Beschläge/Armaturen bestellen', category: 'procurement', duration: 1, dependsOnOrders: [4] },
                { name: 'Produktion Korpusse', category: 'production', duration: 5, dependsOnOrders: [4] },
                { name: 'Produktion Fronten', category: 'production', duration: 4, dependsOnOrders: [4] },
                { name: 'Behandlung', category: 'treatment', duration: 3, dependsOnOrders: [8, 9] },
                { name: 'Vormontage Werkstatt', category: 'assembly', duration: 2, dependsOnOrders: [10] },
                { name: 'Demontage alte Küche', category: 'assembly', duration: 0.5, dependsOnOrders: [11] },
                { name: 'Sanitär/Elektro Vorbereitung', category: 'assembly', duration: 1, dependsOnOrders: [12] },
                { name: 'Montage Küche', category: 'assembly', duration: 2, dependsOnOrders: [13, 5] },
                { name: 'Arbeitsplatte montieren', category: 'assembly', duration: 0.5, dependsOnOrders: [14, 6] },
                { name: 'Geräte einbauen', category: 'assembly', duration: 0.5, dependsOnOrders: [15] },
                { name: 'Abnahme mit Kunde', category: 'approval', duration: 1, unit: 'hours', dependsOnOrders: [16] },
              ])),
            ]
          );
        }
        // Other carpentry product types get no default template initially
      }
    }

    // ─── 2. Architekturbüro ───
    const archResult = await client.query<{ id: string }>(
      `INSERT INTO industries (name, description, icon, settings)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        'Architekturbüro',
        'Architektur, Planung, Bauleitung nach SIA-Phasen',
        'architecture',
        JSON.stringify({
          usePhases: true,
          supportsSubtasks: true,
          terminology: { project: 'Projekt', task: 'Phase', client: 'Bauherr' },
        }),
      ]
    );

    if (archResult.rows.length > 0) {
      const archId = archResult.rows[0].id;

      const archProducts = [
        { name: 'Neubau (SIA-Phasen)', description: 'Neubau-Projekt nach SIA 112', icon: 'apartment' },
        { name: 'Umbau / Sanierung', description: 'Umbauten und Sanierungen', icon: 'build' },
        { name: 'Innenarchitektur', description: 'Innenarchitektur-Projekte', icon: 'design_services' },
      ];

      for (const prod of archProducts) {
        const ptResult = await client.query<{ id: string }>(
          `INSERT INTO product_types (industry_id, name, description, icon)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (industry_id, name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [archId, prod.name, prod.description, prod.icon]
        );
        const ptId = ptResult.rows[0].id;

        if (prod.name === 'Neubau (SIA-Phasen)') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Neubau SIA 112',
              'SIA-Phasen 1-6 für Neubauprojekte',
              JSON.stringify(buildTasks('sia', [
                { name: 'Strategische Planung', category: 'planning', duration: 5 },
                { name: 'Vorstudien', category: 'planning', duration: 10, dependsOnOrders: [1] },
                { name: 'Projektierung', category: 'planning', duration: 20, dependsOnOrders: [2] },
                { name: 'Bewilligungsverfahren (Baueingabe)', category: 'approval', dependsOnOrders: [3] },
                { name: 'Ausschreibung', category: 'procurement', duration: 10, dependsOnOrders: [4] },
                { name: 'Offertvergleich & Vergabe', category: 'procurement', duration: 5, dependsOnOrders: [5] },
                { name: 'Ausführungsplanung', category: 'planning', duration: 15, dependsOnOrders: [6] },
                { name: 'Bauleitung', category: 'production', duration: 60, dependsOnOrders: [7] },
                { name: 'Inbetriebnahme', category: 'assembly', duration: 5, dependsOnOrders: [8] },
                { name: 'Abnahme', category: 'approval', duration: 2, dependsOnOrders: [9] },
                { name: 'Dokumentation', category: 'documentation', duration: 5, dependsOnOrders: [10] },
                { name: 'Garantiearbeiten', category: 'production', duration: 10, dependsOnOrders: [11], isOptional: true },
              ])),
            ]
          );
        } else if (prod.name === 'Umbau / Sanierung') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Standard Umbau',
              'Ablauf für Umbau- und Sanierungsprojekte',
              JSON.stringify(buildTasks('umb', [
                { name: 'Bestandsaufnahme', category: 'planning', duration: 3 },
                { name: 'Zustandsanalyse', category: 'planning', duration: 3, dependsOnOrders: [1] },
                { name: 'Machbarkeitsstudie', category: 'planning', duration: 5, dependsOnOrders: [2] },
                { name: 'Vorprojekt', category: 'planning', duration: 10, dependsOnOrders: [3] },
                { name: 'Baueingabe (falls nötig)', category: 'approval', dependsOnOrders: [4], isOptional: true },
                { name: 'Ausführungsprojekt', category: 'planning', duration: 15, dependsOnOrders: [5] },
                { name: 'Ausschreibung', category: 'procurement', duration: 5, dependsOnOrders: [6] },
                { name: 'Vergabe', category: 'procurement', duration: 3, dependsOnOrders: [7] },
                { name: 'Bauleitung', category: 'production', duration: 30, dependsOnOrders: [8] },
                { name: 'Abnahme', category: 'approval', duration: 1, dependsOnOrders: [9] },
              ])),
            ]
          );
        } else if (prod.name === 'Innenarchitektur') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Standard Innenarchitektur',
              'Ablauf für Innenarchitektur-Projekte',
              JSON.stringify(buildTasks('ia', [
                { name: 'Erstgespräch & Briefing', category: 'planning', duration: 0.5 },
                { name: 'Raumanalyse & Aufmass', category: 'planning', duration: 1, dependsOnOrders: [1] },
                { name: 'Konzeptentwicklung', category: 'planning', duration: 3, dependsOnOrders: [2] },
                { name: 'Moodboard & Materialkonzept', category: 'planning', duration: 2, dependsOnOrders: [3] },
                { name: 'Entwurfspräsentation', category: 'approval', duration: 0.5, dependsOnOrders: [4] },
                { name: 'Detailplanung', category: 'planning', duration: 5, dependsOnOrders: [5] },
                { name: 'Kostenvoranschlag', category: 'planning', duration: 2, dependsOnOrders: [6] },
                { name: 'Freigabe Bauherr', category: 'approval', dependsOnOrders: [7] },
                { name: 'Ausschreibung Gewerke', category: 'procurement', duration: 3, dependsOnOrders: [8] },
                { name: 'Ausführungsüberwachung', category: 'production', duration: 15, dependsOnOrders: [9] },
                { name: 'Abnahme', category: 'approval', duration: 0.5, dependsOnOrders: [10] },
              ])),
            ]
          );
        }
      }
    }

    // ─── 3. Metallbau / Schlosserei ───
    const metalResult = await client.query<{ id: string }>(
      `INSERT INTO industries (name, description, icon, settings)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        'Metallbau / Schlosserei',
        'Metallverarbeitung, Geländer, Stahlbau',
        'metalwork',
        JSON.stringify({
          usePhases: false,
          supportsSubtasks: false,
          terminology: { project: 'Auftrag', task: 'Arbeitsschritt', client: 'Kunde' },
        }),
      ]
    );

    if (metalResult.rows.length > 0) {
      const metalId = metalResult.rows[0].id;

      const metalProducts = [
        { name: 'Geländer / Handlauf', description: 'Geländer und Handläufe', icon: 'fence' },
        { name: 'Stahlbau / Tragwerk', description: 'Stahlbau und Tragwerkskonstruktionen', icon: 'foundation' },
      ];

      for (const prod of metalProducts) {
        const ptResult = await client.query<{ id: string }>(
          `INSERT INTO product_types (industry_id, name, description, icon)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (industry_id, name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [metalId, prod.name, prod.description, prod.icon]
        );
        const ptId = ptResult.rows[0].id;

        if (prod.name === 'Geländer / Handlauf') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Standard Geländer',
              'Ablauf für Geländer und Handläufe',
              JSON.stringify(buildTasks('gel', [
                { name: 'Aufmass vor Ort', category: 'planning', duration: 0.5 },
                { name: 'Konstruktion / CAD', category: 'planning', duration: 2, dependsOnOrders: [1] },
                { name: 'Kundenfreigabe', category: 'approval', dependsOnOrders: [2] },
                { name: 'Material bestellen', category: 'procurement', duration: 1, dependsOnOrders: [3] },
                { name: 'Zuschnitt', category: 'production', duration: 1, dependsOnOrders: [4] },
                { name: 'Schweissen', category: 'production', duration: 2, dependsOnOrders: [5] },
                { name: 'Schleifen', category: 'production', duration: 1, dependsOnOrders: [6] },
                { name: 'Oberflächenbehandlung', category: 'treatment', duration: 2, dependsOnOrders: [7] },
                { name: 'Montage', category: 'assembly', duration: 1, dependsOnOrders: [8] },
              ])),
            ]
          );
        } else if (prod.name === 'Stahlbau / Tragwerk') {
          await client.query(
            `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system)
             VALUES ($1, $2, $3, $4, true, true)
             ON CONFLICT (product_type_id, name) DO UPDATE SET tasks = EXCLUDED.tasks`,
            [
              ptId,
              'Standard Stahlbau',
              'Ablauf für Stahlbau und Tragwerke',
              JSON.stringify(buildTasks('stb', [
                { name: 'Statische Berechnung', category: 'planning', duration: 3 },
                { name: 'Werkstattplanung', category: 'planning', duration: 3, dependsOnOrders: [1] },
                { name: 'Freigabe Statiker', category: 'approval', dependsOnOrders: [2] },
                { name: 'Material bestellen', category: 'procurement', duration: 1, dependsOnOrders: [3] },
                { name: 'Zuschnitt', category: 'production', duration: 2, dependsOnOrders: [4] },
                { name: 'Vorfertigung', category: 'production', duration: 5, dependsOnOrders: [5] },
                { name: 'Schweissarbeiten', category: 'production', duration: 3, dependsOnOrders: [6] },
                { name: 'Korrosionsschutz', category: 'treatment', duration: 2, dependsOnOrders: [7] },
                { name: 'Transport', category: 'delivery', duration: 1, dependsOnOrders: [8] },
                { name: 'Montage', category: 'assembly', duration: 3, dependsOnOrders: [9] },
                { name: 'Abnahme Statiker', category: 'approval', duration: 0.5, dependsOnOrders: [10] },
              ])),
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    logger.info('Industries, product types, and task templates seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seedIndustries()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ err: error }, 'Seed industries failed');
    process.exit(1);
  });
