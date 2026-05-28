'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientSession, saveClientSession, validateNickname } from '@/lib/session';
import { ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LandingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(true);

  // Simple countdown state for floating card simulation (matches code.html script)
  const [countdownText, setCountdownText] = useState('03:42:11');

  // Authenticate / Redirect Check
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isAbout = searchParams.get('about') === 'true';

    if (isAbout) {
      setIsRedirecting(false);
      return;
    }

    const session = getClientSession();
    if (session && session.nickname) {
      router.push('/home');
    } else {
      setIsRedirecting(false);
    }
  }, [router]);

  // Floating Card Countdown simulation
  useEffect(() => {
    let totalSeconds = 3 * 3600 + 42 * 60 + 11;
    const interval = setInterval(() => {
      totalSeconds--;
      if (totalSeconds <= 0) {
        clearInterval(interval);
        return;
      }
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setCountdownText(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Background subtle movement mapping (matches code.html script)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      document.body.style.backgroundPosition = `${x * 20}px ${y * 20}px`;
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNickname(val);
    
    if (val.trim().length > 0) {
      const validation = validateNickname(val);
      if (!validation.isValid) {
        setError(validation.error || 'Biệt danh không hợp lệ');
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  };

  const handleCreateAction = () => {
    const validation = validateNickname(nickname);
    if (!validation.isValid) {
      setError(validation.error || 'Vui lòng nhập biệt danh hợp lệ để tiếp tục');
      return;
    }
    saveClientSession(nickname);
    
    confetti({
      particleCount: 80,
      spread: 60,
      colors: ['#7C3AED', '#ddb8ff', '#FFFFFF']
    });

    localStorage.setItem('veyl_pending_intent', 'create');
    router.push('/home');
  };

  const handleJoinAction = () => {
    const validation = validateNickname(nickname);
    if (!validation.isValid) {
      setError(validation.error || 'Vui lòng nhập biệt danh hợp lệ để tiếp tục');
      return;
    }
    saveClientSession(nickname);
    
    localStorage.setItem('veyl_pending_intent', 'join');
    router.push('/home');
  };

  if (isRedirecting) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#131319] text-[#e4e1ea]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide">Syncing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden font-body-md text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* Carbon fiber overlay */}
      <div className="noise-overlay" />

      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-lg py-md bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="relative w-28 h-8 cursor-pointer flex items-center" onClick={() => router.push('/')}>
          <img
            src="/banner-removebg-preview.png"
            alt="Veyl Logo"
            className="w-full h-full object-contain animate-fade-in"
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow shrink-0 w-full relative pt-xl overflow-hidden flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="container max-w-container-max mx-auto px-lg main-spacing-fix pb-xl flex flex-col items-center text-center z-20">
          <div className="inline-flex items-center gap-sm px-md py-xs rounded-full glass mb-lg animate-pulse-slow select-none">
            <span className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#d2bbff]"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase">742 Active Rooms</span>
          </div>
          
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight max-w-[800px] leading-[1.1] mb-md select-none">
            Talk. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary glow-primary">Disappear.</span>
          </h1>
          
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[600px] mb-xl select-none">
            Anonymous temporary chat rooms. No accounts. No history. Just conversations.
          </p>

          {/* Input Form Box */}
          <div className="w-full max-w-[480px] space-y-md">
            <div className="relative group">
              <input 
                value={nickname}
                onChange={handleInputChange}
                maxLength={20}
                className={`w-full h-14 bg-surface-container-low border-2 rounded-[18px] px-lg text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all placeholder:text-on-surface-variant/50 text-center ${
                  error ? 'border-red-500/80 focus:border-red-500' : 'border-outline-variant/30'
                }`}
                placeholder="Enter your nickname" 
                type="text"
              />
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary select-none" data-icon="face">
                face
              </span>
            </div>

            {/* Validation Alarm */}
            {error && (
              <div className="flex items-center gap-1.5 justify-center text-red-400 text-xs font-semibold animate-pulse">
                <ShieldAlert size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-md">
              <button 
                onClick={handleCreateAction}
                disabled={!!error || nickname.trim().length < 3}
                className="flex-1 h-14 primary-btn-gradient rounded-[20px] text-on-primary font-title-md text-title-md hover:brightness-110 active:scale-[0.98] transition-all violet-glow flex items-center justify-center gap-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create Room
                <span className="material-symbols-outlined" data-icon="bolt">bolt</span>
              </button>

              <button 
                onClick={handleJoinAction}
                disabled={!!error || nickname.trim().length < 3}
                className="flex-1 h-14 glass border-outline-variant/50 rounded-[20px] text-on-surface font-title-md text-title-md hover:border-primary transition-all active:scale-[0.98] flex items-center justify-center gap-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Join Room
                <span className="material-symbols-outlined" data-icon="group">group</span>
              </button>
            </div>
          </div>
        </section>

        {/* Visual Hero: Floating Cards Grid */}
        <div className="relative w-full max-w-container-max h-[440px] mt-xl md:mt-0 pointer-events-none">
          {/* Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>
          
          {/* Floating Bubble 1 (Left Guest) */}
          <div className="absolute top-[10px] left-[5%] md:left-[15%] glass p-md rounded-[24px] max-w-[240px] floating-card" style={{ animationDelay: '0s' }}>
            <div className="flex items-center gap-sm mb-xs">
              <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden">
                <img alt="avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxw0i-1Seecn2xqKdT2pJedRiIrsNg0X4hHNt7zV62ETUCJQhcheR2u2oE-v95FVX6lFUtH86_XDCpVLnwuxaLBU9-SXc_-6Y5ltr3iC21kgMYCLZh6nbizUoWfye-cej8_y9PlKfV0W2IijlE8PbpTt3-LOvTAyoIBeDofz9GJXcb4SdzrTx5YPU7NT1EDZSqt6Uwd8Z654JRidG4Swg-ltdFaoi3RF5jdVAIT3Zxu1d5kukTC32XMwXmHrePZIO8glEaAtoFVQ" />
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Guest#412</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface">"How does the encryption handle..."</p>
          </div>

          {/* Floating Bubble 2 (Right You) */}
          <div className="absolute top-[80px] right-[2%] md:right-[12%] primary-btn-gradient p-md rounded-[24px] max-w-[260px] floating-card shadow-2xl" style={{ animationDelay: '1.5s' }}>
            <div className="flex items-center gap-sm mb-xs">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <img alt="avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG-UqutwGTgytzqYscWvDlKm-fxZTjPO93tMXbeSsC2ZYXT7Ys-ocxlKT7k5-pJzdeoIwamfkf5tr1DuhUSJiaWGEecPlIpIJ83B_VoXyvpPrGkb-m1MKEqFgHX1vnXxrsAiVXhzbblsgiCdwtrp9DsWwidlyHv35S440csmEJ2n3VVG1jJy7GHSqGxxCDdLk-BP1uO14oUfSkyvagOi5cfXtBXeaATq6VEErpIfDnMHsVe0n7RSWUqvgtS3oI7WrGrgrsjovrCg" />
              </div>
              <span className="font-label-sm text-label-sm text-on-primary/70 font-semibold">You</span>
            </div>
            <p className="font-body-md text-body-md text-on-primary leading-relaxed">"It's end-to-end. Once the timer hits zero, everything is purged."</p>
          </div>

          {/* Room Info Card (Center Bottom) */}
          <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 glass p-lg rounded-[24px] w-[300px] violet-glow floating-card flex flex-col items-center gap-md" style={{ animationDelay: '3s' }}>
            <div className="flex flex-col items-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-xs">Self-destruct in</span>
              <div className="font-headline-lg text-headline-lg text-primary tabular-nums tracking-widest">{countdownText}</div>
            </div>
            <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-primary w-2/3 shadow-[0_0_10px_#d2bbff]"></div>
            </div>
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-surface glass overflow-hidden"><img alt="A" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFNOPRu_qHm0Y_VhMHTriQTqKk_cgJ-CvohmLij0KZj6mFCJBjbSCFhLqUKv1B77CbtUwaJgNZlvMhz4ZXV7T8dBx0buWGV1e41khi03AKG7qLcYT1-_JvgRp6cz0zDteAUEgnIfjapBXHp2H3_Tk3UZloSPzGiPARHM-BX0nylTnpRKCnuBPl3BohN7VnQiTchI7twswVxTw4OfyJaM775EtRoVHgYDN4kumYvM3__wlMblgpsOC-1n_dODf027Cxow8CNj4CzA" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-surface glass overflow-hidden"><img alt="B" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPmB3SBY5wcyllfsseVmgbjAvnanZ8z-MOJTq8b5OgCIKIZXon22lRtBsdJwRtiC62eIRyAKtj_wcPIyHJwnY1qNERAogbG9jPHAkUY3AS7LPdcn-sVfM5nUq2LLSrkQoc0hi5LJfI8F7bGRpSTnbj5L4tTfzBKpTPQC45c3xR9FYeMNgdKLolPN1WLZTfGujs_zr3fSo3dcQHmhOqBQGI0Yzm01vh4hkf9Q1WJV_UVA0SUyr5zzrrZeqs85KSeiaPWgXMl5rqYQ" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-surface glass overflow-hidden"><img alt="C" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuADW9THJXPJXE_MNgGQDC_Y1huKSv0ttnyqXVpDXHnOCuMZQ0CgWBAourrpH4x5a_GgU6C4HXN0EaIu2FzwObJ41UN77bT6SOYy7sT7exWHnK2UV-r9du2baw2H_Nk-2KpNf4VCjdYcPzJdBNbv72JZ_vJ8oIGWpnGQFCjVUj7aTar5ETMi8nNP4nyH9gdUKGuPpH3s0KUOEUUGin30XR7TrWpa0lNyEWRky_h-xO2uE_MY0yr3Csoy1mKLNqi77jddZjqBK98CZw" /></div>
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm text-label-sm border-2 border-surface font-bold select-none">+12</div>
            </div>
          </div>
        </div>

        {/* Features Bento Grid */}
        <section className="container max-w-container-max mx-auto px-lg py-[80px] grid grid-cols-1 md:grid-cols-3 gap-lg z-20">
          <div className="glass p-xl rounded-[24px] flex flex-col gap-md group hover:border-primary/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform select-none">
              <span className="material-symbols-outlined text-[32px]" data-icon="encrypted">encrypted</span>
            </div>
            <h3 className="font-title-md text-title-md text-on-surface">Anonymous</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">No account required. No IP logging. Your identity stays yours, always.</p>
          </div>
          
          <div className="glass p-xl rounded-[24px] flex flex-col gap-md group hover:border-primary/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform select-none">
              <span className="material-symbols-outlined text-[32px]" data-icon="bolt">bolt</span>
            </div>
            <h3 className="font-title-md text-title-md text-on-surface">Realtime</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Instant, low-latency communication. Experience chat without the lag of traditional apps.</p>
          </div>

          <div className="glass p-xl rounded-[24px] flex flex-col gap-md group hover:border-primary/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform select-none">
              <span className="material-symbols-outlined text-[32px]" data-icon="timer_off">timer_off</span>
            </div>
            <h3 className="font-title-md text-title-md text-on-surface">Self Destruct</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Rooms automatically disappear after inactivity or time-limit. Zero digital footprint.</p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-md px-lg flex flex-col md:flex-row justify-between items-center gap-md bg-surface-container-lowest dark:bg-surface-container-lowest border-t border-outline-variant/20">
        <div className="flex flex-col items-center md:items-start gap-xs">
          <div className="relative w-28 h-8 cursor-pointer flex items-center" onClick={() => router.push('/')}>
            <img
              src="/banner-removebg-preview.png"
              alt="Veyl Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">&copy; 2024 Veyl. Ephemeral &amp; Anonymous.</p>
        </div>
        <div className="flex gap-lg">
          <span className="font-label-sm text-label-sm text-on-surface-variant/50">v1.0.4</span>
        </div>
      </footer>
    </div>
  );
}
