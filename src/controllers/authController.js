import { db } from '../config/db.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import DatabaseService from '../services/database.js';

const BCRYPT_ROUNDS = 12;
const database = db.getDB();

export const AuthController = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Validation
      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ 
          error: 'Username and password are required' 
        });
      }

      const user = await database.collection('users').findOne({ username });
      
      // Security: Always compare hashes (prevents timing attacks)
      const hash = user?.password || await bcrypt.hash('dummy', BCRYPT_ROUNDS);
      const isValid = await bcrypt.compare(password, hash);

      if (!user || !isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      // Update last login
      await database.collection('users').updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );

      // JWT Token
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Session management
      req.session.user = {
        id: user._id,
        username: user.username,
        role: user.role
      };

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
};