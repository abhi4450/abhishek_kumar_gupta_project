import express from "express";
import Joi from "joi";
import { filefunctions } from "../library/filefunctions";
import { functions } from "../library/functions";
import { validations } from "../library/validations";
import { dbusers } from "../model/dbusers";
import jwt from "jsonwebtoken";

export function signupSchema(req: any, res: any, next: any): any {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(2).required(),
    phone: Joi.string().required(),
    usertype: Joi.string().required(),
  });

  const validationsObj = new validations();

  const isValid = validationsObj.validateRequest(req, res, next, schema);

  if (!isValid) {
    return false;
  }

  next();
}
export function loginSchema(req: any, res: any, next: any): any {
  const schema = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(2).required(),
  });

  const validationsObj = new validations();

  const isValid = validationsObj.validateRequest(req, res, next, schema);

  if (!isValid) {
    return false;
  }

  next();
}

const router = express.Router();
router.post("/signup", signupSchema, signup);
router.post("/login", loginSchema, login);

module.exports = router;

async function signup(req: any, res: any): Promise<any> {
  var functionsObj = new functions();
  try {
    const { name, email, phone, password, usertype } = req.body;

    var filefunctionsObj = new filefunctions();

    let user_password = password;

    const hashedPassword = await filefunctionsObj.hashPassword(user_password);

    let user_email = email;
    let usersObj = new dbusers();
    const existingUser = await usersObj.getUserByEmail(user_email);
    if (existingUser) {
      res.send(functionsObj.output(0, "User with this email aldready exists"));
      console.log("hello f");
      return false;
    }
    const result: any = await usersObj.insertUser({
      ...req.body,
      password: hashedPassword,
    });

    res.send(functionsObj.output(1, "User successfully registered", result));
    return false;
  } catch (err: any) {
    res.send(functionsObj.output(0, err));
    return false;
  }
}

async function login(req: any, res: any): Promise<any> {
  const { email, password } = req.body;

  var functionsObj = new functions();
  try {
    var filefunctionsObj = new filefunctions();
    let user_email = email;
    let usersObj = new dbusers();
    const user = await usersObj.getUserByEmail(user_email);
    if (!user) {
      res.send(functionsObj.output(0, "Invalid credentials"));

      return false;
    }
    let user_password = password;
    const passwordMatch = await filefunctionsObj.comparePassword(
      user_password,
      user.password
    );
    if (!passwordMatch) {
      res.send(functionsObj.output(0, "Email is valid but incorrect password"));
      return false;
    }

    const token = jwt.sign(
      {
        id: user.id,
        userType: user.usertype,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );
    user.password = undefined;

    let data = {
      results: user,
      token: token,
    };
    console.log("data", data);
    res.send(functionsObj.output(1, "User logged in successfully", data));
    return false;
  } catch (error) {
    console.log(error);
    res.send(functionsObj.output(0, "Internal Server Error"));
    return false;
  }
}