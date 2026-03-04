import { supabase } from './supabase';
import { addCoins } from './auth';

// 充值套餐类型
export interface RechargePackage {
  id: string;
  name: string;
  coins: number; // 起点币数量
  price: number; // 价格（元）
  bonus_coins?: number; // 赠送的起点币
  is_recommended?: boolean; // 是否推荐
  is_hot?: boolean; // 是否热销
}

// 订单类型
export interface Order {
  id: string;
  user_id: string;
  package_id: string;
  amount: number; // 订单金额（分）
  coins: number; // 获得的起点币
  bonus_coins: number; // 赠送的起点币
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  payment_method?: string;
  transaction_id?: string;
  created_at: string;
  paid_at?: string;
}

// 消费记录类型
export interface ExpenseRecord {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  amount: number; // 消费的起点币
  reason: string;
  created_at: string;
}

// 充值套餐配置
export const RECHARGE_PACKAGES: RechargePackage[] = [
  {
    id: 'package_1',
    name: '新手专享',
    coins: 1000,
    price: 10,
    bonus_coins: 200,
    is_recommended: true
  },
  {
    id: 'package_2', 
    name: '月度会员',
    coins: 3000,
    price: 30,
    bonus_coins: 500,
    is_hot: true
  },
  {
    id: 'package_3',
    name: '季度会员', 
    coins: 10000,
    price: 98,
    bonus_coins: 2000,
    is_recommended: true
  },
  {
    id: 'package_4',
    name: '年度会员',
    coins: 50000,
    price: 488,
    bonus_coins: 12000
  },
  {
    id: 'package_5',
    name: '至尊会员',
    coins: 100000,
    price: 988,
    bonus_coins: 30000,
    is_hot: true
  }
];

// 获取充值套餐
export function getRechargePackages(): RechargePackage[] {
  return RECHARGE_PACKAGES;
}

// 创建充值订单
export async function createOrder(userId: string, packageId: string): Promise<{ data?: Order; error?: string }> {
  const packageInfo = RECHARGE_PACKAGES.find(p => p.id === packageId);
  
  if (!packageInfo) {
    return { error: '套餐不存在' };
  }
  
  const order: Omit<Order, 'id' | 'created_at'> = {
    user_id: userId,
    package_id: packageId,
    amount: packageInfo.price * 100, // 转换为分
    coins: packageInfo.coins,
    bonus_coins: packageInfo.bonus_coins || 0,
    status: 'pending'
  };
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...order,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
    
  return { data, error: error?.message };
}

// 处理支付成功
export async function processPaymentSuccess(orderId: string, transactionId: string, paymentMethod: string) {
  // 获取订单信息
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
    
  if (!order || order.status !== 'pending') {
    return { error: '订单不存在或状态异常' };
  }
  
  // 更新订单状态
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      transaction_id: transactionId,
      payment_method: paymentMethod,
      paid_at: new Date().toISOString()
    })
    .eq('id', orderId);
    
  if (updateError) {
    return { error: updateError.message };
  }
  
  // 给用户增加起点币
  const totalCoins = order.coins + order.bonus_coins;
  const { error: coinError } = await addCoins(
    order.user_id,
    totalCoins,
    `充值订单 #${orderId} - ${RECHARGE_PACKAGES.find(p => p.id === order.package_id)?.name}`
  );
  
  if (coinError) {
    return { error: typeof coinError === 'string' ? coinError : (coinError as any).message || '添加起点币失败' };
  }
  
  return { data: { success: true } };
}

// 章节付费解锁
export async function unlockChapter(userId: string, bookId: string, chapterId: string, price: number) {
  // 检查用户余额
  const { data: user } = await supabase
    .from('users')
    .select('coins')
    .eq('id', userId)
    .single();
    
  if (!user) {
    return { error: '用户不存在' };
  }
  
  if (user.coins < price) {
    return { error: '起点币余额不足' };
  }
  
  // 检查是否已经解锁
  const { data: existing } = await supabase
    .from('unlocked_chapters')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .single();
    
  if (existing) {
    return { error: '该章节已解锁' };
  }
  
  // 扣除起点币
  const { error: coinError } = await addCoins(
    userId,
    -price,
    `解锁章节 - 书籍ID: ${bookId}, 章节ID: ${chapterId}`
  );
  
  if (coinError) {
    return { error: typeof coinError === 'string' ? coinError : (coinError as any).message || '扣除起点币失败' };
  }
  
  // 记录解锁的章节
  const { error: unlockError } = await supabase
    .from('unlocked_chapters')
    .insert({
      user_id: userId,
      book_id: bookId,
      chapter_id: chapterId,
      price,
      created_at: new Date().toISOString()
    });
    
  if (unlockError) {
    return { error: unlockError.message };
  }
  
  // 记录消费记录
  const { error: expenseError } = await supabase
    .from('expense_records')
    .insert({
      user_id: userId,
      book_id: bookId,
      chapter_id: chapterId,
      amount: price,
      reason: '章节解锁',
      created_at: new Date().toISOString()
    });
    
  if (expenseError) {
    return { error: expenseError.message };
  }
  
  return { data: { success: true } };
}

// 检查章节是否已解锁
export async function isChapterUnlocked(userId: string, chapterId: string): Promise<boolean> {
  const { data } = await supabase
    .from('unlocked_chapters')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .single();
    
  return !!data;
}

// 获取用户的消费记录
export async function getExpenseRecords(userId: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('expense_records')
    .select(`
      *,
      book:books(id, title, author)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  return { data, error };
}

// 获取充值记录
export async function getRechargeRecords(userId: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(limit);
    
  return { data, error };
}

export default {
  getRechargePackages,
  createOrder,
  processPaymentSuccess,
  unlockChapter,
  isChapterUnlocked,
  getExpenseRecords,
  getRechargeRecords
};