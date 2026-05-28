'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getClientSession } from '@/lib/session';
import { getRoomDetails, regenerateInviteCode, endRoom, extendInviteCode } from '@/app/actions';
import { Copy, Share2, RefreshCw, XCircle, ArrowRight, Clock, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InvitePageProps {
  params: Promise<{ id: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const { id: roomId } = use(params);

  const [session, setSession] = useState<{ nickname: string; sessionId: string } | null>(null);
  const [room, setRoom] = useState<any>(null);
  
  // Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // States
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Authenticate Client Session and fetch room details
  useEffect(() => {
    const activeSession = getClientSession();
    if (!activeSession) {
      router.push('/');
      return;
    }
    setSession(activeSession);

    async function fetchRoom() {
      try {
        const details = await getRoomDetails(roomId);
        if (!details) {
          setError('Không tìm thấy phòng chat này.');
          return;
        }
        
        // Safety: verify that this user is indeed the room host
        if (activeSession && details.host_session_id !== activeSession.sessionId) {
          // If not the host, redirect directly to the active chat room!
          router.push(`/room/${roomId}`);
          return;
        }

        setRoom(details);
        calculateTimeLeft(details.code_expire_at);
      } catch (err: any) {
        setError('Lỗi kết nối máy chủ.');
      }
    }
    fetchRoom();
  }, [roomId, router]);

  // 2. Timer Calculation
  const calculateTimeLeft = (expireTimeString: string) => {
    const difference = new Date(expireTimeString).getTime() - Date.now();
    if (difference <= 0) {
      setTimeLeft(0);
      setIsExpired(true);
    } else {
      setTimeLeft(Math.floor(difference / 1000));
      setIsExpired(false);
    }
  };

  // 3. Countdown Loop
  useEffect(() => {
    if (!room || timeLeft <= 0) {
      if (room && timeLeft === 0) {
        setIsExpired(true);
      }
      return;
    }

    const interval = setInterval(() => {
      calculateTimeLeft(room.code_expire_at);
    }, 1000);

    return () => clearInterval(interval);
  }, [room, timeLeft]);

  // Format Time (MM:SS)
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Action: Copy Code (automatically extends code lifetime by 5 minutes!)
  const handleCopyCode = async () => {
    if (!room || !session) return;
    try {
      await navigator.clipboard.writeText(room.invite_code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);

      // Silently extend invite code expiration in DB by 5 minutes!
      const res = await extendInviteCode(roomId, session.sessionId);
      setRoom((prev: any) => ({
        ...prev,
        code_expire_at: res.code_expire_at
      }));
      calculateTimeLeft(res.code_expire_at);
    } catch (err) {
      console.error('Copy/Extend failed:', err);
    }
  };

  // Action: Share Invite Text (automatically extends code lifetime by 5 minutes!)
  const handleShare = async () => {
    if (!room || !session) return;
    setIsSharing(true);
    const shareText = `Tham gia phòng chat ẩn danh Veyl với tôi nhé!\nMã phòng: ${room.invite_code}\nLink tham gia: ${window.location.origin}/home`;
    
    try {
      // Silently extend invite code expiration in DB by 5 minutes!
      const res = await extendInviteCode(roomId, session.sessionId);
      setRoom((prev: any) => ({
        ...prev,
        code_expire_at: res.code_expire_at
      }));
      calculateTimeLeft(res.code_expire_at);

      if (navigator.share) {
        await navigator.share({
          title: 'Veyl - Anonymous Chat',
          text: shareText,
          url: `${window.location.origin}/home`,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Đã gia hạn và copy tin nhắn mời tham gia vào bộ nhớ tạm!');
      }
    } catch (err) {
      console.error('Share/Extend failed:', err);
    } finally {
      setIsSharing(false);
    }
  };

  // Action: Regenerate Invite Code (Host Only)
  const handleRegenerateCode = async () => {
    if (!session || isRegenerating) return;
    setIsRegenerating(true);
    setError(null);

    try {
      const res = await regenerateInviteCode(roomId, session.sessionId);
      setRoom((prev: any) => ({
        ...prev,
        invite_code: res.invite_code,
        code_expire_at: res.code_expire_at
      }));
      calculateTimeLeft(res.code_expire_at);

      // Celebrate
      confetti({
        particleCount: 40,
        spread: 30,
        colors: ['#06B6D4', '#FFFFFF']
      });
    } catch (err: any) {
      setError(err.message || 'Không thể tạo mã mới');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Action: Terminate Chat Room (Host Only) - Trigger modal
  const handleEndRoom = () => {
    if (!session || isEnding) return;
    setShowExitConfirm(true);
  };

  // Perform the actual room closure when confirmed via custom modal
  const handleConfirmEndRoom = async () => {
    if (!session || isEnding) return;
    setIsEnding(true);
    setError(null);

    try {
      await endRoom(roomId, session.sessionId);
      setShowExitConfirm(false);
      router.push('/home');
    } catch (err: any) {
      setError(err.message || 'Không thể đóng phòng');
      setIsEnding(false);
      setShowExitConfirm(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#08090C] text-center px-4">
        <div className="ambient-bg" />
        <div className="glass-panel p-8 max-w-md border-red-500/20 text-center space-y-4">
          <ShieldAlert className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-zinc-200">Đã xảy ra lỗi</h2>
          <p className="text-zinc-400 text-sm">{error}</p>
          <button
            onClick={() => router.push('/home')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (!room || !session) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#08090C] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide">Đang tải mã phòng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden font-body-md text-on-surface">
      {/* Background Ambience */}
      <div className="ambient-bg" />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg py-md bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="relative w-28 h-8 cursor-pointer flex items-center" onClick={() => router.push('/home')}>
          <img
            src="/banner-removebg-preview.png"
            alt="Veyl Logo"
            className="w-full h-full object-contain animate-fade-in"
          />
        </div>
        <div className="flex items-center gap-2 pr-2">
          <span className="h-2 w-2 rounded-full bg-[#7C3AED] pulse-active"></span>
          <span className="text-xs text-[#ddb8ff] font-bold uppercase tracking-widest font-mono">Chủ phòng</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow shrink-0 w-full pt-[90px] pb-md px-lg relative z-10 flex flex-col items-center justify-center">
        
        {/* Double-Container Centering Combo */}
        <div className="w-full max-w-xl mx-auto" style={{ width: '100%', maxWidth: '576px' }}>
          {/* Waiting Card */}
          <div className="glass-card w-full p-xl rounded-[24px] flex flex-col items-center text-center gap-y-lg relative z-10 border-glow border" style={{ width: '100%' }}>
            
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#ddb8ff] font-bold">Mã tham gia phòng</span>
              <div 
                onClick={handleCopyCode}
                className={`text-5xl md:text-6xl font-black font-mono tracking-widest bg-gradient-to-r from-[#7C3AED] to-[#ddb8ff] bg-clip-text text-transparent cursor-pointer glow-primary select-all transition-all duration-300 active:scale-95 ${
                  isExpired ? 'opacity-35 line-through' : 'hover:scale-105'
                }`}
                title="Click để sao chép mã"
              >
                {room.invite_code}
              </div>
              
              {isExpired ? (
                <div className="flex items-center gap-1.5 justify-center text-xs font-semibold text-red-400 mt-2">
                  <ShieldAlert size={14} />
                  <span>Mã mời này đã hết hạn</span>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 font-semibold mt-1">
                  {isCopied ? (
                    <span className="text-teal-400 animate-fade-in font-bold">✓ Đã sao chép vào bộ nhớ tạm!</span>
                  ) : (
                    <span>Click vào mã số để sao chép nhanh</span>
                  )}
                </div>
              )}
            </div>

            {/* Countdown timer */}
            <div className="w-full max-w-[280px] bg-[#15151B] border border-zinc-900 rounded-2xl py-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                <Clock size={16} className="text-[#7C3AED]" />
                <span>Hiệu lực còn:</span>
              </div>
              <div className={`font-mono text-xl font-bold tracking-wider ${isExpired ? 'text-red-500' : 'text-[#ddb8ff]'}`}>
                {isExpired ? '00:00' : formatTime(timeLeft)}
              </div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={handleCopyCode}
                className="btn-secondary h-14 w-full rounded-[20px] text-[#e4e1ea] font-semibold text-body-md hover:border-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
              >
                <Copy size={16} className="text-[#ddb8ff]" />
                <span className="text-sm">Copy mã</span>
              </button>

              <button
                onClick={handleShare}
                disabled={isSharing}
                className="btn-secondary h-14 w-full rounded-[20px] text-[#e4e1ea] font-semibold text-body-md hover:border-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Share2 size={16} className="text-[#ddb8ff]" />
                <span className="text-sm">Chia sẻ mã</span>
              </button>
            </div>

            <div className="w-full border-t border-zinc-900/60 my-2" />

            {/* Primary Operations */}
            <div className="flex flex-col gap-3 w-full">
              
              {/* Enter Room button */}
              <button
                onClick={() => router.push(`/room/${roomId}`)}
                className="w-full h-14 primary-btn-gradient rounded-[20px] text-white font-bold text-title-md hover:brightness-110 active:scale-[0.98] transition-all violet-glow flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Vào phòng chat chờ</span>
                <ArrowRight size={20} className="animate-pulse" />
              </button>

              {/* Support Actions */}
              <div className="flex justify-between items-center mt-2 w-full px-1">
                
                <button
                  onClick={handleRegenerateCode}
                  disabled={isRegenerating}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-[#ddb8ff] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                >
                  <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                  <span>Mã mới</span>
                </button>

                <button
                  onClick={handleEndRoom}
                  disabled={isEnding}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-400 font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                >
                  <span>Kết thúc phòng</span>
                </button>
                
              </div>

            </div>

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

      {/* Custom Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md transition-all duration-300 animate-fade-in">
          <div className="glass-panel mx-4 p-lg border border-white/10 rounded-3xl bg-[#131319]/95 shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col gap-md text-center animate-scale-up" style={{ width: '420px', maxWidth: '90%' }}>
            
            <div className="space-y-2 mt-sm">
              <h3 className="font-title-lg text-title-lg text-red-500 font-extrabold uppercase tracking-wider">
                Kết thúc phòng chat
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant/80 leading-relaxed">
                Bạn là chủ phòng. Bạn có chắc chắn muốn KẾT THÚC phòng chat ẩn danh này? Toàn bộ thành viên sẽ bị ngắt kết nối và tất cả tin nhắn sẽ bị xoá vĩnh viễn.
              </p>
            </div>

            <div className="flex gap-md mt-lg">
              <button
                onClick={() => setShowExitConfirm(false)}
                disabled={isEnding}
                className="btn-secondary flex-1 h-12 rounded-[20px] font-semibold text-body-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Từ chối
              </button>
              <button
                onClick={handleConfirmEndRoom}
                disabled={isEnding}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 active:scale-[0.98] transition-all duration-200 text-white font-semibold rounded-[20px] flex-1 h-12 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.25)] border-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnding ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Đồng ý</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
