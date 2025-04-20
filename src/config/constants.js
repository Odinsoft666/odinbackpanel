// src/config/constants.js
export const ROLE_TYPES = {
  SUPERADMIN: 'SUPERADMIN',
  DEPARTMENT_SUPERADMIN: 'DEPARTMENT_SUPERADMIN',
  DEPARTMENT_ADMIN: 'DEPARTMENT_ADMIN',
  DEPARTMENT_WORKER: 'DEPARTMENT_WORKER',
  SPECIAL_ADMIN: 'SPECIAL_ADMIN'
};

export const DEPARTMENTS = {
  FINANCE: 'FINANCE',
  CALL: 'CALL',
  LIVE_SUPPORT: 'LIVE_SUPPORT',
  MARKETING: 'MARKETING',
  ACCOUNTING: 'ACCOUNTING',
  SUPPORT: 'SUPPORT'
};

// Dynamic role generator
export const generateRoles = () => {
  const roles = {};
  
  // Generate department roles
  Object.values(DEPARTMENTS).forEach(dept => {
    roles[`${dept}_SUPERADMIN`] = `${dept}_SUPERADMIN`;
    roles[`${dept}_ADMIN`] = `${dept}_ADMIN`;
    roles[`${dept}_WORKER`] = `${dept}_WORKER`;
  });

  // Special roles
  roles.SUPPORT_ADMIN = 'SUPPORT_ADMIN';
  roles.SUPERADMIN = 'SUPERADMIN';
  
  return roles;
};

export let ADMIN_ROLES = generateRoles();

// Permission templates
export const PERMISSION_TEMPLATES = {
  SUPERADMIN: {
    manage_roles: true,
    create_admins: true,
    delete_admins: true,
    assign_tasks: true,
    override_access: true,
    view_all: true
  },
  DEPARTMENT_SUPERADMIN: {
    manage_roles: true,
    create_admins: true,
    delete_admins: false,
    assign_tasks: true,
    override_access: false,
    view_department: true
  },
  DEPARTMENT_ADMIN: {
    manage_roles: false,
    create_admins: false,
    delete_admins: false,
    assign_tasks: true,
    override_access: false,
    view_department: true
  },
  DEPARTMENT_WORKER: {
    manage_roles: false,
    create_admins: false,
    delete_admins: false,
    assign_tasks: false,
    override_access: false,
    view_department: false
  }
};

// Initialize dynamic permissions
export let ROLE_PERMISSIONS = {};

// Initialize role permissions
Object.keys(ADMIN_ROLES).forEach(role => {
  const [dept, type] = role.includes('_') ? role.split('_') : [null, role];
  const roleType = type === 'SUPERADMIN' ? 'SUPERADMIN' : 
                  type === 'ADMIN' ? 'DEPARTMENT_ADMIN' :
                  type === 'WORKER' ? 'DEPARTMENT_WORKER' : 'SPECIAL_ADMIN';
  
  ROLE_PERMISSIONS[role] = { 
    ...PERMISSION_TEMPLATES[roleType],
    department: dept 
  };
});

// Function to add new role
export const addNewRole = (roleName, baseType, department = null) => {
  if (ADMIN_ROLES[roleName]) return false;

  ADMIN_ROLES[roleName] = roleName;
  
  // Set permissions based on role type
  switch(baseType) {
    case ROLE_TYPES.SUPERADMIN:
      ROLE_PERMISSIONS[roleName] = { ...PERMISSION_TEMPLATES.SUPERADMIN };
      break;
    case ROLE_TYPES.DEPARTMENT_SUPERADMIN:
      ROLE_PERMISSIONS[roleName] = { 
        ...PERMISSION_TEMPLATES.DEPARTMENT_SUPERADMIN,
        department 
      };
      break;
    case ROLE_TYPES.DEPARTMENT_ADMIN:
      ROLE_PERMISSIONS[roleName] = { 
        ...PERMISSION_TEMPLATES.DEPARTMENT_ADMIN,
        department 
      };
      break;
    case ROLE_TYPES.DEPARTMENT_WORKER:
      ROLE_PERMISSIONS[roleName] = { 
        ...PERMISSION_TEMPLATES.DEPARTMENT_WORKER,
        department 
      };
      break;
    default:
      ROLE_PERMISSIONS[roleName] = {};
  }
  
  return true;
};

// Original constants remain unchanged
export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAgeDays: 90,
  historyCount: 5,
  maxAttempts: 5,
  lockoutMinutes: 30
};

export const DB_CONFIG = {
  URI: process.env.MONGODB_URI,
  NAME: process.env.MONGODB_NAME || 'odinsoft',
  OPTIONS: {
    serverApi: { version: '1', strict: true },
    maxPoolSize: 10,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000
  }
};

export const SESSION_CONFIG = {
  SECRET: process.env.SESSION_SECRET || 'your-secret-key',
  COLLECTION: 'sessions',
  TTL: 14 * 24 * 60 * 60 // 14 days
};

export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  ENV: process.env.NODE_ENV || 'development'
};

export const JWT_CONFIG = {
  issuer: 'odinsoft',
  audience: 'admin-panel'
};

export const TOKEN_EXPIRY = {
  session: '15m',
  refresh: '7d'
};

export const CONSTANTS = {
  ADMIN_ROLES,
  ROLE_PERMISSIONS,
  PASSWORD_POLICY,
  DB_CONFIG,
  SESSION_CONFIG,
  SERVER_CONFIG,
  JWT_CONFIG,
  TOKEN_EXPIRY
};