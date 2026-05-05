require('./setup');
const { api, createUser } = require('./helpers');

describe('Auth Endpoints', () => {
  const baseUser = {
    first_name: 'Jane',
    last_name: 'Doe',
    username: 'janedoe',
    email: 'jane@example.com',
    password: 'password123',
  };

  describe('POST /api/auth/signup', () => {
    it('should register a new user and return a token', async () => {
      const res = await api.post('/api/auth/signup').send(baseUser);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(baseUser.email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      await api.post('/api/auth/signup').send(baseUser);
      const res = await api.post('/api/auth/signup').send(baseUser);
      expect(res.status).toBe(409);
    });

    it('should reject duplicate username', async () => {
      await api.post('/api/auth/signup').send(baseUser);
      const res = await api.post('/api/auth/signup').send({ ...baseUser, email: 'other@example.com' });
      expect(res.status).toBe(409);
    });

    it('should return 422 for missing required fields', async () => {
      const res = await api.post('/api/auth/signup').send({ email: 'bad' });
      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 422 for invalid email', async () => {
      const res = await api.post('/api/auth/signup').send({ ...baseUser, email: 'not-an-email' });
      expect(res.status).toBe(422);
    });

    it('should return 422 for short password', async () => {
      const res = await api.post('/api/auth/signup').send({ ...baseUser, password: '123' });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/signin', () => {
    beforeEach(async () => {
      await api.post('/api/auth/signup').send(baseUser);
    });

    it('should sign in with valid credentials', async () => {
      const res = await api.post('/api/auth/signin').send({ email: baseUser.email, password: baseUser.password });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject wrong password', async () => {
      const res = await api.post('/api/auth/signin').send({ email: baseUser.email, password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await api.post('/api/auth/signin').send({ email: 'ghost@example.com', password: 'password123' });
      expect(res.status).toBe(401);
    });

    it('should return 422 for invalid email format', async () => {
      const res = await api.post('/api/auth/signin').send({ email: 'notvalid', password: 'password123' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const { token } = await createUser();
      const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const res = await api.get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with malformed token', async () => {
      const res = await api.get('/api/auth/me').set('Authorization', 'Bearer badtoken');
      expect(res.status).toBe(401);
    });
  });
});