import { Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { UserModel } from "../models/User";
import { AuthRequest } from "../middlewares/auth";
import { TransactionType, TransactionStatus, UserRole, VerifyStatus, UserStatus } from "../generated/prisma";
import { TransactionModel } from "../models/Transaction";
import { sendEmail } from "../utils/emailService";
import ejs from 'ejs';
import fs from 'fs';
import path from "path";

const SERVER_URL: string = process.env.SERVER_URL || "http://85.208.197.156:5000";
const FRONTEND_URL: string = process.env.FRONTEND_URL || "http://192.168.142.78:3000"
const ADMIN_EMAIL: string = process.env.ADMIN_EMAIL || "kaori19782@gmail.com"

// Get user profile
export const getProfile = async (
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

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (
  req: AuthRequest,
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

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not autorized",
      });
    }

    const { first_name, last_name, username, avatar } = req.body;

    const updateData = {
      full_name: `${first_name} ${last_name}`,
      username,
      avatar,
    };

    // Add avatar path if a file was uploaded
    if (req.file) {
      updateData.avatar = `${SERVER_URL}/assets/${req.file.filename}`;
    }

    let user;

    if (username) {
      user = await UserModel.findByUserName(username);
      if (user && user.id !== req.user.id) {
        return res.status(409).json({
          success: false,
          message: "Username already in use",
        });
      }
    }

    const updatedUser = await UserModel.updateProfile(req.user.id, updateData);

    res.status(201).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// Update KYC
export const updateKYC = async (
  req: AuthRequest,
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

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not autorized",
      });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { phone_number, address, id_card, government_id } = req.body;

    const updateData = {
      phone_number,
      address,
      id_card,
      government_id,
    };

    if (
      req.files &&
      "id_card" in (req.files as { [fieldname: string]: Express.Multer.File[] })
    ) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const idCard = files.id_card[0].filename;
      updateData.id_card = `${SERVER_URL}/assets/${idCard}`;
    }

    if (
      req.files &&
      "government_id" in
      (req.files as { [fieldname: string]: Express.Multer.File[] })
    ) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const govId = files.government_id[0].filename;
      updateData.government_id = `${SERVER_URL}/assets/${govId}`;
    }

    const updatedUser = await UserModel.updateProfile(req.user.id, updateData);

    res.status(201).json({
      success: true,
      message: "KYC updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Update user password
export const updatePassword = async (
  req: AuthRequest,
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

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not autorized",
      });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const { oldPassword, newPassword } = req.body;

    const isOldPasswordValid = await UserModel.comparePassword(
      oldPassword,
      user.password
    );

    if (!isOldPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid old password",
      });
    }

    const updatedUser = await UserModel.updateProfile(req.user.id, {
      password: newPassword,
    });

    res.status(201).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Update user balance
export const updateBalance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not autorized",
      });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const currentBalance = user.balance;
    const currentBonus = user.bonus;
    const { type } = req.body;

    if (type === TransactionType.DEPOSIT) {
      const depositAmount = parseFloat(req.body.amount);
      const newBalance = currentBalance + depositAmount;
      const newBonus = req.body.amount >= 500 ? parseFloat(req.body.amount)*0.05 : 0;

      await UserModel.updateProfile(user.id, {
        balance: newBalance,
        bonus: currentBonus + newBonus,
      });

      // Create the DEPOSIT transaction
      const amount = req.body.amount;
      const type = TransactionType.DEPOSIT;
      const status = TransactionStatus.COMPLETED;
      const recipient_id = user.id;
      const description = "Your balance has been successfully received.";
      // Deposit transaction
      await TransactionModel.create({
        amount,
        type,
        status,
        recipient_id,
        description,
      });

      // Bonus transaction for 5% of deposit
      await TransactionModel.create({
        amount: newBonus.toString(),
        type: TransactionType.BONUS,
        status: TransactionStatus.COMPLETED,
        recipient_id,
        description: "You got a 5% of Deposit amount as a Bonus.",
      });
    } else if (req.body.type === TransactionType.WITHDRAWAL) {
      if (currentBalance < 1500 || parseFloat(req.body.amount) < 1500) {
        return res.status(400).json({
          success: false,
          message: "Minimum withdrawal amount is $1500",
        });
      }
      if (currentBalance < parseFloat(req.body.amount)) {
        return res.status(400).json({
          success: false,
          message: "Balance is not enough",
        });
      }

      // Create the withdraw request transaction
      const amount = req.body.amount;
      const type = TransactionType.WITHDRAWAL;
      const status = TransactionStatus.PENDING;
      const sender_id = user.id;
      const description =
        "You sent the request to withdraw the balance successfully";

      await TransactionModel.create({
        amount,
        type,
        status,
        sender_id,
        description,
      });

      const templateString = fs.readFileSync(path.join(__dirname, 'email-template.ejs'), 'utf-8');
      const html = ejs.render(templateString, {
        title: 'Withdraw Request Received!',
        logo: "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/doller.png",
        subject: "Witdhraw Request",
        username: ADMIN_EMAIL.split("@")[0],
        content: `We received a request to withdraw the balance from ${user.full_name || user.email}. Please check and handle it.`,
        link: `${FRONTEND_URL}/admin-dashboard/withdrawal-requests`,
        linkTitle: "Withdraw",
        footer: ""
      });

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: "Welcome to Cryptovault",
        text: `Hello ${user.email}, thank you for joining our platform.`,
        html: html,
      }).catch((err) => console.error("Error sending welcome email:", err));
    } else {
      return res.status(400).json({
        success: false,
        message: "Balance handle error",
      });
    }

    res.status(201).json({
      success: true,
      message:
        req.body.type === TransactionType.DEPOSIT
          ? "New Balance deposited successfully"
          : "Balance withdrawal request sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Update user bonus
export const updateBonus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.body.type == TransactionType.TRANSFER) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not autorized",
      });
    }

    const sender = await UserModel.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const senderCurrentBonus = sender.bonus;
    const senderCurrentSpins = sender.availableSpins;
    const { type, email, amount } = req.body;

    if (sender.email === email) {
      return res.status(400).json({
        success: false,
        message: "You cannot transfer bonus to yourself",
      });
    }

    if (type === TransactionType.BONUS) {
      const newBonus = senderCurrentBonus + parseFloat(amount);
      const newAvailableSpins = (senderCurrentSpins || 0) - 1;
      console.log(newAvailableSpins);
      await UserModel.updateProfile(sender.id, {
        bonus: newBonus,
        availableSpins: newAvailableSpins,
      });

      // Create the bonus transaction
      const type = TransactionType.BONUS;
      const status = TransactionStatus.COMPLETED;
      const recipient_id = sender.id;
      const description = "You have successfully received your bonus";

      await TransactionModel.create({
        amount,
        type,
        status,
        recipient_id,
        description,
      });

      // Send email for success getting bonus
    } else if (type === TransactionType.TRANSFER) {
      if (senderCurrentBonus < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: "Bonus not enough",
        });
      }
      const recipient = await UserModel.findByEmail(email);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: "Recipient user not found",
        });
      }
      const recipientBonus = recipient.bonus;
      const newBonus2 = recipientBonus + parseFloat(amount);
      await UserModel.updateProfile(recipient.id, {
        bonus: newBonus2,
      });

      const newBonus1 = senderCurrentBonus - parseFloat(amount);
      await UserModel.updateProfile(sender.id, {
        bonus: newBonus1,
      });

      // Create the bonus transaction
      const type = TransactionType.TRANSFER;
      const status = TransactionStatus.COMPLETED;
      const sender_id = sender.id;
      const recipient_id = recipient.id;
      const description = "You have successfully sent your bonus";

      await TransactionModel.create({
        amount,
        type,
        status,
        sender_id,
        recipient_id,
        description,
      });

      // Send email for transfer bonus
      const templateString = fs.readFileSync(path.join(__dirname, 'email-template.ejs'), 'utf-8');
      const html = ejs.render(templateString, {
        title: 'You Received The Bonus!',
        logo: "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/doller.png",
        subject: "Bonus Received",
        username: recipient.full_name?.split(" ")[0] || recipient.email.split("@")[0],
        content: `You received the bonus($${amount}) from ${sender.full_name || sender.email}`,
        link: `${FRONTEND_URL}/dashboard`,
        linkTitle: "Dashboard",
        footer: "🎉 Congratulation! 🎉"
      });

      await sendEmail({
        to: recipient.email,
        subject: "Welcome to Cryptovault",
        text: `Hello ${recipient.email}, thank you for joining our platform.`,
        html: html,
      }).catch((err) => console.error("Error sending welcome email:", err));

      res.status(201).json({
        success: true,
        message: "Transaction approved successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Handle bonus error",
      });
    }

    res.status(201).json({
      success: true,
      message:
        type === TransactionType.BONUS
          ? "Bonus updated successfully"
          : "Bonus transfered successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get all user
export const getAllUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(403).json({
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
      return res.status(403).json({
        success: false,
        message: "You do not have admin permission",
      });
    }

    const users = await UserModel.findAllUser();

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// Update user status
export const updateUserStatus = async (
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
      return res.status(403).json({
        success: false,
        message: "You do not have admin permission",
      });
    }

    const { email, status } = req.body;

    const userToUpdate = await UserModel.findByEmail(email);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await UserModel.updateProfile(userToUpdate.id, {
      status,
    });

    const dashboardUrl = `${FRONTEND_URL}/dashboard`;
    const supportUrl = `${FRONTEND_URL}/dashboard/support`;

    const templateString = fs.readFileSync(path.join(__dirname, 'email-template.ejs'), 'utf-8');
    const html = ejs.render(templateString, {
      title: `${status == "ACTIVE" ? "Account Activated" : status == "FREEZE" ? "Account Frozen" : status == "INACTIVE" ? "Account Inactivated" : "Account Suspended"}`,
      logo: "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/envelop.png",
      subject: "Account Status Updated",
      username: userToUpdate.full_name?.split(" ")[0] || userToUpdate.email.split("@")[0],
      content: `${status == "ACTIVE" ? "Your account is activated successfully" : status == "FREEZE" ? "Sorry, Your account is Frozen for a while" : status == "INACTIVE" ? "Your account is not activated yet" : "Sorry, your account is suspended!"}`,
      link: `${status == "ACTIVE" ? dashboardUrl : supportUrl}`,
      linkTitle: `${status == "ACTIVE" ? "Dashboard" : "Support"}`,
      footer: `${status == "ACTIVE" ? "🎉 Contratulation! 🎉" : status == "FREEZE" ? "Please contact to support team." : status == "INACTIVE" ? "Please contact to support team." : "Please contact to support team."}`
    });

    await sendEmail({
      to: userToUpdate.email,
      subject: "Welcome to Cryptovault",
      text: `Hello ${user.email}, thank you for joining our platform.`,
      html: html,
    }).catch((err) => console.error("Error sending welcome email:", err));

    res.status(201).json({
      success: true,
      message: "User status updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Approve KYC
export const handleKYC = async (
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
      return res.status(403).json({
        success: false,
        message: "You do not have admin permission",
      });
    }

    const { email, type } = req.body;
    const userToUpdate = await UserModel.findByEmail(email);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await UserModel.updateProfile(userToUpdate.id, {
      verify: type == "VERIFIED" ? VerifyStatus.VERIFIED : VerifyStatus.REJECTED,
    });

    await UserModel.updateProfile(userToUpdate.id, {
      status: type == "VERIFIED" ? UserStatus.ACTIVE : UserStatus.INACTIVE,
    });

    const templateString = fs.readFileSync(path.join(__dirname, 'email-template.ejs'), 'utf-8');
    const html = ejs.render(templateString, {
      title: `${type == "VERIFIED" ? "Successfully Verified" : "Verification Is Rejected"}`,
      logo: `${type == "VERIFIED" ? "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/thumb.png" : "https://raw.githubusercontent.com/CryptoVaultPlatform/backend/refs/heads/main/public/default/locker.png"}`,
      subject: "Account Verification",
      username: userToUpdate.full_name?.split(" ")[0] || userToUpdate.email.split("@")[0],
      content: `${type == "VERIFIED" ? "Your account is verified successfully!" : "Sorry, your account is not verified."}`,
      link: `${FRONTEND_URL}/dashboard`,
      linkTitle: "Dashboard",
      footer: `${type == "VERIFIED" ? "🎉 Contratulation! 🎉" : "Please contact to support team."}`
    });

    await sendEmail({
      to: userToUpdate.email,
      subject: "Welcome to Cryptovault",
      text: `Hello ${user.email}, thank you for joining our platform.`,
      html: html,
    }).catch((err) => console.error("Error sending welcome email:", err));

    res.status(201).json({
      success: true,
      message: type === "VERIFIED" ? "KYC approved successfully" : "KYC rejected successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Delete the user
export const deleteUser = async (
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

    const deleteUser = await UserModel.findByEmail(req.body.email);
    if (deleteUser) {
      await UserModel.deleteById(deleteUser.id);
    } else {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(201).json({
      success: true,
      message: "User removed successfully",
    });
  } catch (error) {
    next(error);
  }
};
