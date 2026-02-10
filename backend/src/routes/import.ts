import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseWochenplanExcel, mapToIntelliPlan, validateImport, executeImport } from '../services/importService';
import { requireUserId } from '../middleware/roleMiddleware';
import logger from '../config/logger';

const router = Router();

// Configure multer for file upload (memory storage, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream', // Some browsers send xlsx as this
    ];
    const allowedExts = ['.xlsx', '.xls'];
    const hasValidMime = allowedMimes.includes(file.mimetype);
    const hasValidExt = allowedExts.some((ext) => file.originalname.toLowerCase().endsWith(ext));

    if (hasValidMime || hasValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Nur Excel-Dateien (.xlsx) sind erlaubt'));
    }
  },
});

/**
 * POST /api/import/wochenplan/validate
 * Dry-run: Parse and validate an Excel file without importing.
 */
router.post('/wochenplan/validate', requireUserId, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
      return;
    }

    const userId = req.userId!;

    logger.info({ filename: req.file.originalname, size: req.file.size }, 'Validating Wochenplan import');

    // 1. Parse Excel
    const parsed = await parseWochenplanExcel(req.file.buffer);

    if (parsed.sheets.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Keine KW-Sheets im Excel gefunden. Erwarte Sheet-Namen wie "KW06", "KW07", etc.',
      });
      return;
    }

    // 2. Map to import plan
    const plan = mapToIntelliPlan(parsed);

    // 3. Validate
    const validation = await validateImport(plan, userId);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error({ error }, 'Error validating Wochenplan import');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Validierung',
    });
  }
});

/**
 * POST /api/import/wochenplan/execute
 * Parse, validate, and import an Excel file.
 */
router.post('/wochenplan/execute', requireUserId, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
      return;
    }

    const userId = req.userId!;

    logger.info({ filename: req.file.originalname, size: req.file.size, userId }, 'Executing Wochenplan import');

    // 1. Parse
    const parsed = await parseWochenplanExcel(req.file.buffer);

    if (parsed.sheets.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Keine KW-Sheets im Excel gefunden.',
      });
      return;
    }

    // 2. Map
    const plan = mapToIntelliPlan(parsed);

    // 3. Validate first
    const validation = await validateImport(plan, userId);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: 'Validierung fehlgeschlagen',
        validation,
      });
      return;
    }

    // 4. Execute
    const result = await executeImport(plan, userId);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error executing Wochenplan import');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Import',
    });
  }
});

export default router;
