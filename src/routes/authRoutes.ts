import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, verifyToken } from '../controllers/authController';
import { validateRegistration, validateLogin, validateForgotPassword, validateResetPassword } from '../validators/authValidators';

const router = Router();

// Auth routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

router.post('/verify-token', verifyToken);

export default router;