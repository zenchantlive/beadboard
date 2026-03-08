import { NextResponse } from 'next/server';
import { bbDaemon } from '../../../../lib/bb-daemon';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return NextResponse.json(bbDaemon.getStatus());
}
