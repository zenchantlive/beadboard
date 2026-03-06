import { NextResponse } from 'next/server';
import { embeddedPiDaemon } from '../../../../lib/embedded-daemon';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return NextResponse.json(embeddedPiDaemon.getStatus());
}
