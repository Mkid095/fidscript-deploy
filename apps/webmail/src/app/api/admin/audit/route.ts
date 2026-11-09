import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require';
import { db } from '@/lib/db';

/** The audit trail, newest first. Admin-only; the platform's paper record. */
export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const rows = await db.auditLog.findMany({
    take: 200,
    orderBy: { at: 'desc' },
  });
  return NextResponse.json({
    entries: rows.map((row) => ({
      at: row.at.toISOString(),
      actor: row.actor,
      action: row.action,
      detail: JSON.parse(row.detail || '{}'),
      ip: row.ip,
    })),
  });
}
