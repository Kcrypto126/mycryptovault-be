import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { ApiError } from '../middlewares/errorHandler';
import { sendEmail } from '../utils/emailService';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../generated/prisma';
import dotenv from 'dotenv';

dotenv.config();

const jwt_secret: string = process.env.JWT_SECRET || "WELCOME TO CRYPTO WALLET";
const admin_email: string = process.env.ADMIN_EMAIL || "a@a.com";
const admin_pass: string = process.env.ADMIN_PASSWORD || "Asd123!@#";
const frontend_url: string = process.env.FRONTEND_URL || "http://192.168.144.157:3000";

// Register new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { email, password } = req.body;
    let role: UserRole = "USER";

    // Check if user already exists
    const existingUserEmail = await UserModel.findByEmail(email);
    if (existingUserEmail) {
      return res.json({
        success: false,
        message: "Email already in use"
      });
    }

    if (email == admin_email) {
      role = UserRole.ADMIN;
    } else {
      role = UserRole.USER;
    }

    // Create user
    const user = await UserModel.create({
      email,
      password,
      role
    });

    // Generate token with type-safe JWT secret
    // const token = jwt.sign(
    //   { id: user.id, email: user.email },
    //   jwt_secret,
    //   { expiresIn: '1d' }
    // );

    // Send welcome email
    sendEmail({
      to: user.email,
      subject: 'Welcome to Crypto Wallet Platform',
      text: `Hello ${user.full_name}, thank you for joining our platform. Your account has been created successfully.`,
      html: `<h1>Welcome to Crypto Wallet Platform</h1>
             <p>Hello ${user.full_name},</p>
             <p>Thank you for joining our platform. Your account has been created successfully.</p>`
    }).catch(err => console.error('Error sending welcome email:', err));

    res.status(201).json({
      success: true,
      // token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    // Check password
    const isPasswordValid = await UserModel.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.json({
        success: false,
        message: "Incorrect password"
      });
    }

    // Generate token with type-safe JWT secret
    const token = jwt.sign(
      { id: user.id, email: user.email, role:user.role },
      jwt_secret,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        success: false,
        message: errors.array()[0].msg
      })
    }

    const { email } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.json({
        success: false,
        message: "Email not found"
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    const updates = {
      reset_token: token,
      reset_token_expiry: expiry
    }

    // Store reset token in DB (implementation needed)
    const updatedUser = await UserModel.updateResetToken(email, updates);
    if (!updatedUser) {
      return res.json({
        success: false,
        message: "Failed to update user with reset token in the database."
      })
    }

    // Send password reset email
    const resetUrl = `${frontend_url}/account/reset-password?token=${token}`;

    sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Please use this link to reset your password: ${resetUrl}`,
      html: `<h1>Password Reset</h1>
             <p>You requested a password reset.</p>
             <p>Please click the link below to reset your password:</p>
             <a href="${resetUrl}">Reset Password</a>`
    }).catch(err => console.error('Error sending password reset email:', err));

    res.status(201).json({
      resetUrl: resetUrl,
      success: true,
      message: 'Password reset link sent if the email exists'
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        success: false,
        message: errors.array()[0].msg
      })
    }

    const { token, password } = req.body;

    const user = await UserModel.findByToken(token);
    if (!user) {
      return res.json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    const updatedUser = await UserModel.updatePassword(user.email, password);
    if (!updatedUser) {
      return res.json({
        success: false,
        message: 'Failed to reset password'
      })
    }

    res.status(201).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// verify token
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body.token;
    jwt.verify(token, jwt_secret, async (err: any, decoded: any) => {
      if (err) {
        console.error(err);
        return res.json({msg: "Invalid token"})
      }
      
      const email = decoded.email;
      if (!email) return res.json({msg: "User not found with token"});

      const user = await UserModel.findByEmail(email);
      if(!user) return res.json({msg: "User not found"});
      // if(!user.verified) res.status(201).json({msg: "User not verified"});
      return res.status(200).json({msg: "Token is valid.", role: user.role});
    })
  } catch (error) {
    next(error)
  }
}

