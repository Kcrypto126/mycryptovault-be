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

// Get a specific transaction
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

    const { id } = req.params;

    // Get user
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    // Get transaction
    const transaction = await TransactionModel.findMany(user.id, user.id);
    if (!transaction) {
      return res.json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      transaction,
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

    const { id } = req.params;

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

    // Get all transaction
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

// Get transaction history
// export const getTransactionHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
//   try {
//     if (!req.user) {
//       const error: ApiError = new Error('Not authorized');
//       error.statusCode = 401;
//       throw error;
//     }

//     const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
//     const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
//     const type = req.query.type as TransactionType | undefined;
//     const status = req.query.status as TransactionStatus | undefined;

//     // Get transactions by user ID with optional filtering
//     let query = `
//       SELECT t.* FROM transactions t
//       JOIN wallets w ON t.wallet_id = w.id OR t.recipient_wallet_id = w.id
//       WHERE w.user_id = $1
//     `;

//     const queryParams: any[] = [req.user.id];
//     let paramCount = 2;

//     if (type) {
//       query += ` AND t.type = $${paramCount}`;
//       queryParams.push(type);
//       paramCount++;
//     }

//     if (status) {
//       query += ` AND t.status = $${paramCount}`;
//       queryParams.push(status);
//       paramCount++;
//     }

//     query += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
//     queryParams.push(limit, offset);

//     const result = await pool.query(query, queryParams);
//     const transactions = result.rows;

//     res.status(200).json({
//       success: true,
//       transactions,
//       count: transactions.length,
//       total: parseInt(result.rows[0]?.total_count || '0')
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// Sync transactions from Oxapay
// export const syncOxapayTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
//   try {
//     if (!req.user) {
//       const error: ApiError = new Error('Not authorized');
//       error.statusCode = 401;
//       throw error;
//     }

//     // Get user wallet
//     const wallet = await WalletModel.findByUserId(req.user.id);
//     if (!wallet) {
//       const error: ApiError = new Error('Wallet not found');
//       error.statusCode = 404;
//       throw error;
//     }

//     // This would be a call to the actual Oxapay API
// const externalTransactions = await fetchOxapayTransactions(req.user.id);

//     // Process each transaction
//     const processedTransactions = [];
//     for (const extTx of externalTransactions) {
//       // Check if transaction already exists
//       const existingTxResult = await pool.query(
//         'SELECT id FROM transactions WHERE reference_id = $1',
//         [extTx.id]
//       );

//       if (existingTxResult.rows.length === 0) {
//         // Create new transaction
//         const transaction = await TransactionModel.create({
//           wallet_id: wallet.id,
//           type: extTx.type === 'deposit' ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL,
//           amount: extTx.amount,
//           currency: extTx.currency,
//           status: TransactionStatus.COMPLETED,
//           reference_id: extTx.id,
//           description: `Oxapay ${extTx.type}`
//         });

//         // Update wallet balance for deposits
//         if (extTx.type === 'deposit') {
//           await WalletModel.updateBalance(wallet.id, extTx.amount);

//           // Send email notification
//           sendEmail({
//             to: req.user.email,
//             subject: 'Deposit Received',
//             text: `You have received a deposit of ${extTx.amount} ${extTx.currency} in your wallet.`,
//             html: `<h1>Deposit Received</h1>
//                    <p>You have received a deposit of ${extTx.amount} ${extTx.currency} in your wallet.</p>`
//           }).catch(err => console.error('Error sending deposit notification email:', err));
//         }

//         processedTransactions.push(transaction);
//       }
//     }

//     res.status(200).json({
//       success: true,
//       transactions: processedTransactions,
//       message: `${processedTransactions.length} new transactions have been synced`
//     });
//   } catch (error) {
//     next(error);
//   }
// };
