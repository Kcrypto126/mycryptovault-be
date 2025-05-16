import { Router } from 'express';
import {
    createTransaction,
    getTransaction,
    getAllTransaction,
    //   getTransactionHistory,
    //   syncOxapayTransactions
} from '../controllers/transactionController';
import { auth } from '../middlewares/auth';

const router = Router();

// Transaction routes
router.post('/create', auth, createTransaction);
router.get('/get-transaction', auth, getTransaction);
router.get('/all-transaction', auth, getAllTransaction);

// router.get('/', auth, getTransactionHistory);
// router.post('/sync-oxapay', auth, syncOxapayTransactions);

export default router;