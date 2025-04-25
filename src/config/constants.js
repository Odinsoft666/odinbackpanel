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

export const ERROR_TYPES = {
  ROUTER: '🛑 ROUTE',
  DATABASE: '💾 DB',
  AUTH: '🔐 AUTH',
  VALIDATION: '📝 VALID',
  CONFIG: '⚙️ CONFIG',
  IMPORT: '📦 IMPORT',
  UNKNOWN: '❓ UNKNOWN',
  CRON: '⏰ CRON',
  MIDDLEWARE: '🛠️ MIDDLEWARE',
  WEBSOCKET: '🔌 WS',
  CLUSTER: '🔄 CLUSTER',
  ENVIRONMENT: '🌐 ENV',
  SERVICE: '🛎️ SERVICE'
};

export const ERROR_CODES = {
  // Existing codes
  ROUTER_INVALID_EXPORT: 'ERR_ROUTER_001',
  ROUTER_TYPE_MISMATCH: 'ERR_ROUTER_002',
  IMPORT_CIRCULAR: 'ERR_IMPORT_001',
  
  // New codes
  DATABASE_CONNECTION: 'ERR_DB_001',
  DATABASE_QUERY: 'ERR_DB_002',
  AUTH_INVALID_TOKEN: 'ERR_AUTH_001',
  AUTH_PERMISSION_DENIED: 'ERR_AUTH_002',
  VALIDATION_FAILED: 'ERR_VALID_001',
  CONFIG_MISSING: 'ERR_CONFIG_001',
  CRON_INVALID: 'ERR_CRON_001',
  CRON_FAILURE: 'ERR_CRON_002',
  MIDDLEWARE_INVALID: 'ERR_MIDDLEWARE_001',
  WEBSOCKET_ERROR: 'ERR_WS_001',
  CLUSTER_FORK: 'ERR_CLUSTER_001',
  ENVIRONMENT_MISSING: 'ERR_ENV_001',
  SERVICE_UNAVAILABLE: 'ERR_SERVICE_001',
  UNHANDLED_ERROR: 'ERR_SYSTEM_001',
  NOT_FOUND: 'ERR_SYSTEM_002',
  INVALID_CONTENT_TYPE: 'ERR_SYSTEM_003',
  RATE_LIMIT_EXCEEDED: 'ERR_SYSTEM_004',
  SESSION_INVALID: 'ERR_SESSION_001',
  EMAIL_FAILURE: 'ERR_EMAIL_001',
  SMS_FAILURE: 'ERR_SMS_001'
};

export const ERROR_SEVERITY = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
};

export const ERROR_CATEGORIES = {
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  SECURITY: 'SECURITY',
  PERFORMANCE: 'PERFORMANCE',
  AVAILABILITY: 'AVAILABILITY',
  FUNCTIONAL: 'FUNCTIONAL'
};

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
    socketTimeoutMS: 30000,
    retryWrites: true,
    retryReads: true,
    heartbeatFrequencyMS: 10000
  }
};

export const SESSION_CONFIG = {
  SECRET: process.env.SESSION_SECRET || 'your-secret-key',
  COLLECTION: 'sessions',
  TTL: 14 * 24 * 60 * 60, // 14 days
  TOUCH_INTERVAL: 12 * 60 * 60 // 12 hours
};

export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  ENV: process.env.NODE_ENV || 'development',
  TRUST_PROXY: process.env.TRUST_PROXY || false,
  REQUEST_TIMEOUT: 30000,
  KEEP_ALIVE_TIMEOUT: 5000
};

export const JWT_CONFIG = {
  issuer: 'odinsoft',
  audience: 'admin-panel',
  algorithm: 'HS256',
  clockTolerance: 30
};

export const TOKEN_EXPIRY = {
  session: '15m',
  refresh: '7d',
  passwordReset: '1h',
  emailVerification: '24h'
};

export const MONITORING_CONFIG = {
  HEALTH_CHECK_INTERVAL: 5000,
  MEMORY_THRESHOLD: 0.8,
  CPU_THRESHOLD: 0.75,
  DB_CONNECTION_THRESHOLD: 0.5,
  REQUEST_TIMEOUT_THRESHOLD: 10000
};

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  DELAY_AFTER: 50,
  DELAY_MS: 500
};

export const CONSTANTS = {
  ADMIN_ROLES,
  ROLE_PERMISSIONS,
  PASSWORD_POLICY,
  DB_CONFIG,
  SESSION_CONFIG,
  SERVER_CONFIG,
  JWT_CONFIG,
  TOKEN_EXPIRY,
  MONITORING_CONFIG,
  RATE_LIMIT_CONFIG,
  ERROR_TYPES,
  ERROR_CODES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES
};

export const passwordPolicy = {
  minLength: 8,
  saltRounds: 12,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
  message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
};

// Error metadata mapping
export const ERROR_METADATA = {
  [ERROR_CODES.DATABASE_CONNECTION]: {
    severity: ERROR_SEVERITY.CRITICAL,
    category: ERROR_CATEGORIES.INFRASTRUCTURE,
    solution: 'Check database connection string and network connectivity'
  },
  [ERROR_CODES.AUTH_PERMISSION_DENIED]: {
    severity: ERROR_SEVERITY.HIGH,
    category: ERROR_CATEGORIES.SECURITY,
    solution: 'Verify user permissions and role assignments'
  },
  // Add metadata for all other error codes...
};

// System status codes
export const SYSTEM_STATUS = {
  OPERATIONAL: 'OPERATIONAL',
  DEGRADED: 'DEGRADED',
  MAINTENANCE: 'MAINTENANCE',
  OUTAGE: 'OUTAGE'
};

// Maintenance windows
export const MAINTENANCE_WINDOWS = {
  DEFAULT: {
    start: '02:00',
    end: '04:00',
    timezone: 'UTC'
  },
  EMERGENCY: {
    duration: 60 // minutes
  }
};