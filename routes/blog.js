import express from 'express';
const router = express.Router();
import {
  create,
  list,
  listAllBlogsCategoriesTags,
  read,
  remove,
  update,
  photo,
  listRelated,
  listSearch,
  listByUser,
} from '../controllers/blog.js';

import {
  requireSignin,
  adminMiddleware,
  authMiddleware,
  canUpdateDeleteBlog,
} from '../controllers/auth.js';

router.post('/blog', requireSignin, adminMiddleware, create);
router.put('/blog/:slug', requireSignin, adminMiddleware, update);
router.delete('/blog/:slug', requireSignin, adminMiddleware, remove);
router.post('/blogs-categories-tags', listAllBlogsCategoriesTags);
router.get('/blogs', list);
router.get('/blog/:slug', read);
router.get('/blog/photo/:slug', photo);
router.post('/blogs/related', listRelated);
router.get('/blogs/search', listSearch);

// auth user blog crud
router.post('/user/blog', requireSignin, authMiddleware, create);
router.get('/:username/blogs', listByUser);
router.delete(
  '/user/blog/:slug',
  requireSignin,
  authMiddleware,
  canUpdateDeleteBlog,
  remove
);
router.put(
  '/user/blog/:slug',
  requireSignin,
  authMiddleware,
  canUpdateDeleteBlog,
  update
);

export default router