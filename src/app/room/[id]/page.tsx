'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getClientSession } from '@/lib/session';
import { 
  getRoomDetails, 
  getRoomMessages, 
  getRoomMembers, 
  sendMessage, 
  endRoom, 
  leaveRoom,
  regenerateInviteCode,
  extendInviteCodeByMember
} from '@/app/actions';
import { ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChatRoomProps {
  params: Promise<{ id: string }>;
}

export default function ChatRoomPage({ params }: ChatRoomProps) {
  const router = useRouter();
  const { id: roomId } = use(params);

  const [session, setSession] = useState<{ nickname: string; sessionId: string } | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);

  // Lists
  const [messages, setMessages] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  // Input & Limits
  const [inputMessage, setInputMessage] = useState('');
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [sendTimestamps, setSendTimestamps] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Room self-destruct countdown (5 hours limit)
  const [roomTimeLeft, setRoomTimeLeft] = useState<number>(0);
  const [isRoomExpired, setIsRoomExpired] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Authentication & Data Hydration
  useEffect(() => {
    const activeSession = getClientSession();
    if (!activeSession) {
      router.push('/');
      return;
    }
    setSession(activeSession);

    async function initializeRoom() {
      try {
        const details = await getRoomDetails(roomId);
        if (!details) {
          setError('Không tìm thấy phòng chat này.');
          setIsLoading(false);
          return;
        }

        if (details.status === 'ended') {
          router.push(`/room/${roomId}/closed`);
          return;
        }

        setRoom(details);
        setIsHost(activeSession ? details.host_session_id === activeSession.sessionId : false);

        // Fetch initial messages & members
        const [initialMsgs, initialMembers] = await Promise.all([
          getRoomMessages(roomId),
          getRoomMembers(roomId)
        ]);

        setMessages(initialMsgs);
        
        if (!isSupabaseConfigured()) {
          if (activeSession) {
            setOnlineUsers([
              { nickname: activeSession.nickname, sessionId: activeSession.sessionId },
              { nickname: 'ShadowFox (Demo)', sessionId: 'mock-anon-user-1' },
              { nickname: 'NeonSpecter (Demo)', sessionId: 'mock-anon-user-2' }
            ]);
            
            // Add visual cue in mock mode
            setMessages([
              {
                id: 'sys-joined',
                room_id: roomId,
                sender_nickname: 'System',
                content: `${activeSession.nickname} joined the room.`,
                created_at: new Date().toISOString(),
                isSystem: true
              },
              {
                id: 'sys-encrypt',
                room_id: roomId,
                sender_nickname: 'System',
                content: `Connection encrypted. Messages will be wiped at ${new Date(Date.now() + 5 * 60 * 60 * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}.`,
                created_at: new Date(Date.now() + 1000).toISOString(),
                isSystem: true
              },
              {
                id: 'mock-msg-1',
                room_id: roomId,
                sender_nickname: 'NeonSpecter (Demo)',
                content: 'Did you check the logs? I think the ephemeral token is expiring too fast for this session.',
                created_at: new Date(Date.now() - 30 * 1000).toISOString()
              }
            ]);
          }
        } else {
          setOnlineUsers(initialMembers.map((m: any) => ({
            nickname: m.nickname,
            sessionId: m.session_id
          })));
        }

        calculateRoomTimeLeft(details.room_expire_at);
        setIsLoading(false);
      } catch (err: any) {
        setError('Lỗi kết nối đến máy chủ.');
        setIsLoading(false);
      }
    }

    initializeRoom();
  }, [roomId, router]);

  // 2. Room Expiration Countdown (HH:MM:SS)
  const calculateRoomTimeLeft = (expireTimeString: string) => {
    const difference = new Date(expireTimeString).getTime() - Date.now();
    if (difference <= 0) {
      setRoomTimeLeft(0);
      setIsRoomExpired(true);
      router.push(`/room/${roomId}/closed`);
    } else {
      setRoomTimeLeft(Math.floor(difference / 1000));
      setIsRoomExpired(false);
    }
  };

  useEffect(() => {
    if (!room || roomTimeLeft <= 0) return;

    const interval = setInterval(() => {
      calculateRoomTimeLeft(room.room_expire_at);
    }, 1000);

    return () => clearInterval(interval);
  }, [room, roomTimeLeft]);

  // 3. Real-time Subscription via Supabase Engine
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || isLoading || error || !session) return;

    // A. Subscribing to postgres inserts in MESSAGES table
    const messagesChannel = supabase
      .channel(`room_messages_changes:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            
            // Check if there is an optimistic message from the same sender with the same content
            const optimisticIndex = prev.findIndex(
              (m) => m.isOptimistic && m.sender_nickname === newMsg.sender_nickname && m.content === newMsg.content
            );
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = newMsg;
              return updated;
            }

            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    // B. Subscribing to rooms updates
    const roomChannel = supabase
      .channel(`room_status_changes:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE' || (payload.new && payload.new.status === 'ended')) {
            router.push(`/room/${roomId}/closed`);
          }
        }
      )
      .subscribe();

    // C. Subscribing to Presence
    const presenceChannel = supabase.channel(`room_presence:${roomId}`);
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeMembers = Object.values(state).flatMap((presences: any) =>
          presences.map((p: any) => ({
            nickname: p.nickname,
            sessionId: p.sessionId
          }))
        );

        const uniqueMembers = activeMembers.filter(
          (value, index, self) =>
            index === self.findIndex((t) => t.sessionId === value.sessionId)
        );

        setOnlineUsers(uniqueMembers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            nickname: session.nickname,
            sessionId: session.sessionId,
            joinedAt: new Date().toISOString()
          });
        }
      });

    return () => {
      if (supabase) {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(roomChannel);
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [roomId, isLoading, error, session, router]);

  // 4. Mock simulation sandbox for immediate local testing
  useEffect(() => {
    if (isSupabaseConfigured() || isLoading || error || !session) return;

    const mockResponses = [
      "On it. Setting the heartbeat to 30s. We should stay live until the countdown hits zero.",
      "Perfect. Ghost protocol engaged.",
      "Everything will vanish permanently. Zero digital footprint.",
      "Did you check the logs? I think the ephemeral token is expiring too fast for this session."
    ];

    const mockNames = ["ShadowFox (Demo)", "NeonSpecter (Demo)"];

    const mockInterval = setInterval(() => {
      const randomText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      const randomSender = mockNames[Math.floor(Math.random() * mockNames.length)];
      
      const newMockMsg = {
        id: 'mock-income-' + Math.random(),
        room_id: roomId,
        sender_nickname: randomSender,
        content: randomText,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, newMockMsg]);
    }, 12000);

    return () => clearInterval(mockInterval);
  }, [roomId, isLoading, error, session]);

  // 5. Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format Time (HH:MM PM/AM)
  const formatMsgTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Format Self-Destruct Timer (HH:MM:SS)
  const formatRoomTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = async () => {
    if (!room || !session) return;
    try {
      await navigator.clipboard.writeText(room.invite_code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);

      // Silently extend room invite code expiration by 5 minutes
      const res = await extendInviteCodeByMember(roomId, session.sessionId);
      if (res && res.code_expire_at) {
        setRoom((prev: any) => ({
          ...prev,
          code_expire_at: res.code_expire_at
        }));
      }
    } catch (err) {
      console.error('Silently extending invite code failed:', err);
    }
  };

  // Trigger leave/end room with a Close ✕ action
  const handleExitAction = () => {
    if (!session) return;
    setShowExitConfirm(true);
  };

  // Perform the actual exit action when confirmed via custom popup
  const handleConfirmExit = async () => {
    if (!session || isExiting) return;
    setIsExiting(true);
    try {
      if (isHost) {
        await endRoom(roomId, session.sessionId);
      } else {
        await leaveRoom(roomId, session.sessionId);
      }
      setShowExitConfirm(false);
      router.push('/home');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thoát phòng');
    } finally {
      setIsExiting(false);
    }
  };

  // Action: Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || isSending) return;

    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    // Rate Limit Security logic (Maximum 5 messages per 3 seconds)
    const now = Date.now();
    const cleanTimestamps = sendTimestamps.filter((t) => now - t < 3000);

    if (cleanTimestamps.length >= 5) {
      setRateLimitError('Bạn đang gửi tin nhắn quá nhanh');
      setTimeout(() => setRateLimitError(null), 3000);
      return;
    }

    setIsSending(true);
    setRateLimitError(null);

    const optimisticMsgId = 'optimistic-' + Math.random();
    const optimisticMsg = {
      id: optimisticMsgId,
      room_id: roomId,
      sender_nickname: session.nickname,
      content: trimmed,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputMessage('');

    try {
      const res = await sendMessage(roomId, session.nickname, session.sessionId, trimmed);
      setSendTimestamps([...cleanTimestamps, now]);
      setMessages((prev) => {
        // If the real-time hook already received the inserted message, just remove the optimistic message
        if (prev.some((m) => m.id === res.id)) {
          return prev.filter((m) => m.id !== optimisticMsgId);
        }
        return prev.map((m) => (m.id === optimisticMsgId ? res : m));
      });
    } catch (err: any) {
      setRateLimitError(err.message || 'Không thể gửi tin nhắn.');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsgId));
      setInputMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#131319] text-center px-4">
        <div className="ambient-bg" />
        <div className="glass-panel p-8 max-w-md border-red-500/20 text-center space-y-4">
          <ShieldAlert className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-zinc-200 font-sans">Đã xảy ra lỗi</h2>
          <p className="text-zinc-400 text-sm">{error}</p>
          <button
            onClick={() => router.push('/home')}
            className="w-full btn-secondary py-2 text-sm transition cursor-pointer"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !session || !room) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#131319] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide">Opening secure realtime node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col overflow-hidden bg-background text-on-background selection:bg-primary-container/30">
      {/* Decorative overlays */}
      <div className="noise-overlay"></div>
      <div className="violet-glow-bg -top-20 -left-20"></div>
      <div className="violet-glow-bg -bottom-40 -right-40"></div>

      {/* Top Header Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-md py-md bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="flex items-center gap-sm">
          <button 
            onClick={() => router.push('/home')}
            className="flex items-center justify-center w-10 h-10 hover:bg-surface-variant/50 rounded-full transition-all active:scale-90 duration-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary" data-icon="arrow_back">arrow_back</span>
          </button>
          
          <div className="flex flex-col">
            <h1 className="font-title-md text-title-md text-primary select-all">Room: #{room.invite_code}</h1>
            <div className="flex items-center gap-unit select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{formatRoomTime(roomTimeLeft)} remaining</span>
            </div>
          </div>
        </div>

        {/* Action icons on the right */}
        <div className="flex items-center gap-xs select-none">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center w-10 h-10 hover:bg-surface-variant/50 rounded-full transition-all active:scale-90 duration-100 text-on-surface-variant hover:text-primary cursor-pointer" 
            title="Thành viên"
          >
            <span className="material-symbols-outlined">group</span>
          </button>
          <button 
            onClick={handleCopyCode}
            className="flex items-center justify-center w-10 h-10 hover:bg-surface-variant/50 rounded-full transition-all active:scale-90 duration-100 text-on-surface-variant hover:text-primary cursor-pointer" 
            title="Copy Room Code"
          >
            <span className="material-symbols-outlined" data-icon="content_copy">content_copy</span>
          </button>
          {isCopied && (
            <span className="text-[10px] text-teal-400 font-bold pr-1 animate-pulse">✓ Copied</span>
          )}
          <button 
            onClick={handleExitAction}
            className="flex items-center justify-center w-10 h-10 hover:bg-surface-variant/50 rounded-full transition-all active:scale-90 duration-100 cursor-pointer" 
            title={isHost ? "Đóng phòng chat" : "Rời phòng"}
          >
            <span className="material-symbols-outlined text-error" data-icon="close">close</span>
          </button>
        </div>
      </header>

      {/* Slide drawer for active members */}
      {isSidebarOpen && (
        <>
          <aside className="absolute right-0 top-[73px] bottom-0 w-[350px] bg-[#131319]/90 backdrop-blur-3xl border-l border-white/5 z-30 p-6 flex flex-col justify-between shadow-[[-15px_0px_45px_-10px_rgba(124,58,237,0.2)]] animate-fade-in">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h4 className="text-sm font-extrabold text-[#ddb8ff] uppercase tracking-widest flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-primary">group</span>
                  <span>Active Members ({onlineUsers.length})</span>
                </h4>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="space-y-4 mt-6 mx-2 overflow-y-auto max-h-[72vh] pr-1">
                {onlineUsers.map((user) => {
                  const isSelf = user.sessionId === session.sessionId;
                  const isHostUser = user.sessionId === room.host_session_id;

                  return (
                    <div 
                      key={user.sessionId}
                      className={`group/item flex items-center gap-4 py-3 px-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                        isSelf 
                          ? 'bg-transparent text-white' 
                          : 'bg-transparent text-zinc-300 hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Left Status Light Indicator */}
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isHostUser 
                          ? 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.6)]' 
                          : isSelf 
                            ? 'bg-[#7C3AED] shadow-[0_0_10px_rgba(124,58,237,0.6)] animate-pulse'
                            : 'bg-zinc-500 animate-pulse'
                      }`}></span>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-sm font-extrabold truncate ${
                            isSelf ? 'text-[#ddb8ff] drop-shadow-[0_0_12px_rgba(221,184,255,0.4)]' : 'text-zinc-200'
                          }`}>
                            {user.nickname}
                          </span>
                          {isSelf && (
                            <span className="text-[11px] text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full font-bold select-none">
                              Bạn
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 truncate mt-0.5 select-none">
                          {isHostUser ? 'Room Creator' : 'Anonymous Guest'}
                        </span>
                      </div>

                      {/* Role indicator badges */}
                      {isHostUser ? (
                        <span className="text-xs font-extrabold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full tracking-wider uppercase select-none shadow-[0_0_8px_rgba(20,184,166,0.15)]">
                          Host
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase select-none">
                            Guest
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer notice inside drawer */}
            <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl select-none">
              <span className="material-symbols-outlined text-[18px] text-[#ddb8ff]/60">lock</span>
              <p className="text-[10px] text-zinc-500 leading-normal font-medium">
                End-to-end encrypted node. All message streams & logs are wiped automatically on exit.
              </p>
            </div>
          </aside>
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="absolute inset-0 bg-black/60 z-20 backdrop-blur-xs"
          />
        </>
      )}

      {/* Main Chat Canvas */}
      <main className="relative flex flex-col h-screen max-w-4xl mx-auto w-full px-md self-center" style={{ paddingTop: '115px', paddingBottom: '85px' }}>
        
        {/* Messages list stream container */}
        <div 
          className="chat-container w-full overflow-y-auto space-y-lg py-lg flex flex-col scroll-smooth" 
          id="chat-canvas"
          style={{ height: 'calc(100vh - 200px)', width: '100%' }}
        >
          
          {/* Render message list */}
          {messages.map((msg, index) => {
            const isSelf = msg.sender_nickname === session.nickname;
            const isSystem = msg.isSystem || msg.sender_nickname === 'System';

            // Spacing check based on previous message (same user = tight, diff user = wide)
            const previousMsg = index > 0 ? messages[index - 1] : null;
            const isSameSender = previousMsg && previousMsg.sender_nickname === msg.sender_nickname && !previousMsg.isSystem && !msg.isSystem;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center self-center select-none my-1">
                  <span className="bg-surface-container/50 px-md py-xs rounded-full font-label-sm text-label-sm text-on-surface-variant/60 border border-outline-variant/10">
                    {msg.content}
                  </span>
                </div>
              );
            }

            if (isSelf) {
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col items-end max-w-[85%] sm:max-w-[70%] self-end group ${
                    isSameSender ? 'space-y-0 mt-2' : 'space-y-unit mt-5'
                  }`}
                >
                  {!isSameSender && (
                    <span className="mr-sm font-label-sm text-label-sm text-primary font-semibold opacity-70 text-right select-none">
                      {msg.sender_nickname}
                    </span>
                  )}
                  <div 
                    className={`bg-primary-container text-on-primary-container px-lg py-md rounded-[24px] rounded-tr-xs shadow-2xl shadow-primary-container/20 transition-all ${
                      msg.isOptimistic ? 'opacity-55' : ''
                    }`}
                  >
                    <p className="font-body-md text-body-md leading-relaxed break-words">{msg.content}</p>
                  </div>
                  <span className="mr-sm font-label-sm text-[11px] text-on-surface-variant/40 mt-1 select-none">
                    {formatMsgTime(msg.created_at)}
                  </span>
                </div>
              );
            }

            // Other's Messages
            return (
              <div 
                key={msg.id}
                className={`flex flex-col items-start max-w-[85%] sm:max-w-[70%] self-start group ${
                  isSameSender ? 'space-y-0 mt-2' : 'space-y-unit mt-5'
                }`}
              >
                {!isSameSender && (
                  <span className="ml-sm font-label-sm text-label-sm text-secondary font-semibold opacity-70 select-none">
                    {msg.sender_nickname}
                  </span>
                )}
                <div className="glass-panel bg-surface-container-highest/40 px-lg py-md rounded-[24px] rounded-tl-xs shadow-xl">
                  <p className="font-body-md text-body-md text-on-surface leading-relaxed break-words">{msg.content}</p>
                </div>
                <span className="ml-sm font-label-sm text-[11px] text-on-surface-variant/40 mt-1 select-none">
                  {formatMsgTime(msg.created_at)}
                </span>
              </div>
            );
          })}

          <div ref={messagesEndRef} />

        </div>

      </main>

      {/* Bottom Message Input Area */}
      <div className="fixed bottom-0 left-0 w-full px-md py-md bg-surface/50 backdrop-blur-2xl z-20 flex justify-center items-center">
        <form onSubmit={handleSendMessage} className="w-full max-w-4xl relative flex items-center gap-sm" style={{ width: '100%', maxWidth: '896px' }}>
          
          {rateLimitError && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-red-400 text-xs font-bold animate-pulse">
              ⚠️ {rateLimitError}
            </div>
          )}

          <div className="relative flex-grow">
            <input 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value.substring(0, 500))}
              disabled={isSending || !!rateLimitError}
              maxLength={500}
              className="w-full bg-surface-container-low border-transparent focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 rounded-[18px] py-md pl-lg pr-[52px] text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body-md outline-none"
              placeholder="Type your message..." 
              type="text"
            />
            <div className="absolute right-md top-1/2 -translate-y-1/2 flex gap-xs select-none">
              <span className="material-symbols-outlined text-on-surface-variant/50 cursor-pointer hover:text-primary transition-colors pr-1" data-icon="attachment">
                attachment
              </span>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={!inputMessage.trim() || isSending || !!rateLimitError}
            className="w-[52px] h-[52px] bg-[#7C3AED] hover:bg-[#9333EA] text-white rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-primary-container/40 active:scale-95 transition-all duration-200 group flex-shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform" data-icon="send" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>

        </form>
      </div>

      {/* Background decoration blur */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Custom Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md transition-all duration-300 animate-fade-in">
          <div className="glass-panel mx-4 p-lg border border-white/10 rounded-3xl bg-[#131319]/95 shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col gap-md text-center animate-scale-up" style={{ width: '420px', maxWidth: '90%' }}>
            
            <div className="space-y-2 mt-sm">
              <h3 className="font-title-lg text-title-lg text-red-500 font-extrabold uppercase tracking-wider">
                {isHost ? 'Kết thúc phòng chat' : 'Rời phòng chat'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant/80 leading-relaxed">
                {isHost 
                  ? 'Bạn là chủ phòng. Bạn có chắc chắn muốn KẾT THÚC phòng chat ẩn danh này? Toàn bộ tin nhắn & thành viên sẽ bị xoá sạch vĩnh viễn.'
                  : 'Bạn có chắc chắn muốn RỜI phòng chat ẩn danh này không? Tin nhắn của bạn sẽ được giữ lại nhưng bạn sẽ không thể tham gia lại.'
                }
              </p>
            </div>

            <div className="flex gap-md mt-lg">
              <button
                onClick={() => setShowExitConfirm(false)}
                disabled={isExiting}
                className="btn-secondary flex-1 h-12 rounded-[20px] font-semibold text-body-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Từ chối
              </button>
              <button
                onClick={handleConfirmExit}
                disabled={isExiting}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 active:scale-[0.98] transition-all duration-200 text-white font-semibold rounded-[20px] flex-1 h-12 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.25)] border-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExiting ? (
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
