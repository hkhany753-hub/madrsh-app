import { supabase } from '@/lib/supabase';

export interface UserPreferences {
  user_id: string;
  theme: string;
  reduce_motion: boolean;
  notif_study_reminder: boolean;
  notif_task_reminder: boolean;
  notif_leaderboard: boolean;
  notif_chat_mentions: boolean;
  privacy_show_profile: boolean;
  privacy_show_stats: boolean;
  privacy_show_in_leaderboard: boolean;
  updated_at: string;
}

const LOCAL_KEY = 'madrsh-preferences';
const LOCAL_THEME = 'madrsh-theme';
const LOCAL_MOTION = 'madrsh-reduce-motion';
const LOCAL_NOTIF = 'madrsh-notifications';
const LOCAL_PRIVACY = 'madrsh-privacy';

export function getLocalPreferences() {
  return {
    theme: localStorage.getItem(LOCAL_THEME) || 'dark',
    reduce_motion: localStorage.getItem(LOCAL_MOTION) === 'true',
    notifications: (() => {
      try {
        const saved = localStorage.getItem(LOCAL_NOTIF);
        return saved ? JSON.parse(saved) : {
          studyReminder: true,
          taskReminder: true,
          leaderboard: false,
          chatMentions: true,
        };
      } catch {
        return { studyReminder: true, taskReminder: true, leaderboard: false, chatMentions: true };
      }
    })(),
    privacy: (() => {
      try {
        const saved = localStorage.getItem(LOCAL_PRIVACY);
        return saved ? JSON.parse(saved) : {
          showProfile: true,
          showStats: true,
          showInLeaderboard: true,
        };
      } catch {
        return { showProfile: true, showStats: true, showInLeaderboard: true };
      }
    })(),
  };
}

export function writeLocalPreferences(prefs: {
  theme?: string;
  reduce_motion?: boolean;
  notifications?: Record<string, boolean>;
  privacy?: Record<string, boolean>;
}) {
  if (prefs.theme !== undefined) {
    localStorage.setItem(LOCAL_THEME, prefs.theme);
    document.documentElement.dataset.theme = prefs.theme;
  }
  if (prefs.reduce_motion !== undefined) {
    if (prefs.reduce_motion) document.documentElement.dataset.reduceMotion = 'true';
    else delete document.documentElement.dataset.reduceMotion;
    localStorage.setItem(LOCAL_MOTION, String(prefs.reduce_motion));
  }
  if (prefs.notifications !== undefined) {
    localStorage.setItem(LOCAL_NOTIF, JSON.stringify(prefs.notifications));
  }
  if (prefs.privacy !== undefined) {
    localStorage.setItem(LOCAL_PRIVACY, JSON.stringify(prefs.privacy));
  }
}

export async function loadRemotePreferences(userId: string): Promise<UserPreferences | null> {
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as UserPreferences | null;
}

export async function upsertRemotePreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'user_id' | 'updated_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...updates,
    });
  if (error) throw error;
}

export async function syncPreferencesFromRemote(userId: string): Promise<void> {
  const remote = await loadRemotePreferences(userId);
  if (!remote) {
    // First login on this platform — push local prefs to backend
    const local = getLocalPreferences();
    await upsertRemotePreferences(userId, {
      theme: local.theme,
      reduce_motion: local.reduce_motion,
      notif_study_reminder: local.notifications.studyReminder,
      notif_task_reminder: local.notifications.taskReminder,
      notif_leaderboard: local.notifications.leaderboard,
      notif_chat_mentions: local.notifications.chatMentions,
      privacy_show_profile: local.privacy.showProfile,
      privacy_show_stats: local.privacy.showStats,
      privacy_show_in_leaderboard: local.privacy.showInLeaderboard,
    });
    return;
  }

  // Remote exists — apply to local
  writeLocalPreferences({
    theme: remote.theme,
    reduce_motion: remote.reduce_motion,
    notifications: {
      studyReminder: remote.notif_study_reminder,
      taskReminder: remote.notif_task_reminder,
      leaderboard: remote.notif_leaderboard,
      chatMentions: remote.notif_chat_mentions,
    },
    privacy: {
      showProfile: remote.privacy_show_profile,
      showStats: remote.privacy_show_stats,
      showInLeaderboard: remote.privacy_show_in_leaderboard,
    },
  });
}

export function subscribeToPreferenceChanges(userId: string, onChange: () => void) {
  return supabase
    .channel(`user_preferences:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_preferences',
      filter: `user_id=eq.${userId}`,
    }, () => onChange())
    .subscribe();
}
