import { NextResponse } from 'next/server';

// Server-side cache for session synchronization
let localHistoryStore: any[] = [];

export async function GET() {
  try {
    // Attempt to query sovereign backend inspection history if available
    const backendRes = await fetch('http://localhost:8000/api/inspection/history', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    }).catch(() => null);

    if (backendRes && backendRes.ok) {
      const backendData = await backendRes.json();
      return NextResponse.json({
        success: true,
        source: 'sovereign_backend',
        history: backendData,
        sessions: localHistoryStore,
      });
    }

    return NextResponse.json({
      success: true,
      source: 'local_storage',
      sessions: localHistoryStore,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      source: 'fallback',
      sessions: localHistoryStore,
      error: err?.message || 'Failed to fetch remote history',
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.sessions && Array.isArray(body.sessions)) {
      localHistoryStore = body.sessions;
      return NextResponse.json({ success: true, count: localHistoryStore.length });
    }
    if (body.session) {
      const existingIdx = localHistoryStore.findIndex((s) => s.id === body.session.id);
      if (existingIdx >= 0) {
        localHistoryStore[existingIdx] = body.session;
      } else {
        localHistoryStore.unshift(body.session);
      }
      return NextResponse.json({ success: true, count: localHistoryStore.length });
    }
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
