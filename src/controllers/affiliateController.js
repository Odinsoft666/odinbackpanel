import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from 'express-async-handler';
import { User } from '../models/User.js';

export const getAffiliates = asyncHandler(async (req, res, next) => {
  const affiliates = await User.find({ 
    role: 'AFFILIATE',
    status: 'ACTIVE'
  }).select('-password -__v');

  logger.info(`Affiliates fetched by admin ${req.user.username}`);
  res.status(200).json({
    success: true,
    count: affiliates.length,
    data: affiliates
  });
});

export const createAffiliate = asyncHandler(async (req, res, next) => {
  const affiliateData = {
    ...req.body,
    role: 'AFFILIATE',
    status: 'ACTIVE'
  };

  const affiliate = await User.create(affiliateData);

  logger.info(`Affiliate created: ${affiliate.username} by admin ${req.user.username}`);
  res.status(201).json({
    success: true,
    data: affiliate
  });
});