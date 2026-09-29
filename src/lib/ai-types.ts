export type AITaskType =
  | 'chat'
  | 'study-planner'
  | 'performance-analysis'
  | 'tutor'
  | 'test-generator'
  | 'weakness-finder'
  | 'goal-setting';

export interface AIConversation {
  id: string;
  user_id: string;
  task_type: AITaskType;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AIStudyProfile {
  id: string;
  user_id: string;
  grade: string;
  field: string;
  goal: string;
  target_date: string | null;
  daily_study_hours: number;
  available_hours: string[];
  off_days: string[];
  strengths: string[];
  weaknesses: string[];
  backlog_topics: string[];
  daily_test_count: number;
  review_time_minutes: number;
  explanation_level: string;
  created_at: string;
  updated_at: string;
}

export interface AIUsageTracking {
  id: string;
  user_id: string;
  conversation_id: string | null;
  task_type: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
  created_at: string;
}

export interface PerformanceData {
  total_minutes: number;
  total_tests: number;
  avg_percentage: number;
  subjects_studied: string[];
  streak: number;
  week_minutes: number;
}

export interface QuickAction {
  id: AITaskType;
  label: string;
  icon: string;
  description: string;
  color: string;
}
