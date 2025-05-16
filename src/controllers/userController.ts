import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../middlewares/errorHandler';
import { TransactionType, TransactionStatus } from '../generated/prisma';
import { TransactionModel } from '../models/Transaction';

const admin_email: string = process.env.ADMIN_EMAIL || "a@a.com";
const admin_pass: string = process.env.ADMIN_PASSWORD || "Asd123!@#";

// Get user profile
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user: user
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not autorized"
      })
    }

    const { username, full_name, avatar, password } = req.body;
    let user;

    if (username) {
      user = await UserModel.findByUserName(username);
      if (user && user.id !== req.user.id) {
        return res.status(400).json({
          success: false,
          message: "Username already in use"
        })
      }
    }

    const updatedUser = await UserModel.updateProfile(req.user.id, {
      username,
      full_name,
      avatar,
      password
    });

    res.status(201).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// Update user balance
export const updateBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not autorized"
      })
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }
    const currentBalance = user.balance;

    if (req.body.type === TransactionType.DEPOSIT) {
      const newBalance1 = currentBalance + parseFloat(req.body.amount);
      await UserModel.updateProfile(user.id, {
        balance: newBalance1
      });

      // Create the DEPOSIT transaction
      const amount = req.body.amount;
      const type = TransactionType.DEPOSIT;
      const status = TransactionStatus.COMPLETED;
      const recipient_id = user.id;
      const description = "Your balance has been successfully received.";

      await TransactionModel.create({ amount, type, status, recipient_id, description });

      // Send email for balance deposit success


    } else if (req.body.type === TransactionType.WITHDRAWAL) {
      if (currentBalance < 1500 || parseFloat(req.body.amount) < 1500) {
        return res.status(403).json({
          success: false,
          message: "Minimum withdrawal amount is $1500"
        })
      }
      if (currentBalance < parseFloat(req.body.amount)) {
        return res.status(403).json({
          success: false,
          message: "Balance is not enough"
        })
      }

      // Create the withdraw request transaction
      const amount = req.body.amount;
      const type = TransactionType.WITHDRAWAL;
      const status = TransactionStatus.PENDING;
      const sender_id = user.id;
      const description = "You sent the request for withdraw the balance successfully";

      await TransactionModel.create({ amount, type, status, sender_id, description });

      // Send email to approve the request to admin


      // const newBalance2 = currentBalance - parseFloat(req.body.amount);
      // await UserModel.updateProfile(user.id, {
      //   balance: newBalance2
      // });
    } else {
      return res.status(400).json({
        success: false,
        message: "Balance handle error"
      });
    }

    res.status(201).json({
      success: true,
      message: req.body.type === TransactionType.DEPOSIT ? "New Balance deposited successfully" : "Balance withdrawal request sent successfully"
    })
  } catch (error) {
    next(error)
  }
}

// Update user bonus
export const updateBonus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.body.type == TransactionType.TRANSFER) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not autorized"
      })
    }

    const sender = await UserModel.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }
    const senderCurrentBonus = sender.bonus;

    const { type, email, amount } = req.body;

    if (type === TransactionType.BONUS) {
      const newBonus = senderCurrentBonus + parseFloat(amount);
      await UserModel.updateProfile(sender.id, {
        bonus: newBonus
      });

      // Create the bonus transaction
      const type = TransactionType.BONUS;
      const status = TransactionStatus.COMPLETED;
      const recipient_id = sender.id;
      const description = "You have successfully received your bonus";

      await TransactionModel.create({ amount, type, status, recipient_id, description });

      // Send email for success getting bonus


    } else if (type === TransactionType.TRANSFER) {
      if (senderCurrentBonus < parseFloat(amount)) {
        return res.status(403).json({
          success: false,
          message: "Bonus not enough"
        })
      }
      const recipient = await UserModel.findByEmail(email);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: "Recipient user not found"
        });
      }
      const recipientBonus = recipient.bonus;
      const newBonus2 = recipientBonus + parseFloat(amount);
      await UserModel.updateProfile(recipient.id, {
        bonus: newBonus2
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

      await TransactionModel.create({ amount, type, status, sender_id, recipient_id, description });

      // Send email for transfer bonus
      

    } else {
      return res.status(400).json({
        success: false,
        message: "Handle bonus error"
      })
    }

    res.status(201).json({
      success: true,
      message: type === TransactionType.BONUS ? "Bonus updated successfully" : "Bonus transfered successfully",
    });
  } catch (error) {
    next(error);
  };
}

// Get all user
export const getAllUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.email !== admin_email) {
      return res.status(403).json({
        success: false,
        message: "You do not have admin permission"
      })
    }

    const users = await UserModel.findAllUser();

    res.status(200).json({
      success: true,
      users: users
    })
  } catch (error) {
    next(error)
  }
}

// Delete the user
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.email !== admin_email) {
      return res.status(403).json({
        success: false,
        message: "You do not have admin permission"
      })
    }

    const deleteUser = await UserModel.findByEmail(req.body.email);
    if (deleteUser) {
      await UserModel.deleteById(deleteUser.id);
    } else {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    res.status(201).json({
      success: true,
      message: "User removed successfully"
    })
  } catch (error) {
    next(error)
  }
}
