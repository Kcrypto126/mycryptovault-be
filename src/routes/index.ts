import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import transactionRoutes from './transactionRoutes';
// import walletRoutes from './walletRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
// router.use('/wallet', walletRoutes);
// router.use('/bonus', bonusRoutes);

export default router;