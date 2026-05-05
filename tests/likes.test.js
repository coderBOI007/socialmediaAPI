require('./setup');
const { api, createUser, createPost, publishPost } = require('./helpers');

describe('Like Endpoints', () => {
  let ownerToken, otherToken, post;

  beforeEach(async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    ownerToken = u1.token;
    otherToken = u2.token;

    const draft = await createPost(ownerToken);
    await publishPost(ownerToken, draft._id);
    const res = await api.get(`/api/posts/${draft._id}`);
    post = res.body.data.post;
  });

  describe('POST /api/posts/:id/like', () => {
    it('should allow authenticated user to like a post', async () => {
      const res = await api.post(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(201);
    });

    it('should increment like_count', async () => {
      await api.post(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      const res = await api.get(`/api/posts/${post._id}`);
      expect(res.body.data.post.like_count).toBe(1);
    });

    it('should return 409 when liking twice', async () => {
      await api.post(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      const res = await api.post(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(409);
    });

    it('should allow different users to like same post', async () => {
      await api.post(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${ownerToken}`);
      const res = await api.post(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(201);
      const postRes = await api.get(`/api/posts/${post._id}`);
      expect(postRes.body.data.post.like_count).toBe(2);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await api.post('/api/posts/64a1b2c3d4e5f6a7b8c9d0e1/like').set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await api.post(`/api/posts/${post._id}/like`);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/posts/:id/like', () => {
    it('should allow user to unlike a liked post', async () => {
      await api.post(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      const res = await api.delete(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);
    });

    it('should decrement like_count after unlike', async () => {
      await api.post(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      await api.delete(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      const res = await api.get(`/api/posts/${post._id}`);
      expect(res.body.data.post.like_count).toBe(0);
    });

    it('should return 404 when unliking a non-liked post', async () => {
      const res = await api.delete(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await api.delete(`/api/posts/${post._id}/like`);
      expect(res.status).toBe(401);
    });
  });
});