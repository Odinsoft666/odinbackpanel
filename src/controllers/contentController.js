import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from 'express-async-handler';
import { Content } from '../models/Content.js';

export const getContent = asyncHandler(async (req, res, next) => {
  const content = await Content.find({});

  res.status(200).json({
    success: true,
    count: content.length,
    data: content
  });
});

export const updateContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!content) {
    return next(
      new ErrorResponse(`Content not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: content
  });
});