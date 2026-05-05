const router = require('express').Router();
const {
  getPublishedPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getMyPosts,
  getFeed,
} = require('../controllers/postController');
const { likePost, unlikePost } = require('../controllers/likeController');
const { protect, optionalAuth } = require('../middleware/auth');
const { postRules, validate } = require('../middleware/validate');

// Public (optional auth)
router.get('/', optionalAuth, getPublishedPosts);
router.get('/me', protect, getMyPosts);       // must come before /:id
router.get('/feed', protect, getFeed);
router.get('/:id', optionalAuth, getPost);

// Protected
router.post('/', protect, postRules, validate, createPost);
router.patch('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

// Likes
router.post('/:id/like', protect, likePost);
router.delete('/:id/like', protect, unlikePost);

module.exports = router;