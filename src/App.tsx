/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  History, 
  FileText, 
  Image as ImageIcon, 
  Copy, 
  X, 
  Upload, 
  CheckCircle2,
  Menu,
  Mail,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface HistoryItem {
  id: number;
  name: string;
  mode: 'TEXT' | 'IMAGE';
  content: string;
  date: string;
}

export default function App() {
  // State
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; platforms: string[] } | null>(null);
  const [signInData, setSignInData] = useState({ name: '', platforms: [] as string[] });
  const [currentMode, setCurrentMode] = useState<'text' | 'image'>('text');
  const [prodName, setProdName] = useState('');
  const [prodFeatures, setProdFeatures] = useState('');
  const [prodKeywords, setProdKeywords] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showToast, setShowToast] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Gemini
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // Load history and profile from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('ai_prod_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    const savedProfile = localStorage.getItem('ai_prod_user');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('ai_prod_history', JSON.stringify(history));
  }, [history]);

  // Save profile to localStorage
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('ai_prod_user', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  const handleRestrictedAction = (action: () => void) => {
    if (!userProfile) {
      setIsSignInModalOpen(true);
    } else {
      action();
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInData.name) {
      alert("Vui lòng nhập họ và tên!");
      return;
    }
    if (signInData.platforms.length === 0) {
      alert("Vui lòng chọn ít nhất một nền tảng bán hàng!");
      return;
    }
    setUserProfile(signInData);
    setIsSignInModalOpen(false);
  };

  const togglePlatform = (platform: string) => {
    setSignInData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateDescription = async () => {
    if (currentMode === 'text' && !prodName) {
      alert("Vui lòng nhập tên sản phẩm!");
      return;
    }
    if (currentMode === 'image' && !selectedImage) {
      alert("Vui lòng tải ảnh sản phẩm lên!");
      return;
    }

    setIsGenerating(true);
    setResultText("AI đang xây dựng mô tả chuyên nghiệp tích hợp từ khóa...");

    try {
      let contents: any;

      if (currentMode === 'text') {
        const prompt = `Hãy viết một mô tả sản phẩm chuyên nghiệp, thu hút và tối ưu SEO (bằng tiếng Việt) cho sản phẩm sau:
        Tên sản phẩm: ${prodName}
        Tính năng chính: ${prodFeatures}
        Từ khóa SEO: ${prodKeywords}
        
        Yêu cầu:
        1. Tiêu đề hấp dẫn.
        2. Đoạn giới thiệu khơi gợi nhu cầu.
        3. Danh sách các lợi ích nổi bật.
        4. Tích hợp các từ khóa SEO một cách tự nhiên.
        5. Lời kêu gọi hành động (CTA) mạnh mẽ.`;
        contents = prompt;
      } else {
        const base64Data = selectedImage?.split(',')[1];
        const mimeType = selectedImage?.split(';')[0].split(':')[1];
        
        const prompt = `Phân tích hình ảnh sản phẩm này và viết một mô tả sản phẩm chuyên nghiệp, thu hút và tối ưu SEO (bằng tiếng Việt).
        Gợi ý các tính năng nổi bật dựa trên hình ảnh và đề xuất các từ khóa SEO phù hợp.
        
        Yêu cầu:
        1. Mô tả chi tiết thiết kế và cảm nhận về sản phẩm.
        2. Đề xuất các từ khóa SEO tiềm năng.
        3. Viết nội dung bán hàng tăng tỷ lệ chuyển đổi.`;
        
        contents = {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            { text: prompt }
          ]
        };
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
      });

      const text = response.text;
      if (!text) throw new Error("No text generated");

      setResultText(text);
      
      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        name: prodName || "Sản phẩm từ ảnh",
        mode: currentMode === 'text' ? 'TEXT' : 'IMAGE',
        content: text,
        date: new Date().toLocaleString('vi-VN')
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);
    } catch (error) {
      console.error("Error generating content:", error);
      setResultText("Đã có lỗi xảy ra trong quá trình tạo nội dung. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  };

  return (
    <div className="bg-space min-h-screen text-white overflow-x-hidden relative font-['Inter']">
      {/* Background Glows */}
      <div className="glow top-[-10%] left-[-10%]"></div>
      <div className="glow bottom-[-10%] right-[-10%] bg-purple-600/20"></div>

      {/* Header / Navbar */}
      <nav className="fixed top-0 left-0 w-full z-[110] flex justify-between items-center px-6 md:px-10 py-6 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-8">
          <div className="w-10 h-6 bg-red-600 rounded-sm flex items-center justify-center text-[8px] font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <Star size={12} fill="white" />
          </div>
          <div className="hidden md:flex gap-6 text-sm">
            <a href="#" className="text-white border-b-2 border-purple-500 pb-1 font-black">Trang chủ</a>
            <button onClick={() => handleRestrictedAction(() => setIsArticleModalOpen(true))} className="text-white hover:text-purple-400 transition-colors font-black">Bài viết</button>
            <button onClick={() => handleRestrictedAction(() => setIsHistoryModalOpen(true))} className="text-white hover:text-purple-400 transition-colors font-black">Lịch sử</button>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {userProfile ? (
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-black text-xs">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Chào mừng,</p>
                <p className="text-xs font-bold">{userProfile.name}</p>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsSignInModalOpen(true)} className="px-5 py-2 text-sm font-bold hover:text-purple-400">Sign up</button>
          )}
          <button 
            onClick={() => setIsContactModalOpen(true)}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-full text-sm font-black transition shadow-lg shadow-purple-500/30"
          >
            Contact us
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 px-6 md:px-10 pt-32 pb-32">
        <div className="flex flex-col justify-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl text-heavy leading-tight mb-6"
          >
            <span className="whitespace-nowrap">Tạo Mô Tả Sản Phẩm</span><br />
            <span className="text-2xl md:text-3xl lg:text-4xl text-purple-400 italic">Chuyên Nghiệp & Chuẩn SEO</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-300 text-lg font-bold mb-8 max-w-md opacity-80 leading-relaxed"
          >
            Giải pháp AI đột phá giúp tạo nội dung bán hàng thu hút, tích hợp từ khóa SEO giúp sản phẩm của bạn luôn đứng đầu.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4"
          >
            <button 
              onClick={() => handleRestrictedAction(() => setIsArticleModalOpen(true))} 
              className="px-12 py-5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl font-black text-lg hover:scale-105 transition transform shadow-xl shadow-purple-500/40 uppercase tracking-wide"
            >
              Bắt đầu ngay
            </button>
          </motion.div>
        </div>

        <div className="relative flex items-center justify-center">
          <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-20 w-full max-w-md aspect-video glass rounded-3xl border-2 border-purple-500/30 p-4 shadow-2xl"
          >
            <div className="flex gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 w-1/2 bg-purple-500/20 rounded-lg"></div>
              <div className="h-20 w-full bg-white/5 rounded-xl"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 bg-white/5 rounded-lg"></div>
                <div className="h-10 bg-white/5 rounded-lg"></div>
                <div className="h-10 bg-white/5 rounded-lg"></div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Contact Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl border border-white/10"
            >
              <button 
                onClick={() => setIsContactModalOpen(false)} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} strokeWidth={3} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                  <Mail className="text-purple-400" size={32} />
                </div>
                <h2 className="text-3xl font-black mb-2">Liên hệ</h2>
                <p className="text-gray-400 text-sm font-bold">Thông tin liên hệ nhanh</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-0.5">Email</p>
                    <p className="text-sm font-bold">htue282@mail.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-0.5">SĐT</p>
                    <p className="text-sm font-bold">0364501131</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-0.5">Địa chỉ</p>
                    <p className="text-sm font-bold">175 Tây sơn, Hà nội</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsContactModalOpen(false)}
                className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-white transition-all mt-8 uppercase tracking-widest text-xs"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sign In Modal */}
      <AnimatePresence>
        {isSignInModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl border border-white/10"
            >
              <button 
                onClick={() => setIsSignInModalOpen(false)} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} strokeWidth={3} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                  <Sparkles className="text-purple-400" size={32} />
                </div>
                <h2 className="text-3xl font-black mb-2">Đăng ký</h2>
                <p className="text-gray-400 text-sm font-bold">Bắt đầu hành trình tối ưu SEO cùng AI</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-purple-400 mb-2 ml-1 uppercase tracking-widest">Họ và tên</label>
                  <input 
                    type="text" 
                    required
                    value={signInData.name}
                    onChange={(e) => setSignInData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nhập tên của bạn..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500 transition text-white font-bold placeholder:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-purple-400 mb-3 ml-1 uppercase tracking-widest">Nền tảng bán hàng</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['Shopee', 'Tiktok', 'Facebook'].map(platform => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => togglePlatform(platform)}
                        className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all font-bold text-sm ${
                          signInData.platforms.includes(platform)
                            ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {platform}
                        {signInData.platforms.includes(platform) && <CheckCircle2 size={18} className="text-purple-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl font-black text-white shadow-xl hover:shadow-purple-500/40 transition-all active:scale-95 uppercase tracking-widest text-xs mt-4"
                >
                  Xác nhận đăng ký
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Article Modal */}
      <AnimatePresence>
        {isArticleModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pt-24 bg-black/75 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass w-full max-w-4xl rounded-[2rem] p-8 relative shadow-2xl overflow-hidden border border-white/10"
            >
              <button 
                onClick={() => setIsArticleModalOpen(false)} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-20"
              >
                <X size={32} strokeWidth={3} />
              </button>
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* Left Column: Input */}
                <div className="flex-1">
                  <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                    <span className="text-purple-400"><Sparkles size={24} /></span> Tạo mô tả chuyên nghiệp
                  </h2>

                  {/* Tab Switcher */}
                  <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/10">
                    <button 
                      onClick={() => setCurrentMode('text')} 
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border border-transparent uppercase tracking-widest flex items-center justify-center gap-2 ${currentMode === 'text' ? 'bg-purple-500/30 border-purple-500/60 text-white' : 'text-gray-400'}`}
                    >
                      <FileText size={14} /> Văn bản
                    </button>
                    <button 
                      onClick={() => setCurrentMode('image')} 
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border border-transparent uppercase tracking-widest flex items-center justify-center gap-2 ${currentMode === 'image' ? 'bg-purple-500/30 border-purple-500/60 text-white' : 'text-gray-400'}`}
                    >
                      <ImageIcon size={14} /> Hình ảnh
                    </button>
                  </div>

                  {/* Content: Text Mode */}
                  {currentMode === 'text' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-purple-400 mb-1 ml-1 uppercase tracking-widest">Tên sản phẩm</label>
                        <input 
                          type="text" 
                          value={prodName}
                          onChange={(e) => setProdName(e.target.value)}
                          placeholder="Ví dụ: Laptop Dell XPS 13" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-purple-400 mb-1 ml-1 uppercase tracking-widest">Tính năng chính</label>
                        <textarea 
                          rows={2} 
                          value={prodFeatures}
                          onChange={(e) => setProdFeatures(e.target.value)}
                          placeholder="Ví dụ: Chip M2, Màn hình 4K, Pin 10h..." 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition text-white font-bold resize-none custom-scroll"
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-purple-400 mb-1 ml-1 uppercase tracking-widest">Từ khóa SEO</label>
                        <input 
                          type="text" 
                          value={prodKeywords}
                          onChange={(e) => setProdKeywords(e.target.value)}
                          placeholder="Ví dụ: laptop văn phòng, dell giá rẻ..." 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition text-white font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Content: Image Mode */}
                  {currentMode === 'image' && (
                    <div className="space-y-4">
                      <div className="w-full h-40 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-purple-500 transition-colors bg-white/5">
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="image/*" 
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        />
                        {!selectedImage ? (
                          <div className="text-center">
                            <Upload className="mx-auto mb-2 text-purple-400" size={32} />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">TẢI ẢNH SẢN PHẨM</p>
                          </div>
                        ) : (
                          <>
                            <img src={selectedImage} className="absolute inset-0 w-full h-full object-cover z-0" alt="Preview" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); clearImage(); }} 
                              className="absolute top-2 right-2 z-20 bg-red-500/80 p-1 rounded-full text-white"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-center text-gray-400 font-bold italic uppercase tracking-wider">AI sẽ tự động phân tích và đề xuất SEO.</p>
                    </div>
                  )}
                  
                  <button 
                    onClick={generateDescription}
                    disabled={isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl font-black text-white shadow-lg hover:shadow-purple-500/40 transition-all active:scale-95 mt-6 uppercase tracking-wider text-xs disabled:opacity-50"
                  >
                    {isGenerating ? "ĐANG PHÂN TÍCH SEO..." : "Tạo mô tả ngay"}
                  </button>
                </div>

                {/* Right Column: Result */}
                <div className="flex-1 flex flex-col bg-black/10 rounded-[1.5rem] border border-white/5 min-h-[300px]">
                  {!resultText ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-30">
                      <div className="text-5xl mb-4"><FileText size={48} /></div>
                      <p className="font-black text-[10px] uppercase tracking-widest text-gray-300">Kết quả hiển thị tại đây</p>
                    </div>
                  ) : (
                    <div className={`flex-1 flex flex-col p-6 rounded-[1.5rem] relative ${isGenerating ? 'animate-pulse' : ''}`}>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] text-purple-300 font-black uppercase tracking-widest italic">Nội dung tối ưu SEO:</p>
                        <button 
                          onClick={() => copyToClipboard(resultText)} 
                          className="text-[9px] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition border border-white/10 font-black flex items-center gap-1.5 tracking-widest"
                        >
                          <Copy size={12} /> SAO CHÉP
                        </button>
                      </div>
                      <div className="text-sm text-gray-200 leading-relaxed font-bold overflow-y-auto custom-scroll max-h-[300px] pr-2 whitespace-pre-wrap">
                        {resultText}
                      </div>
                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/10">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">AI Engine Power</span>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className={`w-2 h-2 rounded-full bg-green-500 ${isGenerating ? 'animate-pulse' : ''}`}></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass w-full max-w-2xl rounded-[2rem] p-8 relative shadow-2xl border border-white/10"
            >
              <button 
                onClick={() => setIsHistoryModalOpen(false)} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <X size={32} strokeWidth={3} />
              </button>
              
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <span className="text-purple-400"><History size={24} /></span> Lịch sử mô tả
              </h2>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                {history.length === 0 ? (
                  <p className="text-center text-gray-500 py-10 font-black italic tracking-widest uppercase opacity-50">Chưa có dữ liệu lịch sử.</p>
                ) : (
                  history.map(item => (
                    <div key={item.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full mb-1 inline-block font-black tracking-widest uppercase">
                            {item.mode === 'TEXT' ? '📝 SEO CONTENT' : '🖼️ VISUAL SEO'}
                          </span>
                          <h4 className="text-white font-black uppercase text-sm tracking-wide">{item.name}</h4>
                          <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{item.date}</span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(item.content)} 
                          className="text-[9px] bg-purple-600/20 text-purple-300 px-3 py-1 rounded-lg border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all font-black tracking-widest"
                        >
                          COPY
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 font-bold italic group-hover:text-gray-200 transition-colors">
                        {item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-xl font-black shadow-2xl transition-opacity duration-300 z-[200] uppercase tracking-widest text-xs flex items-center gap-2 ${showToast ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <CheckCircle2 size={16} /> Đã sao chép thành công!
      </div>
    </div>
  );
}
