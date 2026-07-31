import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://api:3001/api/v1/installation/status', {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { lifecycle: 'CONFIGURED', authMethod: 'PASSWORD' },
      { status: 200 }
    );
  }
}
