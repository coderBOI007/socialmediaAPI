const router = require('express').Router();
const {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
} = require('../controllers/followController');
const { protect } = require('../middleware/auth');

router.post('/:id/follow', protect, followUser);
router.delete('/:id/follow', protect, unfollowUser);
router.get('/:id/following', protect, getFollowing);
router.get('/:id/followers', protect, getFollowers);

module.exports = router;