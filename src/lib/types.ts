export interface Profile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  study_goal: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  activity_type: string;
  duration_minutes: number;
  test_count: number;
  correct: number;
  wrong: number;
  blank: number;
  activity_date: string;
  notes: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  task_date: string;
  completed: boolean;
  created_at: string;
  description: string;
  task_type: string;
  task_level: 'daily' | 'weekly' | 'monthly';
  start_time: string;
  end_time: string;
  estimated_minutes: number;
  priority: string;
  deadline: string | null;
  difficulty: string;
  quantity: number;
  quantity_type: string;
  status: string;
  recurrence: string;
  recurrence_config: Record<string, unknown>;
  depends_on: string | null;
  parent_task_id: string | null;
  smart_priority: number;
  completed_at: string | null;
  notes: string;
}

export interface Exam {
  id: string;
  user_id: string;
  subject: string;
  question_count: number;
  time_limit_minutes: number;
  status: string;
  answers: ExamAnswer[];
  result: ExamResult | Record<string, never>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ExamAnswer {
  answer: 'correct' | 'wrong' | 'blank' | null;
}

export interface ExamResult {
  correct: number;
  wrong: number;
  blank: number;
  percentage: number;
  total: number;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  updated_at: string;
  created_at: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  subject: string;
  is_private: boolean;
  capacity: number;
  session_duration: number;
  study_goal: string;
  is_active: boolean;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  is_studying: boolean;
  study_started_at: string | null;
  joined_at: string;
  total_study_seconds: number;
  profile?: Profile;
}

export interface StudySession {
  id: string;
  room_id: string | null;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
}

export interface StudyStats {
  today_seconds: number;
  week_seconds: number;
  month_seconds: number;
  total_seconds: number;
  session_count: number;
  active_days: number;
  rank: number;
}

export interface ChatConversation {
  id: string;
  type: 'public' | 'group' | 'direct';
  name: string;
  created_by: string;
  created_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  status: string;
  created_at: string;
  profile?: Profile;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  total_minutes: number;
  total_tests: number;
  total_activities: number;
}
