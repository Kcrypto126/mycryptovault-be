import { Router } from 'express';
import { getProfile, updateProfile, getAllUser, deleteUser, updateBonus, updateBalance } from '../controllers/userController';
import { auth } from '../middlewares/auth';
import { validateUpdateProfile, validateEmail } from '../validators/userValidators';

const router = Router();

// User routes
router.get('/profile', auth, getProfile);
router.put('/profile', auth, validateUpdateProfile, updateProfile);

// By admin
router.get('/all-user', auth, getAllUser);
router.delete('/delete', auth, deleteUser);

// Handle balance and bonus
router.post('/balance', auth, updateBalance);
router.post('/bonus', auth, validateEmail, updateBonus);


export default router;