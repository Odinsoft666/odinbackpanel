// src/middleware/roleMiddleware.js
import { ADMIN_ROLES, ROLE_PERMISSIONS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export const hasRole = (requiredRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        logger.warn('Unauthorized access attempt - no user in request');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // SUPERADMIN has access to everything
      if (req.user.role === ADMIN_ROLES.SUPERADMIN) {
        return next();
      }

      // Check direct role match
      if (requiredRoles.includes(req.user.role)) {
        return next();
      }

      // Check department hierarchy
      const userDept = req.user.role.split('_')[0];
      const requiredDept = requiredRoles[0]?.split('_')[0];
      
      if (userDept && userDept === requiredDept) {
        const userRoleLevel = req.user.role.split('_')[1];
        const requiredRoleLevel = requiredRoles[0]?.split('_')[1];
        
        // SUPERADMIN > ADMIN > WORKER hierarchy within department
        const roleHierarchy = ['SUPERADMIN', 'ADMIN', 'WORKER'];
        if (roleHierarchy.indexOf(userRoleLevel) <= roleHierarchy.indexOf(requiredRoleLevel)) {
          return next();
        }
      }

      logger.warn(`Forbidden access: ${req.user.role} trying to access ${requiredRoles}`);
      return res.status(403).json({ error: 'Insufficient privileges' });
    } catch (error) {
      logger.error('Role check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Pre-defined middleware for common roles
export const isSuperAdmin = hasRole([ADMIN_ROLES.SUPERADMIN]);
export const isFinanceSuperAdmin = hasRole([ADMIN_ROLES.FINANCE_SUPERADMIN]);
export const isCallSuperAdmin = hasRole([ADMIN_ROLES.CALL_SUPERADMIN]);
export const isLiveSupportSuperAdmin = hasRole([ADMIN_ROLES.LIVE_SUPPORT_SUPERADMIN]);
export const isMarketingSuperAdmin = hasRole([ADMIN_ROLES.MARKETING_SUPERADMIN]);

export const canManageRole = (targetRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // SUPERADMIN can manage any role
    if (req.user.role === ADMIN_ROLES.SUPERADMIN) {
      return next();
    }

    // Department SUPERADMINs can manage roles in their department
    const userDept = req.user.role.split('_')[0];
    const targetDept = targetRole.split('_')[0];
    
    if (userDept && userDept === targetDept && req.user.role.endsWith('_SUPERADMIN')) {
      return next();
    }

    return res.status(403).json({ error: 'Cannot manage this role' });
  };
};