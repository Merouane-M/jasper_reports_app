import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db';
import { AuthPayload } from '../common/middleware/auth.middleware';

const SALT_ROUNDS = 10;

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

function generateTokens(payload: AuthPayload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  } as jwt.SignOptions);

  const refreshToken = crypto.randomBytes(64).toString('hex');
  return { accessToken, refreshToken };
}

async function hashRefreshToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function register(dto: RegisterDto) {
  const { rows: existing } = await query(
    'SELECT id FROM users WHERE email = $1',
    [dto.email.toLowerCase()]
  );
  if (existing.length) throw new Error('Email already registered');

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const { rows: roles } = await query(
    "SELECT id FROM roles WHERE name = 'user'"
  );

  const { rows } = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name`,
    [dto.email.toLowerCase(), passwordHash, dto.firstName, dto.lastName, roles[0].id]
  );
  return rows[0];
}

export async function login(dto: LoginDto, ip: string) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
            u.is_active, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [dto.email.toLowerCase()]
  );

  if (!rows.length) throw new Error('Invalid credentials');
  const user = rows[0];

  if (!user.is_active) throw new Error('Account inactive');

  const valid = await bcrypt.compare(dto.password, String(user.password_hash));
  if (!valid) throw new Error('Invalid credentials');

  const payload: AuthPayload = {
    userId: String(user.id),
    email: String(user.email),
    role: String(user.role),
  };

  const { accessToken, refreshToken } = generateTokens(payload);
  const tokenHash = await hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    },
  };
}

export async function refreshAccessToken(token: string) {
  const tokenHash = await hashRefreshToken(token);

  const { rows } = await query(
    `SELECT rt.user_id, u.email, r.name AS role
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE rt.token_hash = $1
       AND rt.revoked = 0
       AND rt.expires_at > GETUTCDATE()
       AND u.is_active = 1`,
    [tokenHash]
  );

  if (!rows.length) {
    console.log('[AUTH] Refresh token not found or invalid:', { tokenHash });
    throw new Error('Invalid refresh token');
  }

  const payload: AuthPayload = {
    userId: String(rows[0].user_id),
    email: String(rows[0].email),
    role: String(rows[0].role),
  };

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload);

  // Rotate refresh token
  await query('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = $1', [tokenHash]);
  const newHash = await hashRefreshToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [rows[0].user_id, newHash, expiresAt]
  );

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string) {
  const tokenHash = await hashRefreshToken(refreshToken);
  await query('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = $1', [tokenHash]);
}
