import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, createDefaultUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createDefaultUser', () => {
    it('should create a default admin user when no users exist', async () => {
      const result = await createDefaultUser();

      // Verify user structure
      expect(result.id).toBeDefined();
      expect(result.username).toEqual('admin');
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('admin123'); // Should be hashed
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save user to database', async () => {
      const result = await createDefaultUser();

      // Query database to verify user was saved
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('admin');
      expect(users[0].password_hash).toBeDefined();
      expect(users[0].created_at).toBeInstanceOf(Date);
    });

    it('should return existing user when users already exist', async () => {
      // Create first user
      const firstUser = await createDefaultUser();

      // Attempt to create another default user
      const secondResult = await createDefaultUser();

      // Should return the existing user, not create a new one
      expect(secondResult.id).toEqual(firstUser.id);
      expect(secondResult.username).toEqual(firstUser.username);
      expect(secondResult.password_hash).toEqual(firstUser.password_hash);

      // Verify only one user exists in database
      const allUsers = await db.select()
        .from(usersTable)
        .execute();

      expect(allUsers).toHaveLength(1);
    });

    it('should create user with hashed password', async () => {
      const result = await createDefaultUser();

      // Password should be hashed (SHA-256 produces 64 character hex string)
      expect(result.password_hash).toHaveLength(64);
      expect(result.password_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.password_hash).not.toEqual('admin123');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a default user before each login test
      await createDefaultUser();
    });

    it('should authenticate user with correct credentials', async () => {
      const input: LoginInput = {
        username: 'admin',
        password: 'admin123'
      };

      const result = await login(input);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.username).toEqual('admin');
      expect(result.user!.password_hash).toBeDefined();
      expect(result.user!.id).toBeDefined();
      expect(result.user!.created_at).toBeInstanceOf(Date);
    });

    it('should reject user with incorrect password', async () => {
      const input: LoginInput = {
        username: 'admin',
        password: 'wrongpassword'
      };

      const result = await login(input);

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should reject non-existent user', async () => {
      const input: LoginInput = {
        username: 'nonexistent',
        password: 'anypassword'
      };

      const result = await login(input);

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should handle empty username', async () => {
      const input: LoginInput = {
        username: '',
        password: 'admin123'
      };

      const result = await login(input);

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should handle empty password', async () => {
      const input: LoginInput = {
        username: 'admin',
        password: ''
      };

      const result = await login(input);

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should return complete user object on successful login', async () => {
      const input: LoginInput = {
        username: 'admin',
        password: 'admin123'
      };

      const result = await login(input);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();

      // Verify all required user fields are present
      const user = result.user!;
      expect(typeof user.id).toBe('number');
      expect(typeof user.username).toBe('string');
      expect(typeof user.password_hash).toBe('string');
      expect(user.created_at).toBeInstanceOf(Date);
      
      // Verify user matches database record
      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, 'admin'))
        .execute();
      
      expect(dbUsers).toHaveLength(1);
      expect(user.id).toEqual(dbUsers[0].id);
      expect(user.username).toEqual(dbUsers[0].username);
      expect(user.password_hash).toEqual(dbUsers[0].password_hash);
    });
  });

  describe('password hashing', () => {
    it('should create different hashes for different passwords', async () => {
      // Create two users manually to test different passwords
      const user1 = await db.insert(usersTable)
        .values({
          username: 'user1',
          password_hash: await hashPasswordHelper('password1')
        })
        .returning()
        .execute();

      const user2 = await db.insert(usersTable)
        .values({
          username: 'user2', 
          password_hash: await hashPasswordHelper('password2')
        })
        .returning()
        .execute();

      expect(user1[0].password_hash).not.toEqual(user2[0].password_hash);
    });

    it('should create consistent hashes for same password', async () => {
      const password = 'testpassword';
      const hash1 = await hashPasswordHelper(password);
      const hash2 = await hashPasswordHelper(password);

      expect(hash1).toEqual(hash2);
    });
  });
});

// Helper function to test password hashing (replicating the private function)
const hashPasswordHelper = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};