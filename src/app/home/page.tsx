'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientSession, saveClientSession, validateNickname, clearClientSession } from '@/lib/session';
import { createRoom, joinRoomByCode } from '@/app/actions';
import { ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<{ nickname: string; sessionId: string } | null>(null);
  
  // Nickname Editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // Joining Room
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Brute Force Lockout
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // Load Session & Auto-Intent execution
  useEffect(() => {
    const activeSession = getClientSession();
    if (!activeSession) {
      router.push('/');
      return;
    }
    setSession(activeSession);
    setNewName(activeSession.nickname);

    // Brute force check
    const lockoutUntil = localStorage.getItem('veyl_lockout_until');
    if (lockoutUntil) {
      const remaining = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTimeLeft(remaining);
      } else {
        localStorage.removeItem('veyl_lockout_until');
        localStorage.removeItem('veyl_failed_attempts');
      }
    }

    // Auto-intent checks from Landing Page
    const pendingIntent = localStorage.getItem('veyl_pending_intent');
    if (pendingIntent === 'create') {
      localStorage.removeItem('veyl_pending_intent');
      handleCreateRoom(activeSession.sessionId, activeSession.nickname);
    } else if (pendingIntent === 'join') {
      localStorage.removeItem('veyl_pending_intent');
      const inputEl = document.getElementById('join-code-input-box');
      inputEl?.focus();
    }
  }, [router]);

  // Lockout Countdown Timer
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('veyl_lockout_until');
          localStorage.removeItem('veyl_failed_attempts');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  // Format Lockout time
  const formatLockoutTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewName(val);
    const validation = validateNickname(val);
    if (!validation.isValid) {
      setNameError(validation.error || 'Tên không hợp lệ');
    } else {
      setNameError(null);
    }
  };

  const handleSaveName = () => {
    const validation = validateNickname(newName);
    if (!validation.isValid) {
      setNameError(validation.error || 'Tên không hợp lệ');
      return;
    }
    const updated = saveClientSession(newName, session?.sessionId);
    setSession(updated);
    setIsEditingName(false);
  };

  const handleLogout = () => {
    clearClientSession();
    router.push('/');
  };

  // Create Room Trigger
  const handleCreateRoom = async (sId?: string, nick?: string) => {
    const activeSessionId = sId || session?.sessionId;
    const activeNickname = nick || session?.nickname;
    if (!activeSessionId || !activeNickname) return;

    setIsCreating(true);
    try {
      const room = await createRoom(activeSessionId, activeNickname);
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#7C3AED', '#ddb8ff', '#FFFFFF']
      });

      router.push(`/room/${room.id}/invite`);
    } catch (err: any) {
      setJoinError(err.message || 'Lỗi tạo phòng chat');
      setIsCreating(false);
    }
  };

  // Join Room Trigger
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || lockoutTimeLeft > 0) return;

    const trimmedCode = inviteCode.trim();
    if (trimmedCode.length !== 6 || !/^\d+$/.test(trimmedCode)) {
      setJoinError('Vui lòng nhập chính xác mã 6 chữ số');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await joinRoomByCode(trimmedCode, session.sessionId, session.nickname);
      
      localStorage.removeItem('veyl_failed_attempts');
      localStorage.removeItem('veyl_lockout_until');

      confetti({
        particleCount: 60,
        spread: 40,
        colors: ['#7C3AED', '#ddb8ff']
      });

      router.push(`/room/${res.roomId}`);
    } catch (err: any) {
      const attempts = parseInt(localStorage.getItem('veyl_failed_attempts') || '0') + 1;
      localStorage.setItem('veyl_failed_attempts', attempts.toString());
      
      if (attempts >= 5) {
        const lockDuration = 5 * 60 * 1000;
        const lockoutUntil = Date.now() + lockDuration;
        localStorage.setItem('veyl_lockout_until', lockoutUntil.toString());
        setLockoutTimeLeft(5 * 60);
        setJoinError('Nhập sai quá 5 lần. Tính năng nhập mã đã bị khóa trong 5 phút để bảo mật.');
      } else {
        setJoinError(`${err.message} (Còn ${5 - attempts} lần thử)`);
      }
      setIsJoining(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden font-body-md text-on-surface">
      {/* Decorative Aura Blurs */}
      <div className="aura top-[-100px] left-[-100px]"></div>
      <div className="aura bottom-[-100px] right-[-100px]" style={{ animationDelay: '-10s' }}></div>

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg py-md bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="relative w-28 h-8 cursor-pointer flex items-center" onClick={() => router.push('/home')}>
          <img
            src="/banner-removebg-preview.png"
            alt="Veyl Logo"
            className="w-full h-full object-contain animate-fade-in"
          />
        </div>
        <nav className="flex items-center gap-xl">
          <a 
            onClick={() => router.push('/?about=true')}
            className="text-on-surface-variant hover:text-primary transition-colors duration-200 font-body-md text-body-md cursor-pointer"
          >
            About
          </a>
        </nav>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-grow shrink-0 main-spacing-fix pb-xl px-lg flex flex-col items-center gap-y-xl justify-start w-full">
        
        {/* Active Nickname Widget */}
        <div className="text-center mb-xl w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col items-center gap-sm">
            <label className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-xs select-none">Your Nickname</label>
            
            {isEditingName ? (
              <div className="relative group w-full flex flex-col items-center gap-md animate-in fade-in duration-200">
                <div className="relative w-full">
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={handleNameChange} 
                    maxLength={20}
                    autoFocus
                    className={`w-full bg-surface-container-low border-2 rounded-xl py-md px-lg text-center font-headline-lg text-on-surface transition-all focus:border-primary focus:outline-none ${
                      nameError ? 'border-red-500' : 'border-outline-variant/30'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary text-sm select-none">✏️</span>
                </div>
                
                <div className="flex gap-md justify-center w-full">
                  <button 
                    onClick={handleSaveName}
                    disabled={!!nameError || newName.trim().length < 3}
                    className="btn-primary px-lg py-sm text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Lưu</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingName(false);
                      setNewName(session.nickname);
                      setNameError(null);
                    }}
                    className="btn-secondary px-lg py-sm text-sm cursor-pointer"
                  >
                    <span>Huỷ</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative group w-full">
                <input 
                  onClick={() => setIsEditingName(true)}
                  readOnly
                  className="w-full bg-surface-container-low border-2 border-outline-variant/30 rounded-xl py-md px-lg text-center font-headline-lg text-on-surface hover:border-primary transition-all cursor-pointer" 
                  value={session.nickname} 
                  placeholder="ShadowFox"
                  type="text"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm opacity-50 group-hover:opacity-100 transition select-none">✏️</span>
              </div>
            )}
            
            {nameError && (
              <div className="text-red-400 text-xs font-semibold animate-pulse mt-1">{nameError}</div>
            )}

            <p className="mt-md font-body-md text-body-md text-on-surface-variant select-none">
              This identity is temporary and will vanish with your session.
            </p>
          </div>
        </div>

        {/* Action Cards Container */}
        <div className="flex flex-col md:flex-row gap-lg w-full max-w-[900px] justify-center items-stretch">
          
          {/* CREATE ROOM CARD */}
          <div className="glass-card flex-1 p-xl rounded-[24px] flex flex-col items-center text-center gap-md group">
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mb-sm group-hover:scale-110 transition-transform select-none">
              <span className="material-symbols-outlined text-primary text-[32px]">add_circle</span>
            </div>
            
            <h2 className="font-headline-lg text-headline-lg text-on-surface select-none">Create Room</h2>
            <p className="font-body-md text-body-md text-on-surface-variant flex-grow select-none">
              Generate a new temporary space. Perfect for instant, secure synchronization with anyone.
            </p>

            <button 
              onClick={() => handleCreateRoom()}
              disabled={isCreating || isJoining}
              className="primary-gradient w-full py-md rounded-[20px] text-white font-bold font-title-md text-title-md active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              {isCreating ? 'Creating Space...' : 'Start New Room'}
            </button>
          </div>

          {/* JOIN ROOM CARD */}
          <div className="glass-card flex-1 p-xl rounded-[24px] flex flex-col items-center text-center gap-md group">
            <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center mb-sm group-hover:scale-110 transition-transform select-none">
              <span className="material-symbols-outlined text-secondary text-[32px]">key</span>
            </div>

            <h2 className="font-headline-lg text-headline-lg text-on-surface select-none">Join Room</h2>
            <p className="font-body-md text-body-md text-on-surface-variant select-none">
              Enter a unique room code to access an existing ephemeral channel.
            </p>

            <div className="w-full mt-auto space-y-md">
              <form onSubmit={handleJoinRoom} className="w-full space-y-3">
                <input 
                  id="join-code-input-box"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  disabled={lockoutTimeLeft > 0 || isJoining || isCreating}
                  className="w-full bg-[#15151B] border-none focus:ring-1 focus:ring-primary rounded-[18px] py-md px-lg text-center font-title-md text-on-surface placeholder:text-outline/50 transition-all font-mono tracking-wider" 
                  placeholder="Room Code (e.g. 483921)" 
                  type="text"
                />
                
                {joinError && (
                  <div className="flex items-center gap-1.5 text-red-400 text-xs mt-1 animate-pulse justify-center">
                    <ShieldAlert size={14} className="flex-shrink-0" />
                    <span className="text-center font-semibold">{joinError}</span>
                  </div>
                )}

                {lockoutTimeLeft > 0 ? (
                  <div className="w-full bg-red-950/30 border border-red-900/40 text-red-400 font-bold py-3 rounded-[20px] text-center text-sm font-mono">
                    Locked for {formatLockoutTime(lockoutTimeLeft)}
                  </div>
                ) : (
                  <button 
                    type="submit"
                    disabled={inviteCode.length !== 6 || isJoining || isCreating}
                    className="w-full py-md rounded-[20px] border-[1.5px] border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary font-bold font-title-md text-title-md active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {isJoining ? 'Joining...' : 'Join Room'}
                  </button>
                )}
              </form>
            </div>
          </div>

        </div>

        {/* 3-COLUMN STAT PANELS */}
        <div className="w-full max-w-[900px] mt-xl mb-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 select-none">
          <div className="flex flex-wrap justify-center gap-md">
            
            <div className="glass-card px-lg py-md rounded-xl flex items-center gap-md">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">timer</span>
              </div>
              <div>
                <p className="text-primary font-bold text-title-md">42</p>
                <p className="text-on-surface-variant text-label-sm">Rooms self-destructing soon</p>
              </div>
            </div>

            <div className="glass-card px-lg py-md rounded-xl flex items-center gap-md">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">group</span>
              </div>
              <div>
                <p className="text-primary font-bold text-title-md">1,284</p>
                <p className="text-on-surface-variant text-label-sm">Anonymous users online</p>
              </div>
            </div>

            <div className="glass-card px-lg py-md rounded-xl flex items-center gap-md">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">auto_delete</span>
              </div>
              <div>
                <p className="text-primary font-bold text-title-md">15.4k</p>
                <p className="text-on-surface-variant text-label-sm">Messages purged (1h)</p>
              </div>
            </div>

          </div>
        </div>

        {/* Bento/Benefit Columns */}
        <div className="w-full max-w-[900px] mb-xl select-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
            
            <div className="text-center space-y-sm">
              <span className="material-symbols-outlined text-primary/60 text-[32px] font-light">chat_bubble</span>
              <h3 className="text-on-surface font-semibold">Talk Freely</h3>
              <p className="text-on-surface-variant text-body-md">Encrypted, anonymous channels for instant connection.</p>
            </div>

            <div className="text-center space-y-sm">
              <span className="material-symbols-outlined text-primary/60 text-[32px] font-light">visibility_off</span>
              <h3 className="text-on-surface font-semibold">Stay Ghost</h3>
              <p className="text-on-surface-variant text-body-md">No logs, no trackers, no digital footprint left behind.</p>
            </div>

            <div className="text-center space-y-sm">
              <span className="material-symbols-outlined text-primary/60 text-[32px] font-light">history_toggle_off</span>
              <h3 className="text-on-surface font-semibold">Disappear</h3>
              <p className="text-on-surface-variant text-body-md">Everything vanishes permanently when the room ends.</p>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full py-md px-lg flex flex-col md:flex-row justify-between items-center gap-md border-t border-outline-variant/20 bg-surface-container-lowest">
        <div className="relative w-28 h-8 cursor-pointer flex items-center" onClick={() => router.push('/home')}>
          <img
            src="/banner-removebg-preview.png"
            alt="Veyl Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="font-body-md text-body-md text-on-surface-variant text-center">
          &copy; 2024 Veyl. Ephemeral &amp; Anonymous.
        </div>
        <div className="flex gap-md">
          <span className="font-label-sm text-label-sm text-on-surface-variant/50">v1.0.4</span>
        </div>
      </footer>

      {/* Background decoration glows */}
      <div className="aura top-[20%] right-[10%] opacity-30" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(147, 51, 234, 0.08) 0%, rgba(147, 51, 234, 0) 70%)', animationDelay: '-5s' }}></div>
      <div className="aura bottom-[15%] left-[5%] opacity-20" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0) 70%)', animationDelay: '-15s' }}></div>
    </div>
  );
}
