import { supabase } from './supabase';

// 书架项目类型
export interface BookshelfItem {
  id: string;
  user_id: string;
  book_id: string;
  status: 'reading' | 'completed' | 'paused' | 'dropped';
  current_chapter: number;
  reading_progress: number; // 阅读进度百分比
  last_read_at: string;
  added_at: string;
  updated_at: string;
}

export interface BookshelfBook extends BookshelfItem {
  book: {
    id: string;
    title: string;
    author: string;
    cover_url?: string;
    total_chapters: number;
    description?: string;
  };
}

// 添加到书架
export async function addToBookshelf(userId: string, bookId: string) {
  const { data, error } = await supabase
    .from('bookshelf')
    .insert({
      user_id: userId,
      book_id: bookId,
      status: 'reading',
      current_chapter: 1,
      reading_progress: 0,
      last_read_at: new Date().toISOString(),
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
    
  return { data, error };
}

// 从书架移除
export async function removeFromBookshelf(userId: string, bookId: string) {
  const { error } = await supabase
    .from('bookshelf')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId);
    
  return { error };
}

// 获取用户书架
export async function getUserBookshelf(userId: string, status?: string) {
  let query = supabase
    .from('bookshelf')
    .select(`
      *,
      book:books(id, title, author, cover_url, total_chapters, description)
    `)
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false });
    
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  return { data: data as BookshelfBook[] | null, error };
}

// 更新阅读进度
export async function updateReadingProgress(
  userId: string, 
  bookId: string, 
  chapterNumber: number, 
  progress: number
) {
  const { data, error } = await supabase
    .from('bookshelf')
    .update({
      current_chapter: chapterNumber,
      reading_progress: progress,
      last_read_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .select()
    .single();
    
  return { data, error };
}

// 更新阅读状态
export async function updateBookshelfStatus(
  userId: string, 
  bookId: string, 
  status: 'reading' | 'completed' | 'paused' | 'dropped'
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };
  
  // 如果标记为完成，设置进度为100%
  if (status === 'completed') {
    updateData.reading_progress = 100;
  }
  
  const { data, error } = await supabase
    .from('bookshelf')
    .update(updateData)
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .select()
    .single();
    
  return { data, error };
}

// 检查书籍是否在书架中
export async function isInBookshelf(userId: string, bookId: string): Promise<boolean> {
  const { data } = await supabase
    .from('bookshelf')
    .select('id')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single();
    
  return !!data;
}

// 获取阅读统计
export async function getReadingStats(userId: string) {
  const { data, error } = await supabase
    .from('bookshelf')
    .select(`
      status,
      reading_progress,
      book:books(total_chapters)
    `)
    .eq('user_id', userId);
    
  if (error || !data) return null;
  
  const stats = {
    total_books: data.length,
    reading: data.filter((item: any) => item.status === 'reading').length,
    completed: data.filter((item: any) => item.status === 'completed').length,
    total_chapters: data.reduce((sum: number, item: any) => sum + (item.book?.total_chapters || 0), 0),
    avg_progress: data.length > 0 ? Math.round(data.reduce((sum: number, item: any) => sum + item.reading_progress, 0) / data.length) : 0
  };
  
  return stats;
}

export default {
  addToBookshelf,
  removeFromBookshelf,
  getUserBookshelf,
  updateReadingProgress,
  updateBookshelfStatus,
  isInBookshelf,
  getReadingStats
};