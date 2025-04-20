export const ErrorCatalog = {
  // ========================
  // SERVER ERRORS (SER_xxx)
  // ========================
  SER_101: {
    code: 'SER_101',
    severity: 'CRITICAL',
    message: 'Server failed to start',
    solution: 'Check port availability and .env config'
  },
  SER_102: {
    code: 'SER_102',
    severity: 'HIGH',
    message: 'API route not found',
    solution: 'Validate route registration in app.js'
  },
  SER_103: {
    code: 'SER_103',
    severity: 'HIGH',
    message: 'Memory leak detected',
    solution: 'Profile heap usage and check for circular references'
  },
  SER_104: {
    code: 'SER_104',
    severity: 'MEDIUM',
    message: 'CORS policy violation',
    solution: 'Update cors() middleware configuration'
  },
  SER_105: {
    code: 'SER_105',
    severity: 'CRITICAL',
    message: 'SSL/TLS handshake failed',
    solution: 'Renew certificates and verify Nginx config'
  },

  // ========================
  // DATABASE ERRORS (DB_xxx)
  // ========================
  DB_201: {
    code: 'DB_201',
    severity: 'CRITICAL',
    message: 'MongoDB connection timeout',
    solution: 'Check cluster status and connection string'
  },
  DB_202: {
    code: 'DB_202',
    severity: 'HIGH',
    message: 'Transaction deadlock',
    solution: 'Optimize query sequencing and add retries'
  },
  DB_203: {
    code: 'DB_203',
    severity: 'HIGH',
    message: 'Schema validation failed',
    solution: 'Review model definitions in src/models/'
  },
  DB_204: {
    code: 'DB_204',
    severity: 'MEDIUM',
    message: 'Index missing for query',
    solution: 'Add proper indexes to collections'
  },
  DB_205: {
    code: 'DB_205',
    severity: 'HIGH',
    message: 'Duplicate key violation',
    solution: 'Implement upsert or pre-check logic'
  },

  // ========================
  // AUTH ERRORS (AUTH_xxx)
  // ========================
  AUTH_301: {
    code: 'AUTH_301',
    severity: 'HIGH',
    message: 'Brute force attack detected',
    solution: 'Enable rate limiting on /login route'
  },
  AUTH_302: {
    code: 'AUTH_302',
    severity: 'HIGH',
    message: 'JWT token expired',
    solution: 'Implement token refresh flow'
  },
  AUTH_303: {
    code: 'AUTH_303',
    severity: 'CRITICAL',
    message: 'Admin privilege escalation attempt',
    solution: 'Audit role middleware immediately'
  },
  AUTH_304: {
      code: 'AUTH_304',
      severity: 'MEDIUM',
      message: 'Session expired',
      action: 'Refresh token or re-authenticate',
      log: false
    },
  AUTH_305: {
      code: 'AUTH_305',
      severity: 'HIGH',
      message: 'Invalid admin credentials',
      action: 'Check username/password and attempt count',
      log: true
    },

  // ========================
  // GAMBLING LOGIC (GAME_xxx)
  // ========================
  GAME_401: {
    code: 'GAME_401',
    severity: 'CRITICAL',
    message: 'Payout calculation mismatch',
    solution: 'Freeze payouts and audit algorithm'
  },
  GAME_402: {
    code: 'GAME_402',
    severity: 'HIGH',
    message: 'Negative balance allowed',
    solution: 'Add pre-transaction validation'
  },
  GAME_403: {
    code: 'GAME_403',
    severity: 'HIGH',
    message: 'Jackpot overflow',
    solution: 'Implement BigNumber handling'
  },

    // ======================
// CONFIGURATION (CONFIG_)
// ======================
CONFIG_5001: {
  code: 'CONFIG_5001',
  severity: 'MEDIUM',
  message: 'Invalid game configuration',
  action: 'Validate game settings JSON',
  log: true
},

  // ======================
// USER MANAGEMENT (USER_)
// ======================

  USER_4001: {
      code: 'USER_4001',
      severity: 'HIGH',
      message: 'User self-exclusion violation',
      action: 'Block account and review access logs',
      log: true
    },
    // ======================
// TRANSACTIONS (TX_)
// ======================
TX_3001: {
  code: 'TX_3001',
  severity: 'CRITICAL',
  message: 'Payout failed - insufficient funds',
  action: 'Freeze account and notify finance team',
  log: true
},
TX_3002: {
  code: 'TX_3002',
  severity: 'HIGH',
  message: 'Deposit verification timeout',
  action: 'Check payment gateway status',
  log: true
},  

  // ========================
  // PAYMENT ERRORS (PAY_xxx)
  // ========================
  PAY_501: {
    code: 'PAY_501',
    severity: 'CRITICAL',
    message: 'Withdrawal double-spend attempt',
    solution: 'Enable transaction locking'
  },
  PAY_502: {
    code: 'PAY_502',
    severity: 'HIGH',
    message: 'Cryptocurrency rate API failure',
    solution: 'Implement fallback pricing provider'
  },
  PAY_503: {
    code: 'PAY_503',
    severity: 'HIGH',
    message: 'Bank reconciliation mismatch',
    solution: 'Pause withdrawals and audit ledger'
  }
}

export const getErrorByCode = (code) => {
  return Object.values(ErrorCatalog).find(err => err.code === code) || {
    code: 'UNKNOWN',
    severity: 'MEDIUM',
    message: 'Unrecognized error occurred',
    action: 'Check application logs',
    log: true
  };
};