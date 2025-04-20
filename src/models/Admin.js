import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const AdminRoles = [
  'OWNER',       // Full access
  'SUPERADMIN',  // Almost full access
  'FINANCE_ADMIN',
  'RISK_ADMIN',
  'LIVE_SUPPORT_ADMIN',
  'CALL_ADMIN',
  'MARKETING_ADMIN',
  'ACCOUNTING_ADMIN',
  'TECHNICAL_ADMIN'
];

const AdminSchema = new mongoose.Schema({
  adminName: {
    type: String,
    required: [true, 'Admin username is required'],
    unique: true,
    minlength: 4,
    maxlength: 20,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: true,
    minlength: 12,
    select: false
  },
  adminClass: {
    type: String,
    enum: AdminRoles,
    required: true,
    default: 'TECHNICAL_ADMIN'
  },
  isOwner: {
    type: Boolean,
    default: false
  },
  // ... rest of your existing schema
});

// Add pre-save hook for owner creation
AdminSchema.statics.createOwner = async function() {
  const ownerExists = await this.findOne({ isOwner: true });
  if (!ownerExists) {
    await this.create({
      adminName: 'ODIN',
      email: 'owner@odinsite.com',
      password: 'ODIN*123', // Will be hashed by the pre-save hook
      adminClass: 'OWNER',
      isOwner: true,
      name: 'System',
      surname: 'Owner'
    });
    console.log('Owner account created');
  }
};

// Password hashing middleware (remains same)
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const Admin = mongoose.model('Admin', AdminSchema);
export default Admin;