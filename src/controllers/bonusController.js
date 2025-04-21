import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from 'express-async-handler';
import { Bonus } from '../models/Bonus.js';

export const getBonuses = asyncHandler(async (req, res, next) => {
  const bonuses = await Bonus.find({})
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: bonuses.length,
    data: bonuses
  });
});

export const createBonus = asyncHandler(async (req, res, next) => {
  const bonus = await Bonus.create(req.body);

  logger.info(`Bonus created by admin ${req.user.username}`);
  res.status(201).json({
    success: true,
    data: bonus
  });
});