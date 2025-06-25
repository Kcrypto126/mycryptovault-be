import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import { sendEmail } from "../utils/emailService";
import { UserRole, UserStatus } from "../generated/prisma";
import ejs from 'ejs';
import fs from 'fs';
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const admin_email: string = process.env.ADMIN_EMAIL || "kaori19782@gmail.com";
const jwt_secret: string = process.env.JWT_SECRET || "WELCOME TO CRYPTO WALLET";
const FRONTEND_URL: string =
  process.env.FRONTEND_URL || "http://192.168.142.78:3000";

// Register new user
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email, password } = req.body;
    let role: UserRole = "USER";

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    if (email === admin_email) {
      role = UserRole.ADMIN;
    } else {
      role = UserRole.USER;
    }

    const avatar = "/assets/avatars/avatar-default.png";

    // Create user
    const user = await UserModel.create({
      email,
      password,
      role,
      avatar,
      isEmailVerified: false,
    });

    // email verification link sent
    const emailToken = jwt.sign(
      { userId: user.id },
      jwt_secret,
      { expiresIn: '1d' }
    );
    const url = `${FRONTEND_URL}/account/verify-email?token=${emailToken}`;

    const templateString = fs.readFileSync(path.join(__dirname, 'email-template.ejs'), 'utf-8');
    const html = ejs.render(templateString, {
      title: 'Welcome to Cryptovault!',
      logo: "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/envelop.png",
      subject: "Welcome to Cryptovault - Let's Get Started",
      username: user.email.split("@")[0],
      content: "Welcome to Cryptovault - your secure gateway to managing and growing your crypto assets.<br>Please verify your email using the button below.",
      link: url,
      linkTitle: "Verify Email",
      footer: "Thanks for joining the vault."
    });

    // to admin
    const url2 = `${FRONTEND_URL}/admin-dashboard/users`;

    await sendEmail({
      to: user.email,
      subject: "Welcome to Cryptovault",
      text: `Hello ${user.email}, thank you for joining our platform.`,
      html: html,
    }).catch((err) => console.error("Error sending welcome email:", err));

    const html2 = ejs.render(templateString, {
      title: 'Welcome to Cryptovault!',
      logo: "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/envelop.png",
      subject: "New User Registered",
      username: admin_email.split("@")[0],
      content: `New user ${user.email} is registered.`,
      link: url2,
      linkTitle: "Admin Dashboard",
      footer: "Thanks for joining the vault."
    });

    await sendEmail({
      to: admin_email,
      subject: "Welcome to Cryptovault",
      text: `Hello ${user.email}, thank you for joining our platform.`,
      html: html2,
    }).catch((err) => console.error("Error sending welcome email:", err));

    res.status(201).json({
      success: true,
      user,
      message: "User created successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email, password, isRemember } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isEmailVerified) {
      const emailToken = jwt.sign(
        { userId: user.id },
        jwt_secret,
        { expiresIn: '1d' }
      );
      const url = `${FRONTEND_URL}/account/verify-email?token=${emailToken}`;

      // send email
      const templateString = fs.readFileSync(path.join(__dirname, 'email-template.ejs'), 'utf-8');
      const html = ejs.render(templateString, {
        title: 'Email Verification Link Received!',
        logo: "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/envelop.png",
        subject: "Email Verification",
        username: user.email.split("@")[0],
        content: "You received email verification link. Please click to verify your email.",
        link: url,
        linkTitle: "Verify Email",
        footer: "Thanks for joining the vault."
      });

      await sendEmail({
        to: user.email,
        subject: "Welcome to Cryptovault",
        text: `Hello ${user.email}, thank you for joining our platform.`,
        html: html,
      }).catch((err) => console.error("Error sending welcome email:", err));

      return res.status(400).json({
        success: false,
        message: "You will be receive the email verification link. Please check your inbox."
      })
    }

    if (user.status === UserStatus.SUSPENDED) {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended.",
      });
    }

    // Check password
    const isPasswordValid = await UserModel.comparePassword(
      password,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // Generate token with type-safe JWT secret
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const token = jwt.sign(payload, jwt_secret, { expiresIn: "1d" });

    res.status(200).json({
      success: true,
      token,
      user,
      message: "Logged in successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    const updates = {
      reset_token: token,
      reset_token_expiry: expiry,
    };

    // Store reset token in DB (implementation needed)
    const updatedUser = await UserModel.updateResetToken(email, updates);
    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: "Failed to update user with reset token in the database.",
      });
    }

    // Send password reset email
    const resetUrl = `${FRONTEND_URL}/account/reset-password?token=${token}`;

    const templateString = fs.readFileSync(path.join(__dirname, 'email-template.ejs'), 'utf-8');
    const html = ejs.render(templateString, {
      title: 'Reset Your Password',
      logo: "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/locker.png",
      subject: "Reset Your Cryptovault Password",
      username: user.full_name?.split(" ")[0] || user.email.split("@")[0],
      content: "We received a request to reset your password. If this was you, click below to create a new one",
      link: `${resetUrl}`,
      linkTitle: "Reset Password",
      footer: "This link expires in 30 minutes.<br>If you didn’t request this, please ignore this email or contact support immediately."
    });

    sendEmail({
      to: user.email,
      subject: "Welcome to Cryptovault",
      text: `Hello ${user.email}, thank you for joining our platform.`,
      html: html,
    }).catch((err) => console.error("Error sending welcome email:", err));

    res.status(201).json({
      resetUrl,
      success: true,
      message: "You wil get the password reset link soon.",
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { token, password } = req.body;

    const user = await UserModel.findByToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const updatedUser = await UserModel.updatePassword(user.email, password);
    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: "Failed to reset password",
      });
    }

    res.status(201).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

// verify token
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;
    jwt.verify(token, jwt_secret, async (err: any, decoded: any) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ message: "Invalid token" });
      }

      const email = decoded.email;
      if (!email)
        return res.status(404).json({ message: "User not found with token" });

      const user = await UserModel.findByEmail(email);
      if (!user) return res.status(404).json({ message: "User not found" });

      return res.status(200).json({ message: "Token is valid.", user });
    });
  } catch (error) {
    next(error);
  }
};

// verify email
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.body;
    jwt.verify(token, jwt_secret, async (err: any, decoded: any) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ message: "Invalid token" });
      }
      const user = await UserModel.findById(decoded.userId);
      if(!user) {
        return res.status(404).json({
          success: false,
          message: "user not found"
        })
      }
      await UserModel.updateProfile(user.id, {
        isEmailVerified: true
      })
    });

    res.status(201).json({
      success: true,
      message: "Email verified successfully!"
    })
  } catch (err) {
    res.status(400).send('Invalid or expired token');
  }
}
