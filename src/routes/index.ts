import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import transactionRoutes from './transactionRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/transactions', transactionRoutes);

export default router;