import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getWeekPlan } from '../services/wochenplanService';

export async function getWochenplan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    // Default to current ISO week if not provided
    const now = new Date();
    const currentYear = now.getFullYear();
    // Calculate current ISO week
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
    const dayOfYear = Math.floor(
      (now.getTime() - startOfYear.getTime()) / 86400000
    );
    const currentKw = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);

    const kw = req.query.kw ? parseInt(req.query.kw as string, 10) : currentKw;
    const year = req.query.year
      ? parseInt(req.query.year as string, 10)
      : currentYear;

    if (isNaN(kw) || kw < 1 || kw > 53) {
      res.status(400).json({
        success: false,
        error: 'kw must be a number between 1 and 53',
      });
      return;
    }

    if (isNaN(year) || year < 2020 || year > 2099) {
      res.status(400).json({
        success: false,
        error: 'year must be a number between 2020 and 2099',
      });
      return;
    }

    const weekPlan = await getWeekPlan(kw, year);

    res.status(200).json({
      success: true,
      data: weekPlan,
    });
  } catch (error) {
    next(error);
  }
}
