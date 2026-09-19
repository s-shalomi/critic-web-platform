import { NextResponse } from 'next/server';
import { authenticateStudent } from '@/domains/auth/authService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessCode } = body;

    const result = await authenticateStudent(accessCode);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
    });

    // Set HTTP-only auth cookie
    response.cookies.set('critic_session', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
