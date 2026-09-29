import { supabase } from '@/lib/supabase';
import type { StudyRoom, RoomMember, StudySession, StudyStats, Profile } from '@/lib/types';

export interface RoomWithCounts extends StudyRoom {
  member_count: number;
  studying_count: number;
  creator_profile?: Profile;
}

export interface LeaderboardUser {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  total_seconds: number;
  session_count: number;
  is_online: boolean;
  current_subject: string;
}

export type TimeFilter = 'day' | 'week' | 'month';
export type RoomTab = 'top' | 'explore' | 'mine';

// === Room CRUD ===

export async function fetchRooms(tab: RoomTab, userId: string): Promise<RoomWithCounts[]> {
  let query = supabase.from('study_rooms').select('*');

  if (tab === 'mine') {
    // Rooms where user is a member
    const { data: memberships } = await supabase
      .from('room_members')
      .select('room_id')
      .eq('user_id', userId);
    if (!memberships || memberships.length === 0) return [];
    const roomIds = memberships.map((m) => m.room_id);
    query = query.in('id', roomIds);
  } else if (tab === 'top') {
    query = query.eq('is_active', true).order('created_at', { ascending: false });
  } else {
    query = query.eq('is_active', true).order('created_at', { ascending: false });
  }

  const { data: roomsData } = await query;
  if (!roomsData) return [];

  const rooms = roomsData as StudyRoom[];

  // Get member counts and studying counts for all rooms at once
  const { data: memberData } = await supabase
    .from('room_members')
    .select('room_id, is_studying');

  const memberCounts: Record<string, number> = {};
  const studyingCounts: Record<string, number> = {};

  (memberData || []).forEach((m) => {
    const r = m as { room_id: string; is_studying: boolean };
    memberCounts[r.room_id] = (memberCounts[r.room_id] || 0) + 1;
    if (r.is_studying) studyingCounts[r.room_id] = (studyingCounts[r.room_id] || 0) + 1;
  });

  // Get creator profiles
  const creatorIds = [...new Set(rooms.map((r) => r.created_by))];
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*')
    .in('id', creatorIds);
  const profilesMap: Record<string, Profile> = {};
  (profilesData || []).forEach((p) => {
    profilesMap[(p as Profile).id] = p as Profile;
  });

  const result = rooms.map((room) => ({
    ...room,
    member_count: memberCounts[room.id] || 0,
    studying_count: studyingCounts[room.id] || 0,
    creator_profile: profilesMap[room.created_by],
  }));

  // Sort 'top' by studying_count desc
  if (tab === 'top') {
    result.sort((a, b) => b.studying_count - a.studying_count || b.member_count - a.member_count);
  }

  return result;
}

export interface CreateRoomData {
  name: string;
  description: string;
  subject: string;
  is_private: boolean;
  capacity: number;
  session_duration: number;
  study_goal: string;
}

export async function createRoom(data: CreateRoomData): Promise<StudyRoom | null> {
  const { data: room } = await supabase
    .from('study_rooms')
    .insert({
      name: data.name.trim(),
      description: data.description.trim(),
      subject: data.subject.trim(),
      is_private: data.is_private,
      capacity: data.capacity,
      session_duration: data.session_duration,
      study_goal: data.study_goal.trim(),
    })
    .select()
    .single();
  return room as StudyRoom | null;
}

// === Room membership ===

export async function joinRoom(roomId: string, userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: userId,
    });
  }
}

export async function leaveRoom(memberId: string): Promise<void> {
  // Stop studying first
  await supabase
    .from('room_members')
    .update({ is_studying: false, study_started_at: null })
    .eq('id', memberId);
  await supabase.from('room_members').delete().eq('id', memberId);
}

export async function fetchRoomMembers(roomId: string): Promise<(RoomMember & { profile: Profile })[]> {
  const { data: membersData } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_id', roomId);

  if (!membersData || membersData.length === 0) return [];

  const members = membersData as RoomMember[];
  const userIds = members.map((m) => m.user_id);

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profilesMap: Record<string, Profile> = {};
  (profilesData || []).forEach((p) => {
    profilesMap[(p as Profile).id] = p as Profile;
  });

  return members.map((m) => ({
    ...m,
    profile: profilesMap[m.user_id],
  }));
}

export async function startStudying(memberId: string): Promise<void> {
  await supabase
    .from('room_members')
    .update({ is_studying: true, study_started_at: new Date().toISOString() })
    .eq('id', memberId);
}

export async function stopStudying(
  memberId: string,
  roomMember: RoomMember,
): Promise<number> {
  let elapsed = 0;
  if (roomMember.study_started_at) {
    const start = new Date(roomMember.study_started_at).getTime();
    elapsed = Math.floor((Date.now() - start) / 1000);
  }

  const newTotal = (roomMember.total_study_seconds || 0) + elapsed;

  await supabase
    .from('room_members')
    .update({
      is_studying: false,
      study_started_at: null,
      total_study_seconds: newTotal,
    })
    .eq('id', memberId);

  // Record the session
  if (elapsed > 0) {
    await supabase.from('study_sessions').insert({
      room_id: roomMember.room_id,
      duration_seconds: elapsed,
      started_at: roomMember.study_started_at,
      ended_at: new Date().toISOString(),
    });
  }

  return elapsed;
}

// === Statistics ===

export async function fetchUserStats(userId: string): Promise<StudyStats> {
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('duration_seconds, created_at')
    .eq('user_id', userId);

  if (!sessions) {
    return { today_seconds: 0, week_seconds: 0, month_seconds: 0, total_seconds: 0, session_count: 0, active_days: 0, rank: 0 };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let today = 0, week = 0, month = 0, total = 0;
  const activeDaysSet = new Set<string>();

  (sessions as StudySession[]).forEach((s) => {
    const ts = new Date(s.created_at).getTime();
    total += s.duration_seconds;
    if (ts >= todayStart) today += s.duration_seconds;
    if (ts >= weekStart) week += s.duration_seconds;
    if (ts >= monthStart) month += s.duration_seconds;
    activeDaysSet.add(s.created_at.slice(0, 10));
  });

  // Compute rank: count users with more total study time
  let rank = 1;
  const { data: rankData } = await supabase
    .from('study_sessions')
    .select('user_id, duration_seconds');

  if (rankData) {
    const userTotals: Record<string, number> = {};
    (rankData as StudySession[]).forEach((s) => {
      userTotals[s.user_id] = (userTotals[s.user_id] || 0) + s.duration_seconds;
    });
    const myTotal = total;
    const sortedUsers = Object.entries(userTotals).sort((a, b) => b[1] - a[1]);
    const myRank = sortedUsers.findIndex(([uid]) => uid === userId);
    rank = myRank >= 0 ? myRank + 1 : sortedUsers.length + 1;
  }

  return {
    today_seconds: today,
    week_seconds: week,
    month_seconds: month,
    total_seconds: total,
    session_count: sessions.length,
    active_days: activeDaysSet.size,
    rank,
  };
}

// === Leaderboard ===

export async function fetchLeaderboard(filter: TimeFilter): Promise<LeaderboardUser[]> {
  const now = new Date();
  let since: number;

  if (filter === 'day') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  } else if (filter === 'week') {
    since = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else {
    since = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }

  const sinceISO = new Date(since).toISOString();

  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('user_id, duration_seconds, created_at, room_id')
    .gte('created_at', sinceISO);

  if (!sessions || sessions.length === 0) return [];

  const userTotals: Record<string, number> = {};
  const userCounts: Record<string, number> = {};
  const userLastRoom: Record<string, string | null> = {};

  (sessions as StudySession[]).forEach((s) => {
    userTotals[s.user_id] = (userTotals[s.user_id] || 0) + s.duration_seconds;
    userCounts[s.user_id] = (userCounts[s.user_id] || 0) + 1;
    userLastRoom[s.user_id] = s.room_id;
  });

  const userIds = Object.keys(userTotals);

  // Fetch profiles
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const profilesMap: Record<string, Profile> = {};
  (profilesData || []).forEach((p) => {
    profilesMap[(p as Profile).id] = p as Profile;
  });

  // Check who's currently online (studying in any room)
  const { data: studyingMembers } = await supabase
    .from('room_members')
    .select('user_id, room_id')
    .eq('is_studying', true);
  const onlineUserIds = new Set((studyingMembers || []).map((m) => (m as { user_id: string }).user_id));
  const onlineUserRooms: Record<string, string> = {};
  (studyingMembers || []).forEach((m) => {
    const r = m as { user_id: string; room_id: string };
    onlineUserRooms[r.user_id] = r.room_id;
  });

  // Get subject for online users from their room
  const onlineRoomIds = [...new Set(Object.values(onlineUserRooms))];
  let roomSubjects: Record<string, string> = {};
  if (onlineRoomIds.length > 0) {
    const { data: roomsData } = await supabase
      .from('study_rooms')
      .select('id, subject')
      .in('id', onlineRoomIds);
    (roomsData || []).forEach((r) => {
      const room = r as { id: string; subject: string };
      roomSubjects[room.id] = room.subject;
    });
  }

  const result: LeaderboardUser[] = userIds.map((uid) => {
    const profile = profilesMap[uid];
    const isOnline = onlineUserIds.has(uid);
    const onlineRoomId = onlineUserRooms[uid];
    return {
      user_id: uid,
      display_name: profile?.display_name || 'کاربر',
      username: profile?.username || '',
      avatar_url: profile?.avatar_url || null,
      total_seconds: userTotals[uid],
      session_count: userCounts[uid],
      is_online: isOnline,
      current_subject: isOnline && onlineRoomId ? roomSubjects[onlineRoomId] || '' : '',
    };
  });

  result.sort((a, b) => b.total_seconds - a.total_seconds);
  return result;
}

// === Top rooms leaderboard ===

export async function fetchTopRooms(filter: TimeFilter): Promise<{ room: StudyRoom; total_seconds: number; member_count: number; studying_count: number }[]> {
  const now = new Date();
  let since: number;

  if (filter === 'day') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  } else if (filter === 'week') {
    since = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else {
    since = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }

  const sinceISO = new Date(since).toISOString();

  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('room_id, duration_seconds')
    .gte('created_at', sinceISO)
    .not('room_id', 'is', null);

  if (!sessions || sessions.length === 0) return [];

  const roomTotals: Record<string, number> = {};
  (sessions as StudySession[]).forEach((s) => {
    if (s.room_id) {
      roomTotals[s.room_id] = (roomTotals[s.room_id] || 0) + s.duration_seconds;
    }
  });

  const roomIds = Object.keys(roomTotals);
  const { data: roomsData } = await supabase
    .from('study_rooms')
    .select('*')
    .in('id', roomIds);
  const roomsMap: Record<string, StudyRoom> = {};
  (roomsData || []).forEach((r) => {
    roomsMap[(r as StudyRoom).id] = r as StudyRoom;
  });

  // Get member counts
  const { data: memberData } = await supabase
    .from('room_members')
    .select('room_id, is_studying');
  const memberCounts: Record<string, number> = {};
  const studyingCounts: Record<string, number> = {};
  (memberData || []).forEach((m) => {
    const r = m as { room_id: string; is_studying: boolean };
    memberCounts[r.room_id] = (memberCounts[r.room_id] || 0) + 1;
    if (r.is_studying) studyingCounts[r.room_id] = (studyingCounts[r.room_id] || 0) + 1;
  });

  const result = roomIds.map((rid) => ({
    room: roomsMap[rid],
    total_seconds: roomTotals[rid],
    member_count: memberCounts[rid] || 0,
    studying_count: studyingCounts[rid] || 0,
  })).filter((r) => r.room);

  result.sort((a, b) => b.total_seconds - a.total_seconds);
  return result;
}
