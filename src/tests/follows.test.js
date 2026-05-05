require('./setup');
const { api, createUser } = require('./helpers');

describe('Follow Endpoints', () => {
  let user1, token1, user2, token2, user3, token3;

  beforeEach(async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    const u3 = await createUser();
    user1 = u1.user; token1 = u1.token;
    user2 = u2.user; token2 = u2.token;
    user3 = u3.user; token3 = u3.token;
  });

  describe('POST /api/users/:id/follow', () => {
    it('should allow a user to follow another', async () => {
      const res = await api.post(`/api/users/${user2._id}/follow`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(201);
    });

    it('should return 400 when following yourself', async () => {
      const res = await api.post(`/api/users/${user1._id}/follow`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(400);
    });

    it('should return 409 when already following', async () => {
      await api.post(`/api/users/${user2._id}/follow`).set('Authorization', `Bearer ${token1}`);
      const res = await api.post(`/api/users/${user2._id}/follow`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(409);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await api.post('/api/users/64a1b2c3d4e5f6a7b8c9d0e1/follow').set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await api.post(`/api/users/${user2._id}/follow`);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/users/:id/follow', () => {
    it('should allow a user to unfollow', async () => {
      await api.post(`/api/users/${user2._id}/follow`).set('Authorization', `Bearer ${token1}`);
      const res = await api.delete(`/api/users/${user2._id}/follow`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 when not following the user', async () => {
      const res = await api.delete(`/api/users/${user2._id}/follow`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await api.delete(`/api/users/${user2._id}/follow`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:id/following', () => {
    it('should return list of users the user follows', async () => {
      await api.post(`/api/users/${user2._id}/follow`).set('Authorization', `Bearer ${token1}`);
      await api.post(`/api/users/${user3._id}/follow`).set('Authorization', `Bearer ${token1}`);
      const res = await api.get(`/api/users/${user1._id}/following`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(200);
      expect(res.body.data.following.length).toBe(2);
      expect(res.body.data.total).toBe(2);
    });

    it('should return empty list when following nobody', async () => {
      const res = await api.get(`/api/users/${user1._id}/following`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(200);
      expect(res.body.data.following.length).toBe(0);
    });

    it('should not expose passwords', async () => {
      await api.post(`/api/users/${user2._id}/follow`).set('Authorization', `Bearer ${token1}`);
      const res = await api.get(`/api/users/${user1._id}/following`).set('Authorization', `Bearer ${token1}`);
      res.body.data.following.forEach(u => expect(u.password).toBeUndefined());
    });

    it('should return 401 without authentication', async () => {
      const res = await api.get(`/api/users/${user1._id}/following`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:id/followers', () => {
    it('should return list of followers', async () => {
      await api.post(`/api/users/${user1._id}/follow`).set('Authorization', `Bearer ${token2}`);
      await api.post(`/api/users/${user1._id}/follow`).set('Authorization', `Bearer ${token3}`);
      const res = await api.get(`/api/users/${user1._id}/followers`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(200);
      expect(res.body.data.followers.length).toBe(2);
      expect(res.body.data.total).toBe(2);
    });

    it('should return empty list when no followers', async () => {
      const res = await api.get(`/api/users/${user1._id}/followers`).set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(200);
      expect(res.body.data.followers.length).toBe(0);
    });

    it('should not expose passwords', async () => {
      await api.post(`/api/users/${user1._id}/follow`).set('Authorization', `Bearer ${token2}`);
      const res = await api.get(`/api/users/${user1._id}/followers`).set('Authorization', `Bearer ${token1}`);
      res.body.data.followers.forEach(u => expect(u.password).toBeUndefined());
    });

    it('should return 401 without authentication', async () => {
      const res = await api.get(`/api/users/${user1._id}/followers`);
      expect(res.status).toBe(401);
    });
  });
});