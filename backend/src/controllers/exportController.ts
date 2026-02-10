import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { exportWochenplanCSV } from '../services/exportService';
import { getISOWeek, getISOWeekYear } from 'date-fns';

export async function exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const now = new Date();
    const kw = req.query.kw ? parseInt(req.query.kw as string, 10) : getISOWeek(now);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : getISOWeekYear(now);
    const department = req.query.department as string | undefined;

    const csv = await exportWochenplanCSV(kw, year, req.userId, department);

    const filename = `wochenplan-kw${String(kw).padStart(2, '0')}-${year}${department ? `-${department}` : ''}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Add BOM for Excel UTF-8 compatibility
    res.status(200).send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
}
