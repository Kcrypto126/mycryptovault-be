import { UserModel } from "../models/User";
import { AuthRequest } from "../middlewares/auth";
import { NextFunction, Response } from "express";
import { SupportModel } from "../models/Support";
import { SupportStatus, UserRole } from "../generated/prisma";
import { sendEmail } from "../utils/emailService";
import ejs from 'ejs';
import fs from 'fs';
import path from "path";

const FRONTEND_URL: string = process.env.FRONTEND_URL || "http://192.168.142.78:3000"
const ADMIN_EMAIL: string = process.env.ADMIN_EMAIL || "kaori19782@gmail.com"

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

        const templateString = fs.readFileSync(path.join(__dirname, 'email-template.ejs'), 'utf-8');
        const html = ejs.render(templateString, {
            title: 'Support Request',
            subject: subject,
            username: "Support Team",
            content: `We received support request from ${user.full_name || user.email} as follow. <br>"${message}"`,
            link: `${FRONTEND_URL}/admin-dashboard/support`,
            linkTitle: "Support",
            footer: "Please check carefully and solve it for user."
        });

        await sendEmail({
            to: ADMIN_EMAIL,
            subject: "Welcome to Cryptovault",
            text: `Hello ${user.email}, thank you for joining our platform.`,
            html: html,
        }).catch((err) => console.error("Error sending welcome email:", err));

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

        if (user.role !== UserRole.ADMIN) {
            return res.status(401).json({
                success: false,
                message: "You do not have admin permission",
            });
        }

        const { id, message, reply, status } = req.body;

        const support = await SupportModel.findById(id);
        if (!support) {
            return res.status(404).json({
                success: false,
                message: "Support not found",
            });
        }

        await SupportModel.update(id, {
            message,
            replyMessage: reply,
            status: status,
        });

        res.status(201).json({
            success: true,
            message: "Support updated successfully",
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

        const user = await UserModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.role !== UserRole.ADMIN) {
            return res.status(401).json({
                success: false,
                message: "You do not have admin permission",
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