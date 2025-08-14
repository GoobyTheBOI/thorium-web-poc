import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Only allow POST requests to TTS API
    if (request.method !== 'POST') {
        return NextResponse.json({
            error: 'Method not allowed',
            details: 'Only POST requests are accepted'
        }, { status: 405 });
    }

    // Continue to the next middleware or route handler
    return NextResponse.next();
}

export const config = {
    matcher: '/api/tts/:path*',
}
