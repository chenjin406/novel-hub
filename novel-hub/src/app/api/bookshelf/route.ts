import { NextRequest, NextResponse } from 'next/server';
import { addToBookshelf, getUserBookshelf, updateReadingProgress, removeFromBookshelf } from '@/lib/bookshelf';
import { getCurrentUser } from '@/lib/auth';

// 获取用户书架
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const { data, error } = await getUserBookshelf(user.id, status || undefined);
    
    if (error) {
      return NextResponse.json(
        { error: '获取书架失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Bookshelf GET error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 添加书籍到书架
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { bookId } = await request.json();
    
    if (!bookId) {
      return NextResponse.json(
        { error: '请提供书籍ID' },
        { status: 400 }
      );
    }
    
    const { data, error } = await addToBookshelf(user.id, bookId);
    
    if (error) {
      return NextResponse.json(
        { error: '添加到书架失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Bookshelf POST error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 更新阅读进度
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { bookId, chapterNumber, progress } = await request.json();
    
    if (!bookId || chapterNumber === undefined || progress === undefined) {
      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      );
    }
    
    const { data, error } = await updateReadingProgress(user.id, bookId, chapterNumber, progress);
    
    if (error) {
      return NextResponse.json(
        { error: '更新阅读进度失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Bookshelf PUT error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 从书架移除
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    
    if (!bookId) {
      return NextResponse.json(
        { error: '请提供书籍ID' },
        { status: 400 }
      );
    }
    
    const { error } = await removeFromBookshelf(user.id, bookId);
    
    if (error) {
      return NextResponse.json(
        { error: '从书架移除失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Bookshelf DELETE error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}