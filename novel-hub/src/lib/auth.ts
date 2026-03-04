import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 用户类型定义
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  coins: number; // 起点币余额
  vip_level: number; // VIP等级 0-普通 1-青铜 2-白银 3-黄金
  vip_expire_at?: string; // VIP过期时间
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  reading_time: number; // 阅读时长（分钟）
  books_read: number; // 已读本书
  chapters_read: number; // 已读章节数
  bookshelf_count: number; // 书架书籍数
}

// 创建 Supabase 客户端
function createSupabaseClient() {
  return createClient(supabaseUrl!, supabaseAnonKey!);
}

// 用户认证相关函数
export async function signUp(email: string, password: string, username: string) {
  const supabase = createSupabaseClient();
  
  // 检查用户名是否已存在
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();
    
  if (existingUser) {
    return { error: '用户名已存在' };
  }
  
  // 注册新用户
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        coins: 100, // 新用户赠送100起点币
        vip_level: 0,
        reading_time: 0,
        books_read: 0,
        chapters_read: 0,
      }
    }
  });
  
  if (authError) {
    return { error: authError.message };
  }
  
  // 创建用户资料
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        username,
        coins: 100,
        vip_level: 0,
        reading_time: 0,
        books_read: 0,
        chapters_read: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (profileError) {
      return { error: profileError.message };
    }
  }
  
  return { data: authData.user, error: null };
}

export async function signIn(email: string, password: string) {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const supabase = createSupabaseClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (!error) {
    redirect('/login');
  }
  
  return { error };
}

export async function getCurrentUser() {
  const supabase = createSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return userData as UserProfile | null;
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
    
  return { data, error };
}

// VIP 相关函数
export function checkVIPStatus(user: User): boolean {
  if (!user.vip_expire_at) return false;
  return new Date(user.vip_expire_at) > new Date();
}

export function getVIPDiscount(vipLevel: number): number {
  switch (vipLevel) {
    case 1: return 0.05; // 5% 折扣
    case 2: return 0.10; // 10% 折扣
    case 3: return 0.20; // 20% 折扣
    default: return 0;
  }
}

// 起点币相关函数
export async function addCoins(userId: string, amount: number, reason: string) {
  const supabase = createSupabaseClient();
  
  const { data: user } = await supabase
    .from('users')
    .select('coins')
    .eq('id', userId)
    .single();
    
  if (!user) return { error: '用户不存在' };
  
  const newCoins = user.coins + amount;
  
  const { data, error } = await supabase
    .from('users')
    .update({ coins: newCoins })
    .eq('id', userId)
    .select()
    .single();
    
  // 记录交易历史
  if (!error) {
    await supabase.from('coin_transactions').insert({
      user_id: userId,
      amount,
      type: amount > 0 ? 'income' : 'expense',
      reason,
      balance: newCoins,
      created_at: new Date().toISOString()
    });
  }
  
  return { data, error };
}

export async function consumeCoins(userId: string, amount: number, reason: string) {
  return addCoins(userId, -amount, reason);
}

export default {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  updateUserProfile,
  checkVIPStatus,
  getVIPDiscount,
  addCoins,
  consumeCoins
};