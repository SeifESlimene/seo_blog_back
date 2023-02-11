import express from 'express';

const router = express.Router();
import {
  signup,
  signin,
  signout,
  requireSignin,
  forgotPassword,
  resetPassword,
  preSignup,
  googleLogin,
} from '../controllers/auth.js';

// validators
import { runValidation } from '../validators/index.js';
import {
  userSignupValidator,
  userSigninValidator,
  forgetPasswordValidator,
  resetPasswordValidator,
} from '../validators/auth.js';
// import {} from '../validators/auth';

router.post('/pre-signup', userSignupValidator, runValidation, preSignup);
router.post('/signup', signup);
router.post('/signin', userSigninValidator, runValidation, signin);
router.get('/signout', signout);
router.put(
  '/forgot-password',
  forgetPasswordValidator,
  runValidation,
  forgotPassword
);
router.put(
  '/reset-password',
  resetPasswordValidator,
  runValidation,
  resetPassword
);
// google login
router.post('/google-login', googleLogin);

export default router;
