import { UserModel } from "../models/User";
import { AuthRequest } from "../middlewares/auth";
import { NextFunction, Response } from "express";
import { SupportModel } from "../models/Support";
import { SupportStatus } from "../generated/prisma";
import { sendEmail } from "../utils/emailService";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kaori19782@gmail.com";

// Create support
export const createSupport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authorized",
        });
      }
  
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
  
      const { subject, message } = req.body;
  
      await SupportModel.create({
        subject,
        message,
        user_id: user.id,
      });

      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Support Ticket Created by ${user.email}`,
        text: `${subject}`,
        html: `<h1>Support Ticket</h1>
               <p>You requested a support ticket.</p>
               <p>Please click the link below to reset your password:</p>
               <p>${message}</p>
               `,
      }).catch((err) =>
        console.error("Error sending password reset email:", err)
      );
  
      res.status(201).json({
        success: true,
        message: "Support created successfully",
      });
    } catch (error) {
      next(error);
    }
  };

// Update user support
export const updateSupport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authorized",
        });
      }
  
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
  
      const { replyMessage, supportId } = req.body;

      const support = await SupportModel.findById(supportId);
      if (!support) {
        return res.status(404).json({
          success: false,
          message: "Support not found",
        });
      }
  
      await SupportModel.update(supportId, {
        replyMessage,
      });
  
      res.status(201).json({
        success: true,
        message: "Support updated successfully",
      });
    } catch (error) {
      next(error);
    }
  };

// Update user support status
export const updateSupportStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authorized",
        });
      }
  
      const { status, supportId } = req.body;

      const support = await SupportModel.findById(supportId);
      if (!support) {
        return res.status(404).json({
          success: false,
          message: "Support not found",
        });
      }
  
      await SupportModel.update(supportId, {
        status,
      });
  
      res.status(201).json({
        success: true,
        message: "Support status updated successfully",
      });
    } catch (error) {
      next(error);
    }
  };

// Get all support
export const getAllSupport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
        if (!req.user) {
            return res.status(401).json({
              success: false,
              message: "Not authorized",
            });
          }

        const supports = await SupportModel.findAll();

        res.status(200).json({
            success: true,
            message: "Support fetched successfully",
            supports,
        });
    } catch (error) {
        next(error);
    }
  };

// Get support
export const getSupport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
        if (!req.user) {
            return res.status(401).json({
              success: false,
              message: "Not authorized",
            });
        }

        const supports = await SupportModel.findByUserId(req.user.id);
        if (!supports) {
            return res.status(404).json({
              success: false,
              message: "Supports not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Support fetched successfully",
            supports,
        });
    } catch (error) {
        next(error);
    }
  };

// Delete support
export const deleteSupport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
        if (!req.user) {
            return res.status(401).json({
              success: false,
              message: "Not authorized",
            });
          }

        const { id } = req.body;
        const support = await SupportModel.findById(id);
        if (!support) {
            return res.status(404).json({
              success: false,
              message: "Support not found",
            });
        }

        if (support.user_id !== req.user.id) {
            return res.status(401).json({
              success: false,
              message: "It is not your support",
            });
        }

        await SupportModel.deleteById(id);

        res.status(201).json({
            success: true,
            message: "Support deleted successfully",
        });
    } catch (error) {
        next(error);
    }
  };