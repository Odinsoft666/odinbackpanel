import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from 'express-async-handler';
import { Bonus } from '../models/Bonus.js';

// @desc    Get all bonuses
// @route   GET /api/bonuses
// @access  Private/Admin
export const getBonuses = asyncHandler(async (req, res, next) => {
  const { type, active } = req.query;
  
  const filter = {};
  if (type) filter.bonusType = type;
  if (active) filter.isActive = active === 'true';
  
  const bonuses = await Bonus.find(filter)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'username')
    .populate('applicableGames', 'name');

  res.status(200).json({
    success: true,
    count: bonuses.length,
    data: bonuses
  });
});

// @desc    Create new bonus
// @route   POST /api/bonuses
// @access  Private/Admin
export const createBonus = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  
  // Check for duplicate code
  if (code) {
    const existingBonus = await Bonus.findOne({ code });
    if (existingBonus) {
      return next(new ErrorResponse(`Bonus with code ${code} already exists`, 400));
    }
  }

  const bonus = await Bonus.create({
    ...req.body,
    createdBy: req.user.id
  });

  logger.info(`Bonus created by admin ${req.user.username}`, { bonusId: bonus._id });

  res.status(201).json({
    success: true,
    data: bonus
  });
});

// @desc    Update bonus
// @route   PUT /api/bonuses/:id
// @access  Private/Admin
export const updateBonus = asyncHandler(async (req, res, next) => {
  let bonus = await Bonus.findById(req.params.id);

  if (!bonus) {
    return next(new ErrorResponse(`Bonus not found with id ${req.params.id}`, 404));
  }

  // Prevent code changes if bonus is active
  if (req.body.code && bonus.code !== req.body.code && bonus.isActive) {
    return next(new ErrorResponse('Cannot change code of an active bonus', 400));
  }

  bonus = await Bonus.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  logger.info(`Bonus updated by admin ${req.user.username}`, { bonusId: bonus._id });

  res.status(200).json({
    success: true,
    data: bonus
  });
});

// @desc    Toggle bonus status
// @route   PUT /api/bonuses/:id/status
// @access  Private/Admin
export const toggleBonusStatus = asyncHandler(async (req, res, next) => {
  const bonus = await Bonus.findById(req.params.id);

  if (!bonus) {
    return next(new ErrorResponse(`Bonus not found with id ${req.params.id}`, 404));
  }

  bonus.isActive = !bonus.isActive;
  await bonus.save();

  const status = bonus.isActive ? 'activated' : 'deactivated';
  logger.info(`Bonus ${status} by admin ${req.user.username}`, { bonusId: bonus._id });

  res.status(200).json({
    success: true,
    data: bonus
  });
});

// @desc    Delete bonus
// @route   DELETE /api/bonuses/:id
// @access  Private/Admin
export const deleteBonus = asyncHandler(async (req, res, next) => {
  const bonus = await Bonus.findById(req.params.id);

  if (!bonus) {
    return next(new ErrorResponse(`Bonus not found with id ${req.params.id}`, 404));
  }

  if (bonus.isActive) {
    return next(new ErrorResponse('Cannot delete an active bonus', 400));
  }

  await bonus.deleteOne();

  logger.info(`Bonus deleted by admin ${req.user.username}`, { bonusId: bonus._id });

  res.status(200).json({
    success: true,
    data: {}
  });
});