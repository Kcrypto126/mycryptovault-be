import { Response, NextFunction } from "express";
import { TransactionModel } from "../models/Transaction";
import { TransactionStatus, TransactionType } from "../generated/prisma";
import { AuthRequest } from "../middlewares/auth";
import { ApiError } from "../middlewares/errorHandler";
import { fetchOxapayTransactions } from "../services/oxapayService";
import { sendEmail } from "../utils/emailService";
import { UserModel } from "../models/User";

const admin_email: string = process.env.ADMIN_EMAIL || "a@a.com";
const admin_pass: string = process.env.ADMIN_PASSWORD || "Asd123!@#";

// Create a specific transaction
export const createTransaction = async (
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

    // Get user
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    const { amount, type, status, sender_id, recipient_id, description } =
      req.body;

    // Get transaction
    const transaction = await TransactionModel.create({
      amount,
      type,
      status,
      sender_id,
      recipient_id,
      description,
    });

    res.status(201).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// Get a transactions
export const getTransaction = async (
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

    // Get user
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    // Get transactions
    const transactions = await TransactionModel.findMany(user.id, user.id);
    if (!transactions) {
      return res.json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTransaction = async (
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

    // Get user
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    if (user.email !== admin_email) {
      return res.status(403).json({
        success: false,
        message: "You do not have admin permission",
      });
    }

    // Get all transaction by admin
    const transactions = await TransactionModel.findAllTransaction();
    if (!transactions) {
      return res.json({
        success: false,
        message: "Any transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// Approve withdrawal by admin
export const approveWithdrawal = async (
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
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    if (user.email !== admin_email) {
      return res.status(403).json({
        success: false,
        message: "You do not have admin permission",
      });
    }

    const { id, email, amount } = req.body;
    const transaction = await TransactionModel.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const userToUpdate = await UserModel.findByEmail(email);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (amount > userToUpdate.balance) {
      await TransactionModel.updateStatus(id, TransactionStatus.FAILED);
      return res.status(400).json({
        success: false,
        message: "Failed to approve withdrawal request!",
      });
    }

    await TransactionModel.updateStatus(id, TransactionStatus.COMPLETED);
    await UserModel.updateProfile(userToUpdate.id, {
      balance: userToUpdate.balance - amount,
    });

    res.status(201).json({
      success: true,
      message: "Transaction approved successfully",
    });
  } catch (error) {
    next(error);
  }
};
