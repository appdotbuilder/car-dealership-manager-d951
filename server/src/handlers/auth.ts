import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing using Web Crypto API (for production use bcrypt)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

export async function login(input: LoginInput): Promise<{ success: boolean; user?: User }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      return { success: false };
    }

    const user = users[0];
    
    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.password_hash);
    
    if (!isValidPassword) {
      return { success: false };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        password_hash: user.password_hash,
        created_at: user.created_at
      }
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function createDefaultUser(): Promise<User> {
  try {
    // Check if any users exist
    const existingUsers = await db.select()
      .from(usersTable)
      .execute();

    if (existingUsers.length > 0) {
      // Return the first user if any exist
      return existingUsers[0];
    }

    // Create default admin user
    const defaultPassword = 'admin123'; // In production, this should be configurable
    const passwordHash = await hashPassword(defaultPassword);

    const result = await db.insert(usersTable)
      .values({
        username: 'admin',
        password_hash: passwordHash
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}