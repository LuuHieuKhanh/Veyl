'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Home, ShieldCheck } from 'lucide-react';

export default function ClosedPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden font-body-md text-on-surface">
      {/* Background Ambience */}
      <div className="ambient-bg" />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-center items-center px-lg py-md bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="relative w-28 h-8 cursor-pointer flex items-center" onClick={() => router.push('/home')}>
          <img
            src="/banner-removebg-preview.png"
            alt="Veyl Logo"
            className="w-full h-full object-contain animate-fade-in"
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow shrink-0 w-full pt-[90px] pb-md px-lg relative z-10 flex flex-col items-center justify-center">
        
        <div className="mx-auto" style={{ width: '420px', maxWidth: '90%' }}>
          {/* Closed panel */}
          <div className="w-full glass-panel p-xl border-glow relative z-10 flex flex-col gap-lg items-center text-center rounded-[24px]">
            
            <div className="h-16 w-16 rounded-2xl bg-zinc-950/40 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              <ShieldCheck size={32} className="text-teal-400" />
            </div>

            <div className="flex flex-col gap-sm">
              <h2 className="text-2xl font-black text-zinc-200 tracking-tight">Phòng Chat Đã Kết Thúc</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Trò chuyện đã đóng bởi chủ phòng. Toàn bộ tin nhắn và thông tin thành viên liên quan đến cuộc hội thoại này đã bị xóa sạch hoàn toàn khỏi cơ sở dữ liệu Veyl.
              </p>
            </div>

            <div className="w-full border-t border-zinc-900/60 my-sm" />

            {/* Action button */}
            <button
              onClick={() => router.push('/home')}
              className="btn-primary w-full h-14 text-white font-bold rounded-[20px] cursor-pointer flex items-center justify-center gap-2"
            >
              <Home size={16} />
              <span>Quay về trang chủ</span>
            </button>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full py-md px-lg flex flex-col md:flex-row justify-between items-center gap-md border-t border-outline-variant/20 bg-surface-container-lowest z-10">
        <div className="relative w-28 h-8 cursor-pointer flex items-center" onClick={() => router.push('/home')}>
          <img
            src="/banner-removebg-preview.png"
            alt="Veyl Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="font-body-md text-body-md text-on-surface-variant text-center">
          &copy; {new Date().getFullYear()} Veyl. Ephemeral &amp; Anonymous.
        </div>
        <div className="flex gap-md">
          <span className="font-label-sm text-label-sm text-on-surface-variant/50">v1.0.4</span>
        </div>
      </footer>
    </div>
  );
}
