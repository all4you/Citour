import { Context, Next } from 'hono';

export interface AuthUser {
    id: number;
    tenantId: number;
    name: string;
    account: string;
    role: 'sys_admin' | 'admin' | 'student';
}

declare module 'hono' {
    interface ContextVariableMap {
        user: AuthUser;
        tenantId: number;
    }
}

// Parse tenant ID from header
export async function tenantMiddleware(c: Context, next: Next) {
    const tenantIdHeader = c.req.header('X-Tenant-ID');

    if (!tenantIdHeader) {
        return c.json({ error: 'Missing X-Tenant-ID header' }, 401);
    }

    const tenantId = parseInt(tenantIdHeader, 10);
    if (isNaN(tenantId)) {
        return c.json({ error: 'Invalid X-Tenant-ID' }, 401);
    }

    c.set('tenantId', tenantId);
    await next();
}

// Require system admin role
export async function requireSysAdmin(c: Context, next: Next) {
    const user = c.get('user');

    if (!user || user.role !== 'sys_admin') {
        return c.json({ error: 'Requires system admin privileges' }, 403);
    }

    await next();
}

// Require admin role (tenant admin or sys admin)
export async function requireAdmin(c: Context, next: Next) {
    const user = c.get('user');

    if (!user || (user.role !== 'admin' && user.role !== 'sys_admin')) {
        return c.json({ error: 'Requires admin privileges' }, 403);
    }

    await next();
}

// Simple session-based auth (for demo - in production use JWT)
export async function authMiddleware(c: Context, next: Next) {
    // For now, we'll skip auth for easier testing
    // TODO: Implement proper JWT authentication
    await next();
}
