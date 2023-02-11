import User from '../models/user.js';
import Blog from '../models/blog.js';
import { errorHandler } from '../helpers/dbErrorHandler.js';
import _ from 'lodash';
import formidable from 'formidable';
import fs from 'fs';

const read = (req, res) => {
  req.profile.hashed_password = undefined;
  return res.json(req.profile);
};

const publicProfile = (req, res) => {
  let username = req.params.username;
  let user;
  let blogs;
  User.findOne({ username }).exec((err, userFromDB) => {
    if (err || !userFromDB) {
      return res.status(400).json({
        err: 'User Not Found',
      });
    }
    user = userFromDB;
    let userId = user._id;
    Blog.find({ postedBy: userId })
      .populate('categories', '_id name slug')
      .populate('tags', '_id name slug')
      .populate('postedBy', '_id name')
      .limit(10)
      .select(
        '_id title slug excerpt categories tags postedBy createdAt updatedAt'
      )
      .exec((err, data) => {
        if (err) {
          if (err || !userFromDB) {
            return res.status(400).json({
              err: errorHandler(err),
            });
          }
        }
        user.photo = undefined;
        user.hashed_password = undefined;
        res.json({
          user,
          blogs: data,
        });
      });
  });
};

const update = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: 'Cannot Upload Photo',
      });
    }
    let user = req.profile;
    user = _.extend(user, fields);

    if (fields.password && fields.password.length < 6) {
      return res.status(400).json({
        error: 'Password Must Contain At Least 6 Characters!',
      });
    }

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: 'Photo Must Be At Least 1MB',
        });
      }
      user.photo.data = fs.readFileSync(files.photo.path);
      user.photo.contentType = files.photo.type;
    }
    user.save((err, result) => {
      if (err) {
        return res.status(400).json({
          err: errorHandler(err),
        });
      }
      user.hashed_password = undefined;
      user.salt = undefined;
      user.photo = undefined;
      res.json(user);
    });
  });
};

const photo = (req, res) => {
  const username = req.params.username;
  User.findOne({ username }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'No Account Is Found',
      });
    }
    if (user.photo.data) {
      res.set('Content-Type', user.photo.ContentType);
      return res.send(user.photo.data);
    }
  });
};

export { read, publicProfile, update, photo }