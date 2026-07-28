import { NextResponse } from 'next/server';

/**
 * Lightweight health check. This is the only kind of server route the app uses
 * today. It never receives or returns document contents.
 */
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'json-yaml-workbench',
    timestamp: new Date().toISOString(),
  });
}
