'use server';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { validateNickname } from '@/lib/session';

// Helper to generate a random 6-digit code
const generateInviteCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Passive Cleanup: Purge expired rooms, cascade deletes members and messages.
 */
async function performPassiveCleanup() {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const nowISO = new Date().toISOString();
    await supabase
      .from('rooms')
      .delete()
      .lt('room_expire_at', nowISO);
  } catch (error) {
    console.error('Error in passive cleanup:', error);
  }
}

/**
 * Server Action: Create Room
 */
export async function createRoom(hostSessionId: string, hostNickname: string) {
  // Validate input
  const nameValidation = validateNickname(hostNickname);
  if (!nameValidation.isValid) {
    throw new Error(nameValidation.error || 'Biệt danh không hợp lệ');
  }

  await performPassiveCleanup();

  const code = generateInviteCode();
  const now = new Date();
  
  // Code expires in 5 minutes
  const codeExpireAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  // Room expires in 5 hours
  const roomExpireAt = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString();

  // If Supabase is NOT configured, return mock data
  if (!isSupabaseConfigured() || !supabase) {
    return {
      id: 'mock-room-uuid-' + Math.random().toString(36).substring(2, 9),
      host_session_id: hostSessionId,
      invite_code: code,
      code_expire_at: codeExpireAt,
      room_expire_at: roomExpireAt,
      status: 'active',
      isMock: true
    };
  }

  // Insert room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert([
      {
        host_session_id: hostSessionId,
        invite_code: code,
        code_expire_at: codeExpireAt,
        room_expire_at: roomExpireAt,
        status: 'active'
      }
    ])
    .select()
    .single();

  if (roomError || !room) {
    console.error('Room Creation Error:', roomError);
    throw new Error('Không thể tạo phòng chat. Vui lòng thử lại.');
  }

  // Insert host member
  const { error: memberError } = await supabase
    .from('room_members')
    .insert([
      {
        room_id: room.id,
        session_id: hostSessionId,
        nickname: hostNickname.trim()
      }
    ]);

  if (memberError) {
    console.error('Host Member Insertion Error:', memberError);
    // clean up room
    await supabase.from('rooms').delete().eq('id', room.id);
    throw new Error('Không thể tham gia phòng chat với tư cách là chủ phòng.');
  }

  return { ...room, isMock: false };
}

/**
 * Server Action: Join Room by Code
 */
export async function joinRoomByCode(inviteCode: string, userSessionId: string, userNickname: string) {
  // Validate inviteCode
  const trimmedCode = inviteCode.trim();
  if (trimmedCode.length !== 6 || !/^\d+$/.test(trimmedCode)) {
    throw new Error('Mã phòng phải gồm 6 chữ số');
  }

  // Validate nickname
  const nameValidation = validateNickname(userNickname);
  if (!nameValidation.isValid) {
    throw new Error(nameValidation.error || 'Biệt danh không hợp lệ');
  }

  await performPassiveCleanup();

  if (!isSupabaseConfigured() || !supabase) {
    // Mock join success
    if (trimmedCode === '000000') {
      throw new Error('Mã phòng không tồn tại');
    }
    if (trimmedCode === '111111') {
      throw new Error('Mã tham gia đã hết hạn');
    }
    if (trimmedCode === '222222') {
      throw new Error('Phòng chat đã kết thúc');
    }
    return {
      roomId: 'mock-room-uuid-joined',
      isMock: true
    };
  }

  // Find active room with code
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('invite_code', trimmedCode)
    .order('created_at', { ascending: false })
    .limit(1);

  if (roomError || !room || room.length === 0) {
    throw new Error('Mã phòng không tồn tại');
  }

  const targetRoom = room[0];

  // Check if room is ended
  if (targetRoom.status === 'ended') {
    throw new Error('Phòng chat đã kết thúc');
  }

  // Check code expiration
  const expireTime = new Date(targetRoom.code_expire_at).getTime();
  const nowTime = new Date().getTime();
  if (nowTime > expireTime) {
    throw new Error('Mã tham gia đã hết hạn');
  }

  // Add user to members
  // We upsert or insert. Since we have a unique constraint on (room_id, session_id), we use upsert
  const { error: memberError } = await supabase
    .from('room_members')
    .upsert(
      {
        room_id: targetRoom.id,
        session_id: userSessionId,
        nickname: userNickname.trim(),
        joined_at: new Date().toISOString()
      },
      { onConflict: 'room_id,session_id' }
    );

  if (memberError) {
    console.error('Member join error:', memberError);
    throw new Error('Không thể tham gia phòng chat.');
  }

  return {
    roomId: targetRoom.id,
    isMock: false
  };
}

/**
 * Server Action: Regenerate Invite Code
 */
export async function regenerateInviteCode(roomId: string, hostSessionId: string) {
  const newCode = generateInviteCode();
  const now = new Date();
  const codeExpireAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  if (!isSupabaseConfigured() || !supabase) {
    return {
      invite_code: newCode,
      code_expire_at: codeExpireAt,
      isMock: true
    };
  }

  // Verify host ownership
  const { data: room, error: fetchError } = await supabase
    .from('rooms')
    .select('host_session_id')
    .eq('id', roomId)
    .single();

  if (fetchError || !room) {
    throw new Error('Không tìm thấy phòng chat');
  }

  if (room.host_session_id !== hostSessionId) {
    throw new Error('Bạn không có quyền thay đổi mã tham gia phòng này');
  }

  // Update invite code
  const { error: updateError } = await supabase
    .from('rooms')
    .update({
      invite_code: newCode,
      code_expire_at: codeExpireAt
    })
    .eq('id', roomId);

  if (updateError) {
    throw new Error('Không thể tạo mã mới. Vui lòng thử lại.');
  }

  return {
    invite_code: newCode,
    code_expire_at: codeExpireAt,
    isMock: false
  };
}

/**
 * Server Action: Extend Invite Code Expiration (silently reset expiration to now + 5m)
 */
export async function extendInviteCode(roomId: string, hostSessionId: string) {
  const now = new Date();
  const codeExpireAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  if (!isSupabaseConfigured() || !supabase) {
    return {
      code_expire_at: codeExpireAt,
      isMock: true
    };
  }

  // Verify host ownership
  const { data: room, error: fetchError } = await supabase
    .from('rooms')
    .select('host_session_id')
    .eq('id', roomId)
    .single();

  if (fetchError || !room) {
    throw new Error('Không tìm thấy phòng chat');
  }

  if (room.host_session_id !== hostSessionId) {
    throw new Error('Bạn không có quyền thay đổi mã tham gia phòng này');
  }

  // Update invite code expiration time
  const { error: updateError } = await supabase
    .from('rooms')
    .update({
      code_expire_at: codeExpireAt
    })
    .eq('id', roomId);

  if (updateError) {
    throw new Error('Không thể gia hạn mã phòng');
  }

  return {
    code_expire_at: codeExpireAt,
    isMock: false
  };
}

/**
 * Server Action: Extend Invite Code Expiration by ANY Active Member (silently reset expiration to now + 5m)
 */
export async function extendInviteCodeByMember(roomId: string, sessionId: string) {
  const now = new Date();
  const codeExpireAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  if (!isSupabaseConfigured() || !supabase) {
    return {
      code_expire_at: codeExpireAt,
      isMock: true
    };
  }

  // Verify room existence
  const { data: room, error: fetchError } = await supabase
    .from('rooms')
    .select('host_session_id')
    .eq('id', roomId)
    .single();

  if (fetchError || !room) {
    throw new Error('Không tìm thấy phòng chat');
  }

  // If they are not the host, verify active membership
  if (room.host_session_id !== sessionId) {
    const { data: member, error: memberError } = await supabase
      .from('room_members')
      .select('session_id')
      .eq('room_id', roomId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (memberError || !member) {
      throw new Error('Bạn không phải là thành viên hoạt động của phòng chat này');
    }
  }

  // Update invite code expiration time
  const { error: updateError } = await supabase
    .from('rooms')
    .update({
      code_expire_at: codeExpireAt
    })
    .eq('id', roomId);

  if (updateError) {
    throw new Error('Không thể gia hạn mã phòng');
  }

  return {
    code_expire_at: codeExpireAt,
    isMock: false
  };
}


/**
 * Server Action: End Chat Room (Host)
 */
export async function endRoom(roomId: string, hostSessionId: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: true, isMock: true };
  }

  // Verify host ownership
  const { data: room, error: fetchError } = await supabase
    .from('rooms')
    .select('host_session_id')
    .eq('id', roomId)
    .single();

  if (fetchError || !room) {
    throw new Error('Không tìm thấy phòng chat');
  }

  if (room.host_session_id !== hostSessionId) {
    throw new Error('Bạn không có quyền kết thúc phòng này');
  }

  // Update room status to ended
  const { error: statusError } = await supabase
    .from('rooms')
    .update({ status: 'ended' })
    .eq('id', roomId);

  if (statusError) {
    console.error('Error ending room status:', statusError);
  }

  // Delete the room. This triggers cascading deletes on room_members and messages!
  const { error: deleteError } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (deleteError) {
    console.error('Error deleting room:', deleteError);
    throw new Error('Không thể xóa dữ liệu phòng chat.');
  }

  return { success: true, isMock: false };
}

/**
 * Server Action: Leave Chat Room (Normal User)
 */
export async function leaveRoom(roomId: string, userSessionId: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: true, isMock: true };
  }

  const { error } = await supabase
    .from('room_members')
    .delete()
    .match({ room_id: roomId, session_id: userSessionId });

  if (error) {
    throw new Error('Không thể rời phòng chat.');
  }

  return { success: true, isMock: false };
}

/**
 * Server Action: Send message (with DB-level Rate Limiter)
 */
export async function sendMessage(roomId: string, nickname: string, sessionId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Tin nhắn không được để trống');
  }

  if (trimmed.length > 500) {
    throw new Error('Tin nhắn quá dài (tối đa 500 ký tự)');
  }

  if (!isSupabaseConfigured() || !supabase) {
    return {
      id: 'mock-msg-' + Math.random(),
      room_id: roomId,
      sender_nickname: nickname,
      content: trimmed,
      created_at: new Date().toISOString(),
      isMock: true
    };
  }

  // Database-Level Rate Limit Protection:
  // Count how many messages this session_id sent in the last 3 seconds
  const threeSecondsAgo = new Date(Date.now() - 3000).toISOString();
  
  // We can query messages table for matching sender
  const { data: recentMsgs, error: countError } = await supabase
    .from('messages')
    .select('id')
    .eq('room_id', roomId)
    .eq('sender_nickname', nickname)
    .gt('created_at', threeSecondsAgo);

  if (countError) {
    console.error('Rate limit query error:', countError);
  }

  if (recentMsgs && recentMsgs.length >= 5) {
    throw new Error('Bạn đang gửi tin nhắn quá nhanh');
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from('messages')
    .insert([
      {
        room_id: roomId,
        sender_nickname: nickname,
        content: trimmed
      }
    ])
    .select()
    .single();

  if (insertError || !message) {
    throw new Error('Không thể gửi tin nhắn.');
  }

  return { ...message, isMock: false };
}

/**
 * Server Action: Retrieve existing messages (on initial room load)
 */
export async function getRoomMessages(roomId: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return messages;
}

/**
 * Server Action: Retrieve active room details
 */
export async function getRoomDetails(roomId: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      id: roomId,
      host_session_id: 'mock-host-id',
      invite_code: '123456',
      code_expire_at: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
      status: 'active',
      isMock: true
    };
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error || !room) {
    return null;
  }

  return room;
}

/**
 * Server Action: Retrieve list of members
 */
export async function getRoomMembers(roomId: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return [{ nickname: 'Chủ phòng (Demo)' }];
  }

  const { data: members, error } = await supabase
    .from('room_members')
    .select('nickname, session_id')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching room members:', error);
    return [];
  }

  return members;
}
