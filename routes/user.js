import express from 'express';
const router = express.Router();
import {
  authMiddleware,
  requireSignin,
  adminMiddleware,
} from '../controllers/auth.js';
import { read, publicProfile, update, photo } from '../controllers/user.js';

router.get('/user/profile', requireSignin, authMiddleware, read);
router.get('/user/:username', publicProfile);
router.put('/user/update', requireSignin, authMiddleware, update);
router.get('/user/photo/:username', photo);

export default router;
