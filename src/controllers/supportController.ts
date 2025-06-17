import { UserModel } from "../models/User";
import { AuthRequest } from "../middlewares/auth";
import { NextFunction, Response } from "express";
import { SupportModel } from "../models/Support";
import { SupportStatus } from "../generated/prisma";

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

        const { supportId } = req.body;

        await SupportModel.deleteById(supportId);

        res.status(201).json({
            success: true,
            message: "Support deleted successfully",
        });
    } catch (error) {
        next(error);
    }
  };