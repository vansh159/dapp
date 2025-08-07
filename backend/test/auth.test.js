const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

// Test database
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/agrichain_test';

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      name: 'John Farmer',
      email: 'john@farmer.com',
      password: 'password123',
      role: 'FARMER',
      walletAddress: '0x1234567890123456789012345678901234567890',
      profile: {
        organization: 'Organic Farm',
        location: '123 Farm Road',
        phone: '+1234567890'
      }
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.role).toBe(validUserData.role);
      expect(response.body.data.token).toBeDefined();

      // Check if user was created in database
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(validUserData.name);
    });

    it('should not register user with invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should not register user with weak password', async () => {
      const invalidData = { ...validUserData, password: '123' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });

    it('should not register user with invalid role', async () => {
      const invalidData = { ...validUserData, role: 'INVALID_ROLE' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not register duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to create user with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should hash password before saving', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      const user = await User.findOne({ email: validUserData.email });
      expect(user.password).not.toBe(validUserData.password);
      expect(user.password.length).toBeGreaterThan(20); // Hashed password should be longer
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      name: 'John Farmer',
      email: 'john@farmer.com',
      password: 'password123',
      role: 'FARMER'
    };

    beforeEach(async () => {
      // Create a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email
          // password missing
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should increment login attempts on failed login', async () => {
      // Make multiple failed login attempts
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      const user = await User.findOne({ email: userData.email });
      expect(user.loginAttempts).toBe(1);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    const userData = {
      name: 'John Farmer',
      email: 'john@farmer.com',
      password: 'password123',
      role: 'FARMER'
    };

    beforeEach(async () => {
      // Register and login to get auth token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      authToken = registerResponse.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let authToken;
    const userData = {
      name: 'John Farmer',
      email: 'john@farmer.com',
      password: 'password123',
      role: 'FARMER'
    };

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      authToken = registerResponse.body.data.token;
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'John Updated Farmer',
        profile: {
          organization: 'Updated Organic Farm',
          location: '456 New Farm Road'
        }
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.profile.organization).toBe(updateData.profile.organization);
    });

    it('should not update protected fields', async () => {
      const updateData = {
        email: 'newemail@example.com', // Should not be allowed to change
        role: 'ADMIN' // Should not be allowed to change
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.user.email).toBe(userData.email); // Should remain unchanged
      expect(response.body.data.user.role).toBe(userData.role); // Should remain unchanged
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let authToken;
    const userData = {
      name: 'John Farmer',
      email: 'john@farmer.com',
      password: 'password123',
      role: 'FARMER'
    };

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      authToken = registerResponse.body.data.token;
    });

    it('should change password with valid current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Try logging in with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'newpassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should not change password with invalid current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });

    it('should not change password with weak new password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: '123' // Too weak
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;
    const userData = {
      name: 'John Farmer',
      email: 'john@farmer.com',
      password: 'password123',
      role: 'FARMER'
    };

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      authToken = registerResponse.body.data.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });

    it('should logout without token (optional auth)', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimited = responses.some(response => response.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});