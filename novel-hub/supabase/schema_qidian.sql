-- 用户表扩展
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_expire_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reading_time INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS books_read INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chapters_read INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 书架表
CREATE TABLE IF NOT EXISTS bookshelf (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'reading' CHECK (status IN ('reading', 'completed', 'paused', 'dropped')),
  current_chapter INTEGER DEFAULT 1,
  reading_progress INTEGER DEFAULT 0 CHECK (reading_progress >= 0 AND reading_progress <= 100),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  package_id VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL, -- 金额（分）
  coins INTEGER NOT NULL, -- 获得的起点币
  bonus_coins INTEGER DEFAULT 0, -- 赠送的起点币
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 起点币交易记录表
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- 正数为收入，负数为支出
  type VARCHAR(10) CHECK (type IN ('income', 'expense')),
  reason TEXT NOT NULL,
  balance INTEGER NOT NULL, -- 交易后的余额
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 已解锁章节表
CREATE TABLE IF NOT EXISTS unlocked_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  price INTEGER NOT NULL, -- 解锁价格（起点币）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);

-- 消费记录表
CREATE TABLE IF NOT EXISTS expense_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- 消费金额（起点币）
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 书签表
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  position INTEGER DEFAULT 0, -- 位置百分比
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id, chapter_id)
);

-- 阅读历史表
CREATE TABLE IF NOT EXISTS reading_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  reading_progress INTEGER DEFAULT 0,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id, chapter_id)
);

-- VIP套餐配置表
CREATE TABLE IF NOT EXISTS vip_packages (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL,
  price INTEGER NOT NULL, -- 价格（分）
  duration_days INTEGER NOT NULL, -- 有效期（天）
  discount_rate DECIMAL(3,2) DEFAULT 0, -- 折扣率
  benefits TEXT[], -- 特权列表
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认VIP套餐
INSERT INTO vip_packages (id, name, level, price, duration_days, discount_rate, benefits) VALUES
('vip_bronze', '青铜VIP', 1, 1000, 30, 0.05, ARRAY['5%折扣', '每日签到奖励']),
('vip_silver', '白银VIP', 2, 3000, 30, 0.10, ARRAY['10%折扣', '每日签到奖励', '专属客服']),
('vip_gold', '黄金VIP', 3, 9800, 30, 0.20, ARRAY['20%折扣', '每日签到奖励', '专属客服', '优先阅读'])
ON CONFLICT (id) DO NOTHING;

-- 充值套餐配置表
CREATE TABLE IF NOT EXISTS recharge_packages (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  coins INTEGER NOT NULL,
  price INTEGER NOT NULL, -- 价格（分）
  bonus_coins INTEGER DEFAULT 0,
  is_recommended BOOLEAN DEFAULT false,
  is_hot BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认充值套餐
INSERT INTO recharge_packages (id, name, coins, price, bonus_coins, is_recommended, is_hot, sort_order) VALUES
('package_1', '新手专享', 1000, 1000, 200, true, false, 1),
('package_2', '月度会员', 3000, 3000, 500, false, true, 2),
('package_3', '季度会员', 10000, 9800, 2000, true, false, 3),
('package_4', '年度会员', 50000, 48800, 12000, false, false, 4),
('package_5', '至尊会员', 100000, 98800, 30000, false, true, 5)
ON CONFLICT (id) DO NOTHING;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_bookshelf_user_id ON bookshelf(user_id);
CREATE INDEX IF NOT EXISTS idx_bookshelf_book_id ON bookshelf(book_id);
CREATE INDEX IF NOT EXISTS idx_bookshelf_status ON bookshelf(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_chapters_user_id ON unlocked_chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_chapters_chapter_id ON unlocked_chapters(chapter_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_user_id ON expense_records(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_read_at ON reading_history(read_at DESC);

-- 创建更新时间的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookshelf_updated_at BEFORE UPDATE ON bookshelf
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();