'use client';

import { useState, useEffect, useRef } from 'react';

// 简化的图标组件
const ChevronLeftIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const MoonIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>;
const SunIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-6 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>;
const BookmarkIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>;

interface ChapterReaderProps {
  bookId: string;
  chapterId: string;
  chapter: {
    id: string;
    title: string;
    content: string;
    chapter_number: number;
  };
  prevChapter?: string;
  nextChapter?: string;
  onChapterChange: (chapterId: string) => void;
  onProgressUpdate: (chapterNumber: number, progress: number) => void;
}

export default function ChapterReader({
  bookId,
  chapterId,
  chapter,
  prevChapter,
  nextChapter,
  onChapterChange,
  onProgressUpdate
}: ChapterReaderProps) {
  const [fontSize, setFontSize] = useState(16);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showBookmark, setShowBookmark] = useState(false);

  // 从 localStorage 读取用户设置
  useEffect(() => {
    const savedFontSize = localStorage.getItem('reader-font-size');
    const savedDarkMode = localStorage.getItem('reader-dark-mode');
    
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize));
    }
    
    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, []);

  // 保存用户设置
  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('reader-dark-mode', isDarkMode.toString());
  }, [isDarkMode]);

  // 监听滚动更新阅读进度
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const content = contentRef.current;
      const scrollTop = content.scrollTop;
      const scrollHeight = content.scrollHeight - content.clientHeight;
      const progress = Math.round((scrollTop / scrollHeight) * 100);
      
      setReadingProgress(progress);
      onProgressUpdate(chapter.chapter_number, progress);
    };

    const content = contentRef.current;
    if (content) {
      content.addEventListener('scroll', handleScroll);
      return () => content.removeEventListener('scroll', handleScroll);
    }
  }, [chapter.chapter_number, onProgressUpdate]);

  // 键盘导航
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          if (prevChapter) {
            onChapterChange(prevChapter);
          }
          break;
        case 'ArrowRight':
          if (nextChapter) {
            onChapterChange(nextChapter);
          }
          break;
        case 'Escape':
          setShowSettings(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [prevChapter, nextChapter, onChapterChange, showSettings]);

  // 格式化章节内容，添加段落间距
  const formatContent = (content: string) => {
    return content
      .split('\n')
      .filter(paragraph => paragraph.trim().length > 0)
      .map(paragraph => `<p class="mb-4 leading-relaxed">　　${paragraph.trim()}</p>`)
      .join('');
  };

  // 添加书签
  const addBookmark = async () => {
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId,
          chapterId,
          chapterNumber: chapter.chapter_number,
          position: readingProgress
        }),
      });

      if (response.ok) {
        setShowBookmark(true);
        setTimeout(() => setShowBookmark(false), 2000);
      }
    } catch (error) {
      console.error('添加书签失败:', error);
    }
  };

  // 字体大小调节
  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(24, fontSize + delta));
    setFontSize(newSize);
  };

  return (
    <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* 顶部工具栏 */}
      <div className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-sm`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeftIcon />
          </button>
          <h1 className="text-lg font-semibold truncate">{chapter.title}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={addBookmark}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative"
          >
            <BookmarkIcon />
            {showBookmark && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className={`absolute top-16 right-4 z-20 p-4 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-64`}>
          <div className="space-y-4">
            {/* 字体大小 */}
            <div>
              <label className="block text-sm font-medium mb-2">字体大小</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustFontSize(-2)}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  A-
                </button>
                <span className="flex-1 text-center">{fontSize}px</span>
                <button
                  onClick={() => adjustFontSize(2)}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  A+
                </button>
              </div>
            </div>

            {/* 夜间模式 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">夜间模式</span>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                {isDarkMode ? <MoonIcon /> : <SunIcon />}
              </button>
            </div>

            {/* 阅读进度 */}
            <div>
              <label className="block text-sm font-medium mb-2">阅读进度</label>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                {readingProgress}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 章节内容 */}
      <div 
        ref={contentRef}
        className={`absolute top-16 bottom-16 left-0 right-0 overflow-y-auto px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">{chapter.title}</h2>
          <div 
            dangerouslySetInnerHTML={{ 
              __html: formatContent(chapter.content) 
            }}
          />
        </div>
      </div>

      {/* 底部导航 */}
      <div className={`absolute bottom-0 left-0 right-0 flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-t`}>
        <button
          onClick={() => prevChapter && onChapterChange(prevChapter)}
          disabled={!prevChapter}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            prevChapter 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ChevronLeftIcon />
          上一章
        </button>
        
        <div className="text-sm text-gray-500">
          第 {chapter.chapter_number} 章
        </div>
        
        <button
          onClick={() => nextChapter && onChapterChange(nextChapter)}
          disabled={!nextChapter}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            nextChapter 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          下一章
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}