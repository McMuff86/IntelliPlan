import { body, query, ValidationChain } from 'express-validator';

const bereichValues = ['avor', 'montage', 'planung', 'material'];
const prioritaetValues = ['hoch', 'mittel', 'niedrig'];
const statusValues = ['offen', 'in_arbeit', 'erledigt'];
const kategorieValues = ['projekt', 'allgemein', 'benutzer'];
const sortValues = [
  'faellig_bis', '-faellig_bis',
  'erstellt_am', '-erstellt_am',
  'nr', '-nr',
  'prioritaet', '-prioritaet',
];

export const createPendenzValidator: ValidationChain[] = [
  body('beschreibung')
    .trim()
    .notEmpty()
    .withMessage('Beschreibung is required')
    .isLength({ max: 5000 })
    .withMessage('Beschreibung must be less than 5000 characters'),
  body('bereich')
    .notEmpty()
    .withMessage('Bereich is required')
    .isIn(bereichValues)
    .withMessage(`Bereich must be one of: ${bereichValues.join(', ')}`),
  body('verantwortlichId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('verantwortlichId must be a valid UUID'),
  body('prioritaet')
    .optional()
    .isIn(prioritaetValues)
    .withMessage(`Prioritaet must be one of: ${prioritaetValues.join(', ')}`),
  body('faelligBis')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('faelligBis must be ISO 8601'),
  body('bemerkungen')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Bemerkungen must be less than 5000 characters'),
  body('auftragsnummer')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Auftragsnummer must be less than 50 characters'),
  body('kategorie')
    .optional()
    .isIn(kategorieValues)
    .withMessage(`Kategorie must be one of: ${kategorieValues.join(', ')}`),
];

export const updatePendenzValidator: ValidationChain[] = [
  body('beschreibung')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Beschreibung cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Beschreibung must be less than 5000 characters'),
  body('bereich')
    .optional()
    .isIn(bereichValues)
    .withMessage(`Bereich must be one of: ${bereichValues.join(', ')}`),
  body('verantwortlichId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('verantwortlichId must be a valid UUID'),
  body('prioritaet')
    .optional()
    .isIn(prioritaetValues)
    .withMessage(`Prioritaet must be one of: ${prioritaetValues.join(', ')}`),
  body('status')
    .optional()
    .isIn(statusValues)
    .withMessage(`Status must be one of: ${statusValues.join(', ')}`),
  body('faelligBis')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('faelligBis must be ISO 8601'),
  body('erledigtAm')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('erledigtAm must be ISO 8601'),
  body('bemerkungen')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Bemerkungen must be less than 5000 characters'),
  body('auftragsnummer')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Auftragsnummer must be less than 50 characters'),
  body('kategorie')
    .optional()
    .isIn(kategorieValues)
    .withMessage(`Kategorie must be one of: ${kategorieValues.join(', ')}`),
];

export const listPendenzenQueryValidator: ValidationChain[] = [
  query('status')
    .optional()
    .isIn(statusValues)
    .withMessage(`Status must be one of: ${statusValues.join(', ')}`),
  query('verantwortlich')
    .optional()
    .isUUID()
    .withMessage('verantwortlich must be a valid UUID'),
  query('bereich')
    .optional()
    .isIn(bereichValues)
    .withMessage(`Bereich must be one of: ${bereichValues.join(', ')}`),
  query('ueberfaellig')
    .optional()
    .isBoolean()
    .withMessage('ueberfaellig must be boolean'),
  query('sort')
    .optional()
    .isIn(sortValues)
    .withMessage(`Sort must be one of: ${sortValues.join(', ')}`),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be >= 0'),
];
