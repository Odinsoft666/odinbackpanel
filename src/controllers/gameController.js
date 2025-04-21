import Game from '../models/Game.js';
import asyncHandler from 'express-async-handler';
import ErrorResponse from '../utils/errorResponse.js';
import { logger } from '../utils/logger.js';

// @desc    Get all games
// @route   GET /api/games
// @access  Private
export const getGames = asyncHandler(async (req, res, next) => {
  const games = await Game.find({ isActive: true })
    .sort({ name: 1 })
    .select('-__v');

  res.status(200).json({
    success: true,
    count: games.length,
    data: games
  });
});

// @desc    Get single game
// @route   GET /api/games/:id
// @access  Private
export const getGameById = asyncHandler(async (req, res, next) => {
  const game = await Game.findById(req.params.id);

  if (!game) {
    logger.warn(`Game not found with id of ${req.params.id}`);
    return next(
      new ErrorResponse(`Game not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: game
  });
});

// @desc    Create new game
// @route   POST /api/games
// @access  Private/Admin
export const createGame = asyncHandler(async (req, res, next) => {
  const game = await Game.create(req.body);

  logger.info(`Game created: ${game.name} by admin ${req.user.username}`);
  res.status(201).json({
    success: true,
    data: game
  });
});

// @desc    Update game
// @route   PUT /api/games/:id
// @access  Private/Admin
export const updateGame = asyncHandler(async (req, res, next) => {
  let game = await Game.findById(req.params.id);

  if (!game) {
    return next(
      new ErrorResponse(`Game not found with id of ${req.params.id}`, 404)
    );
  }

  game = await Game.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  logger.info(`Game updated: ${game.name} by admin ${req.user.username}`);
  res.status(200).json({
    success: true,
    data: game
  });
});

// @desc    Delete game
// @route   DELETE /api/games/:id
// @access  Private/Admin
export const deleteGame = asyncHandler(async (req, res, next) => {
  const game = await Game.findById(req.params.id);

  if (!game) {
    return next(
      new ErrorResponse(`Game not found with id of ${req.params.id}`, 404)
    );
  }

  await game.remove();

  logger.info(`Game deleted: ${game.name} by admin ${req.user.username}`);
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get games by category
// @route   GET /api/games/category/:category
// @access  Private
export const getGamesByCategory = asyncHandler(async (req, res, next) => {
  const games = await Game.getByCategory(req.params.category);
  
  res.status(200).json({
    success: true,
    count: games.length,
    data: games
  });
});