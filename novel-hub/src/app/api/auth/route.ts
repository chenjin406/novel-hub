import { NextRequest, NextResponse } from 'next/server';
import { signUp, signIn, getCurrentUser, signOut } from '@/lib/auth';

// 用户注册
export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();
    
    switch (action) {
      case 'register':
        const { email, password, username } = data;
        if (!email || !password || !username) {
          return NextResponse.json(
            { error: '请填写所有必填项' },
            { status: 400 }
          );
        }
        
        const registerResult = await signUp(email, password, username);
        if (registerResult.error) {
          return NextResponse.json(
            { error: registerResult.error },
            { status: 400 }
          );
        }
        
        return NextResponse.json({ data: registerResult.data });
        
      case 'login':
        const loginResult = await signIn(data.email, data.password);
        if (loginResult.error) {
          return NextResponse.json(
            { error: loginResult.error.message },
            { status: 401 }
          );
        }
        
        return NextResponse.json({ data: loginResult.data });
        
      case 'logout':
        await signOut();
        return NextResponse.json({ data: { success: true } });
        
      default:
        return NextResponse.json(
          { error: '无效的操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 获取当前用户信息
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}