import { check } from "express-validator";

export const categoryCreateValidator = [
  check("name").not().isEmpty().withMessage("Name is required"),
];
