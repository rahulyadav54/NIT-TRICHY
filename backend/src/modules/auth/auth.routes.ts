import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { queryOne, execute } from '../../config/db.js';
import { generateToken } from '../../utils/jwt.js';
import { authGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { randomUUID } from 'crypto';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input format',
        errors: parsed.error.errors,
      });
    }

    const { email, password } = parsed.data;
    const user = await queryOne(
      'SELECT id, email, "passwordHash", name, role, phone, active FROM "User" WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Record login audit log
    await execute(
      'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "ipAddress", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [randomUUID(), user.id, 'LOGIN', 'User', user.id, req.ip || '127.0.0.1']
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
});

authRouter.get('/me', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }

  const user = await queryOne(
    'SELECT id, email, name, role, phone, active, "createdAt" FROM "User" WHERE id = $1',
    [req.user.userId]
  );

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.json({
    success: true,
    user,
  });
});
