import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Simple health-check endpoint to verify the backend is running.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
