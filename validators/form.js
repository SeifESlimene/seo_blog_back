import { check } from 'express-validator';

export const contactFormValidator = [
  check('name').not().isEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('Must be valid email address'),
  check('message')
    .not()
    .isEmpty()
    .isLength({ min: 20 })
    .withMessage('The content of the message must contain at least 20 characters'),
];
