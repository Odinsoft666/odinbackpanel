import express from 'express';
import { 
  authLimiter,
  generateJWT,
  verifyJWT,
  generateTOTPSecret,
  verifyTOTP,
  sendVerificationEmail
} from '../utils/authUtils.js';
import { protect } from '../middleware/routeProtection.js';

const router = express.Router();

// Login route
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    // Add authentication logic here (check user in DB, verify password, etc.)
    const user = { id: 1, email }; // Example user
    const token = generateJWT({ userId: user.id });
    res.json({ success: true, token });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Registration route
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    // Add registration logic (save user to DB, hash password, etc.)
    const token = generateJWT({ email });
    await sendVerificationEmail(email, token);
    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Protected route example
router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user }); // req.user is set by the protect middleware
});

// TOTP setup route
router.post('/setup-2fa', protect, (req, res) => {
  const secret = generateTOTPSecret();
  res.json({ secret: secret.base32 });
});

// TOTP verification route
router.post('/verify-2fa', protect, (req, res) => {
  const { secret, token } = req.body;
  const isValid = verifyTOTP(secret, token);
  res.json({ success: isValid });
});

export default router;