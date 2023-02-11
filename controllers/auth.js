import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Blog from '../models/blog.js';
import shortId from 'shortid';
import expressJwt from 'express-jwt';
import sgMail from '@sendgrid/mail';
import _ from 'lodash';
import { OAuth2Client } from 'google-auth-library';
import { errorHandler } from '../helpers/dbErrorHandler.js';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const preSignup = (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email: email.toLowerCase() }, (err, user) => {
    if (user) {
      return res.status(400).json({
        error: 'Email Already Taken',
      });
    }
    const token = jwt.sign(
      { name, email, password },
      process.env.JWT_ACCOUNT_ACTIVATION,
      {
        expiresIn: '10M',
      }
    );
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Account Activation Link`,
      html: `
      <p>Please Use This Link To Activate Your:</p>
      <p>${process.env.CLIENT_URL}/auth/account/activate/${token}</p>
      <hr/>
      <p>This Email Contains Sensible Informations</p>
      <p>https://technews.com</p>
    `,
    };
    sgMail.send(emailData).then((sent) => {
      return res.json({
        message: `An Email Was Sent To ${email}. Please Follow Instructions To Activate Your Account`,
      });
    });
  });
};

// const = signup = (req, res) => {
//   User.findOne({ email: req.body.email }).exec((err, user) => {
//     if (user) {
//       return res.status(400).json({
//         error: 'Email Is Taken!',
//       });
//     }

//     const { name, email, password } = req.body;
//     let username = shortId.generate();
//     let profile = `${process.env.CLIENT_URL}/profile/${username}`;
//     let newUser = new User({ name, email, password, profile, username });
//     newUser.save((err, success) => {
//       if (err) {
//         return res.status(400).json({
//           error: err,
//         });
//       }
//       // res.json({
//       //   user: success,
//       // });
//       res.json({
//         message: 'Registration Is Succeded, Please Log Into Your Account',
//       });
//     });
//   });
// };

const signup = (req, res) => {
  const token = req.body.token;
  if (token) {
    jwt.verify(
      token,
      process.env.JWT_ACCOUNT_ACTIVATION,
      function (err, decoded) {
        if (err) {
          return res.status(401).json({
            error: 'Link Expired, Register Again',
          });
        }
        const { name, email, password } = jwt.decode(token);
        let username = shortId.generate();
        let profile = `${process.env.CLIENT_URL}/profile/${username}`;
        const user = new User({ name, email, password, profile, username });
        user.save((err, user) => {
          if (err) {
            return res.status(401).json({
              error: errorHandler(err),
            });
          }
          return res.json({
            message: 'Registration Is Succeded, Please Log Into Your Account',
          });
        });
      }
    );
  } else {
    return res.json({
      message: 'Something Is Wrong!, Try Again',
    });
  }
};

const signin = (req, res) => {
  const { email, password } = req.body;
  // check if user exist
  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'No Email Found, Please register!',
      });
    }
    // authenticate
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: 'Wrong Password!',
      });
    }
    // generate a token and send to client
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
    res.cookie('token', token, { expiresIn: '1d' });
    const { _id, username, name, email, role } = user;
    return res.json({
      token,
      user: { _id, username, name, email, role },
    });
  });
};

const signout = (req, res) => {
  res.clearCookie('token');
  res.json({
    message: 'Logout Successfull',
  });
};

const requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
});

const authMiddleware = (req, res, next) => {
  const authUserId = req.user._id;
  User.findById({ _id: authUserId }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User not found',
      });
    }
    req.profile = user;
    next();
  });
};

const adminMiddleware = (req, res, next) => {
  const adminUserId = req.user._id;
  User.findById({ _id: adminUserId }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User not found',
      });
    }
    if (user.role !== 1) {
      return res.status(400).json({
        error: 'Admin resource. Access denied',
      });
    }
    req.profile = user;
    next();
  });
};

const canUpdateDeleteBlog = (req, res, next) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug }).exec((err, data) => {
    if (err) {
      return res.status(400).json({
        error: errorhandler(),
      });
    }
    let authorizedUser =
      data.postedBy._id.toString() === req.profile._id.toString();
    if (!authorizedUser) {
      return res.status(400).json({
        error: 'Not Allowed',
      });
    }
    next();
  });
};

const forgotPassword = (req, res) => {
  const { email } = req.body;
  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(401).json({
        error: 'No Email Found!',
      });
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, {
      expiresIn: '10m',
    });
    //email
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Reset Link`,
      html: `
      <p>Please Use This Link To Reset Your Password:</p>
      <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
      <hr/>
      <p>This Email Contains Sensible Informations</p>
      <p>https://techflu.com</p>
    `,
    };
    // populating the db > user > resetPasswordLink
    return user.updateOne({ resetPasswordLink: token }, (err, success) => {
      if (err) {
        return res.json({ error: errorHandler(err) });
      } else {
        sgMail.send(emailData).then((sent) => {
          return res.json({
            message: `An Email Was Sent To ${email}. Please Follow Instructions To Activate Your Account, This link Is To Expire In 10 Minutes`,
          });
        });
      }
    });
  });
};

const resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;
  if (resetPasswordLink) {
    jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD,
      function (err, decoded) {
        if (err) {
          return res.status(401).json({
            error: 'Expired Link, try Again',
          });
        }
        User.findOne({ resetPasswordLink }, (err, user) => {
          if (err || !user) {
            return res.status(401).json({
              error: 'Something Is Wrong!, Try Again',
            });
          }
          const updatedFields = {
            password: newPassword,
            resetPasswordLink: '',
          };
          user = _.extend(user, updatedFields);
          user.save((err, result) => {
            if (err || !user) {
              return res.status(401).json({
                error: errorHandler(err),
              });
            }
            res.json({
              message: 'You Can Now Log In With Your New Password!',
            });
          });
        });
      }
    );
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const googleLogin = (req, res) => {
  const idToken = req.body.tokenId;
  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    .then((response) => {
      const { email_verified, name, email, jti } = response.payload;
      if (email_verified) {
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: '1d',
            });
            res.cookie('token', token, { expiresIn: '1d' });
            const { _id, email, name, role, username } = user;
            return res.json({
              token,
              user: { _id, email, name, role, username },
            });
          } else {
            let username = shortId.generate;
            let profile = `${process.env.CLIENT_URL}/profile/${username}`;
            let password = jti + process.env.JWT_SECRET;
            user = new User({ name, email, profile, username, password });
            user.save((err, data) => {
              if (err) {
                return res.status(400).json({
                  error: errorHandler(err),
                });
              }
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                {
                  expiresIn: '1d',
                }
              );
              res.cookie('token', token, { expiresIn: '1d' });
              const { _id, email, name, role, username } = data;
              return res.json({
                token,
                user: { _id, email, name, role, username },
              });
            });
          }
        });
      } else {
        return res.status(400).json({
          error: 'Registration Failed, Try Again!',
        });
      }
    });
};

export {
  preSignup,
  signup,
  signin,
  signout,
  requireSignin,
  authMiddleware,
  adminMiddleware,
  canUpdateDeleteBlog,
  forgotPassword,
  resetPassword,
  googleLogin,
};
