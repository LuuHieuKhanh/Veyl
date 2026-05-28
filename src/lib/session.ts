/**
 * Veyl Session & Nickname Management Utilities
 */

// Generate a random temporary session ID prefixed with 'gs_'
export const generateSessionId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'gs_';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Validate that nickname conforms to length and safety constraints
export const validateNickname = (nickname: string): { isValid: boolean; error?: string } => {
  const trimmed = nickname.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'Biệt danh không được để trống' };
  }
  
  if (trimmed.length < 3 || trimmed.length > 20) {
    return { isValid: false, error: 'Độ dài biệt danh phải từ 3 đến 20 ký tự' };
  }
  
  // Regex supporting English, Numbers, Vietnamese letters with accents, and Spaces
  const nameRegex = /^[a-zA-Z0-9 aAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬdDđĐeEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆiIìÌỉỈĩĨíÍịỊoOòÒỏỎõÕóÓọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢuUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰyYỳỲỷỶỹỸýÝỵY]+$/;
  
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, error: 'Biệt danh không được chứa ký tự đặc biệt hoặc mã độc' };
  }
  
  return { isValid: true };
};

// Client-side helper to load active session details
export interface ClientSession {
  sessionId: string;
  nickname: string;
}

export const getClientSession = (): ClientSession | null => {
  if (typeof window === 'undefined') return null;
  
  const sessionId = localStorage.getItem('veyl_session_id');
  const nickname = localStorage.getItem('veyl_nickname');
  
  if (sessionId && nickname) {
    return { sessionId, nickname };
  }
  
  return null;
};

export const saveClientSession = (nickname: string, sessionId?: string): ClientSession => {
  const activeSessionId = sessionId || localStorage.getItem('veyl_session_id') || generateSessionId();
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('veyl_session_id', activeSessionId);
    localStorage.setItem('veyl_nickname', nickname.trim());
    
    // Also save in cookie for Next.js Server Side context/actions if needed
    document.cookie = `veyl_session_id=${activeSessionId}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `veyl_nickname=${encodeURIComponent(nickname.trim())}; path=/; max-age=86400; SameSite=Lax`;
  }
  
  return { sessionId: activeSessionId, nickname: nickname.trim() };
};

export const clearClientSession = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('veyl_session_id');
    localStorage.removeItem('veyl_nickname');
    document.cookie = 'veyl_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'veyl_nickname=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  }
};
