import Blog from '../models/blog.js';
import Category from '../models/category.js';
import Tag from '../models/tag.js';
import User from '../models/user.js';
import formidable from 'formidable';
import slugy from 'unicode-slug';
import stripHtml from 'string-strip-html';
import _ from 'lodash';
import { errorHandler } from '../helpers/dbErrorHandler.js';
import fs from 'fs';
import { smartTrim } from '../helpers/blog.js';

const create = (req, res) => {
  let form = new formidable.IncomingForm();

  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: 'Photo Is Not Uploaded!',
      });
    }
    const { title, body, categories, tags } = fields;

    if (!title || !title.length) {
      return res.status(400).json({
        error: 'Post Name Is Empty!',
      });
    }

    if (!body || body.length < 200) {
      return res.status(400).json({
        error: 'Content Is So Short!',
      });
    }

    if (!categories || categories.length === 0) {
      return res.status(400).json({
        error: 'You Should Pick At Least One Category!',
      });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({
        error: 'You Should Pick At Least One Tag!',
      });
    }

    let blog = new Blog();

    blog.title = title;
    blog.body = body;
    blog.excerpt = smartTrim(body, 320, ' ', ' ...');
    blog.slug = slugy(title).toLowerCase();
    blog.mtitle = `${title} | ${process.env.APP_NAME}`;
    blog.mdesc = stripHtml(body.substring(0, 160));
    blog.postedBy = req.user._id;

    // categories and tags
    let arrayOfCategories = categories && categories.split(',');
    let arrayOfTags = tags && tags.split(',');

    if (files.photo) {
      if (files.photo.size > 10000000) {
        return res.status(400).json({
          error: 'The Size Of The Photo Must Be Less Than 1MB',
        });
      }
      blog.photo.data = fs.readFileSync(files.photo.path);
      blog.photo.contentType = files.photo.type;
    }

    blog.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      // res.json(result);
      Blog.findByIdAndUpdate(
        result._id,
        { $push: { categories: arrayOfCategories } },
        { new: true }
      ).exec((err, result) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        } else {
          Blog.findByIdAndUpdate(
            result._id,
            { $push: { tags: arrayOfTags } },
            { new: true }
          ).exec((err, result) => {
            if (err) {
              return res.status(400).json({
                error: errorHandler(err),
              });
            } else {
              res.json(result);
            }
          });
        }
      });
    });
  });
};

const list = (req, res) => {
  Blog.find({})
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username')
    .select(
      '_id title slug excerpt categories tags postedBy createdAt updatedAt'
    )
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(data);
    });
};

const listAllBlogsCategoriesTags = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;
  let blogs;
  let categories;
  let tags;
  Blog.find({})
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username profile')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      '_id title slug excerpt categories tags postedBy createdAt updatedAt'
    )
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      blogs = data; // blogs
      // get all categories
      Category.find({}).exec((err, c) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }
        categories = c; // categories
        // get all tags
        Tag.find({}).exec((err, t) => {
          if (err) {
            return res.status(400).json({
              error: errorHandler(err),
            });
          }
          tags = t;
          // return all blogs categories tags
          res.json({ blogs, categories, tags, size: blogs.length });
        });
      });
    });
};

const read = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug })
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username')
    .select(
      '_id title body slug mtitle mdesc categories tags postedBy createdAt updatedAt'
    )
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(data);
    });
};

const remove = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOneAndRemove({ slug }).exec((err, data) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json({
      message: 'Post Deleted Successfully!',
    });
  });
};

const update = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug }).exec((err, oldBlog) => {
    if (err) {
      return res.status(400).json({
        error: errHandler(err),
      });
    }
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          error: 'Photo Is Not Uploaded!',
        });
      }

      let slugBeforeMerge = oldBlog.slug;
      oldBlog = _.merge(oldBlog, fields);
      oldBlog.slug = slugBeforeMerge;

      const { body, desc, categories, tags } = fields;

      if (body) {
        oldBlog.excerpt = smartTrim(body, 320, ' ', ' ...');
        oldBlog.mdesc = stripHtml(body.substring(0, 160));
      }
      if (tags) {
        oldBlog.tags = tags.split(',');
      }
      if (categories) {
        oldBlog.categories = categories.split(',');
      }

      if (files.photo) {
        if (files.photo.size > 10000000) {
          return res.status(400).json({
            error: 'The Size Of The Photo Must Be Less Than 1MB',
          });
        }
        oldBlog.photo.data = fs.readFileSync(files.photo.path);
        oldBlog.photo.contentType = files.photo.type;
      }

      oldBlog.save((err, result) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }
        // result.photo = undefined;
        res.json(result);
      });
    });
  });
};

const photo = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug })
    .select('photo')
    .exec((err, blog) => {
      if (err || !blog) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.set('Content-Type', blog.photo.contentType);
      return res.send(blog.photo.data);
    });
};

const listRelated = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 3;
  const { _id, categories } = req.body.blog;

  Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
    .limit(limit)
    .populate('postedBy', '_id name username profile')
    .select('title slug excerpt postedBy, createdAt, updatedAt')
    .exec((err, blogs) => {
      if (err) {
        return res.status(400).json({
          error: 'Blogs Not Found',
        });
      }
      res.json(blogs);
    });
};

const listSearch = (req, res) => {
  const { search } = req.query;
  if (search) {
    Blog.find(
      {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { body: { $regex: search, $options: 'i' } },
        ],
      },
      (err, blogs) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }
        res.json(blogs);
      }
    ).select('-photo -body');
  }
};

const listByUser = (req, res) => {
  User.findOne({ username: req.params.username }).exec((err, user) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    let userId = user._id;
    Blog.find({ postedBy: userId })
      .populate('categories', '_id name slug')
      .populate('tags', '_id name slug')
      .populate('postedBy', '_id name username')
      .select('_id title slug postedBy createdAt updatedAt')
      .exec((err, data) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }
        res.json(data);
      });
  });
};

export { listByUser, listSearch, listRelated, photo, update, remove, read, listAllBlogsCategoriesTags, list, create }