import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from 'express-async-handler';
import { Content } from '../models/Content.js';

// @desc    Get all content
// @route   GET /api/content
// @access  Private
export const getContent = asyncHandler(async (req, res, next) => {
  const { type, status, language } = req.query;
  
  const filter = {};
  if (type) filter.contentType = type;
  if (status) filter.status = status;
  if (language) filter.language = language;
  
  const content = await Content.find(filter)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'username')
    .populate('lastUpdatedBy', 'username');

  res.status(200).json({
    success: true,
    count: content.length,
    data: content
  });
});

// @desc    Update content
// @route   PUT /api/content/:id
// @access  Private/Admin/ContentManager
export const updateContent = asyncHandler(async (req, res, next) => {
  const { slug } = req.body;
  
  // Check for duplicate slug
  if (slug) {
    const existingContent = await Content.findOne({ 
      slug, 
      _id: { $ne: req.params.id } 
    });
    
    if (existingContent) {
      return next(new ErrorResponse(`Content with slug ${slug} already exists`, 400));
    }
  }

  const content = await Content.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      lastUpdatedBy: req.user.id
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!content) {
    return next(new ErrorResponse(`Content not found with id ${req.params.id}`, 404));
  }

  logger.info(`Content updated by ${req.user.username}`, { contentId: content._id });

  res.status(200).json({
    success: true,
    data: content
  });
});

// @desc    Create content
// @route   POST /api/content
// @access  Private/Admin/ContentManager
export const createContent = asyncHandler(async (req, res, next) => {
  const { slug } = req.body;
  
  // Check for duplicate slug
  if (slug) {
    const existingContent = await Content.findOne({ slug });
    if (existingContent) {
      return next(new ErrorResponse(`Content with slug ${slug} already exists`, 400));
    }
  }

  const content = await Content.create({
    ...req.body,
    createdBy: req.user.id
  });

  logger.info(`Content created by ${req.user.username}`, { contentId: content._id });

  res.status(201).json({
    success: true,
    data: content
  });
});

// @desc    Get single content by slug
// @route   GET /api/content/:slug
// @access  Public
export const getContentBySlug = asyncHandler(async (req, res, next) => {
  const content = await Content.findOne({ 
    slug: req.params.slug,
    status: 'published'
  });

  if (!content) {
    return next(new ErrorResponse(`Content not found with slug ${req.params.slug}`, 404));
  }

  res.status(200).json({
    success: true,
    data: content
  });
});