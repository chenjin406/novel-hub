'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Coin, 
  Crown, 
  BookOpen, 
  Clock, 
  Star,
  Settings,
  LogOut,
  Wallet,
  TrendingUp
} from '@mui/icons-material';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  coins: number;
  vip_level: number;
  vip_expire_at?: string;
  reading_time: number;
  books_read: number;
  chapters_read: number;
  bookshelf_count: number;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookshelf' | 'wallet' | 'settings'>('overview');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.error) {
        router.push('/login');
      } else {
        setUser(data.user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const getVIPLevelName = (level: number): string => {
    const levels = ['普通用户', '青铜VIP', '白银VIP', '黄金VIP'];
    return levels[level] || '普通用户';
  };

  const getVIPLevelColor = (level: number): string => {
    const colors = ['text-gray-600', 'text-amber-600', 'text-gray-400', 'text-yellow-500'];
    return colors[level] || 'text-gray-600';
  };

  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isVIP = user.vip_expire_at && new Date(user.vip_expire_at) > new Date();
  const vipDaysLeft = isVIP && user.vip_expire_at ? 
    Math.ceil((new Date(user.vip_expire_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
              📚 NovelHub
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧导航 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.username}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  isVIP ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  <Crown className="w-3 h-3" />
                  {getVIPLevelName(user.vip_level)}
                  {isVIP && <span>({vipDaysLeft}天)</span>}
                </div>
              </div>

              <nav className="space-y-2">
                {[
                  { id: 'overview', label: '个人中心', icon: User },
                  { id: 'bookshelf', label: '我的书架', icon: BookOpen },
                  { id: 'wallet', label: '我的钱包', icon: Wallet },
                  { id: 'settings', label: '账户设置', icon: Settings },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeTab === id
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="lg:col-span-3">
            {/* 概览页面 */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 用户统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Coin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">起点币余额</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.coins}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${isVIP ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <Crown className={`w-6 h-6 ${isVIP ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">会员状态</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {isVIP ? `${getVIPLevelName(user.vip_level)}` : '非会员'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">书架书籍</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.bookshelf_count}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">阅读时长</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatReadingTime(user.reading_time)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 阅读统计 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">阅读统计</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{user.books_read}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">已读本书</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">{user.chapters_read}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">已读章节</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatReadingTime(user.reading_time)}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">总阅读时长</div>
                    </div>
                  </div>
                </div>

                {/* VIP 升级提示 */}
                {!isVIP && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold mb-2">升级 VIP，享受更多特权</h3>
                        <p className="text-sm opacity-90">
                          解锁更多免费章节、获得专属折扣、享受无广告阅读体验
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('wallet')}
                        className="bg-white text-yellow-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                      >
                        立即升级
                      </button>
                    </div>
                  </div>
                )}

                {/* 最近阅读 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">最近阅读</h3>
                    <button
                      onClick={() => setActiveTab('bookshelf')}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 text-sm font-medium"
                    >
                      查看全部
                    </button>
                  </div>
                  <div className="space-y-3">
                    {/* 这里应该显示最近阅读的书籍，暂时显示占位数据 */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="w-12 h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">示例书籍</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">作者名称</p>
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                            <div className="bg-blue-600 h-1 rounded-full" style={{ width: '60%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 书架页面 */}
            {activeTab === 'bookshelf' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">我的书架</h3>
                  <div className="flex gap-2">
                    {['全部', '在读', '已完结', '暂停'].map((status) => (
                      <button
                        key={status}
                        className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 这里应该显示书架中的书籍 */}
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    书架空空如也，快去添加一些书籍吧！
                  </div>
                </div>
              </div>
            )}

            {/* 钱包页面 */}
            {activeTab === 'wallet' && (
              <div className="space-y-6">
                {/* 余额卡片 */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">起点币余额</p>
                      <p className="text-3xl font-bold">{user.coins}</p>
                    </div>
                    <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                      充值
                    </button>
                  </div>
                </div>

                {/* 充值套餐 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">充值套餐</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { coins: 1000, price: 10, bonus: 200, recommended: true },
                      { coins: 3000, price: 30, bonus: 500, hot: true },
                      { coins: 10000, price: 98, bonus: 2000 },
                    ].map((pkg, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:border-indigo-500 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {pkg.coins}起点币
                          </span>
                          {pkg.recommended && (
                            <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-1 rounded">
                              推荐
                            </span>
                          )}
                          {pkg.hot && (
                            <span className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs px-2 py-1 rounded">
                              热销
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          ¥{pkg.price}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          赠送{pkg.bonus}起点币
                        </div>
                        <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                          立即充值
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 设置页面 */}
            {activeTab === 'settings' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">账户设置</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      用户名
                    </label>
                    <input
                      type="text"
                      defaultValue={user.username}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">用户名不可修改</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      邮箱地址
                    </label>
                    <input
                      type="email"
                      defaultValue={user.email}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleLogout}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}