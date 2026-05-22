import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { query } from '../../utils/db';
import { signToken } from '../../utils/jwt';
import { sendSuccess, sendError } from '../../utils/response';
import { SignupBody, LoginBody, User, PublicUser } from '../../types';

const SALT_ROUNDS = 10;
const VALID_ROLES = ['contributor', 'maintainer'];

/**
 * POST /api/auth/signup
 * Register a new user account
 */
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role = 'contributor' } = req.body as SignupBody;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!name || !email || !password) {
      sendError(res, StatusCodes.BAD_REQUEST, 'name, email, and password are required.');
      return;
    }

    if (!VALID_ROLES.includes(role)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'role must be contributor or maintainer.');
      return;
    }

    // ── Check duplicate email ────────────────────────────────────────────────
    const existing = await query<User>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      sendError(res, StatusCodes.BAD_REQUEST, 'An account with this email already exists.');
      return;
    }

    // ── Hash password & insert ───────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query<PublicUser>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, hashedPassword, role]
    );

    sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginBody;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!email || !password) {
      sendError(res, StatusCodes.BAD_REQUEST, 'email and password are required.');
      return;
    }

    // ── Find user ────────────────────────────────────────────────────────────
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password.');
      return;
    }

    const user = result.rows[0];

    // ── Compare password ─────────────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password.');
      return;
    }

    // ── Sign token ───────────────────────────────────────────────────────────
    const token = signToken({ id: user.id, name: user.name, role: user.role });

    // Never expose password in response
    const { password: _pw, ...publicUser } = user;

    sendSuccess(res, StatusCodes.OK, 'Login successful', { token, user: publicUser });
  } catch (err) {
    next(err);
  }
};
