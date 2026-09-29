import { useEffect, useState } from 'react';
import { User, Lock, Bell, Palette, Shield, LogOut, Check } from 'lucide-react';
import {
  loadRemotePreferences,
  upsertRemotePreferences,
  syncPreferencesFromRemote,
  subscribeToPreferenceChanges,
} from '@/lib/preferences-service';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui';
import { Button, Input } from '@/components/Form';
import { AvatarUpload } from '@/components/Avatar';

export type ThemeKey =
  | 'neon-purple' | 'ocean' | 'dawn' | 'sunset' | 'mint' | 'spring'
  | 'peach-kitty' | 'batman' | 'dark' | 'cedar' | 'paper' | 'coffee-night'
  | 'midnight' | 'slate' | 'neon' | 'forest' | 'ice' | 'galaxy'
  | 'amber-glow' | 'sky' | 'matte-black' | 'cyberpunk' | 'focus'
  | 'chocolate' | 'lavender' | 'minimal'
  | 'desert' | 'ruby';

interface ThemeDef {
  key: ThemeKey;
  label: string;
  emoji: string;
  desc: string;
  preview: string;
  isLight: boolean;
}

// Theme → background image mapping. Only themes whose image file actually
// exists in public/themes/ are listed here. To add a new theme image, drop
// the file in public/themes/ and add one line to this map.
const THEME_BG_IMAGES: Partial<Record<ThemeKey, string>> = {
  'neon-purple': '/themes/neon-purple-background.jpeg',
  ocean: '/themes/ocean-background.jpeg',
  dawn: '/themes/dawn-background.jpeg',
  sunset: '/themes/sunset-background.jpeg',
  mint: '/themes/mint-background.jpeg',
  // spring: '/themes/spring-background.jpeg',
  // 'peach-kitty': '/themes/peach-background.jpeg',
  // batman: '/themes/batman-background.jpeg',
  // dark: '/themes/dark-background.jpeg',
  // cedar: '/themes/cypress-background.jpeg',
};

const THEMES: ThemeDef[] = [
  { key: 'neon-purple', label: 'بنفش نئون', emoji: '💜', desc: 'بنفش + آبی نئونی', preview: 'linear-gradient(135deg, #0d0a1a, #1f1936)', isLight: false },
  { key: 'ocean', label: 'اقیانوس', emoji: '🌊', desc: 'آبی دریایی + فیروزه‌ای', preview: 'linear-gradient(135deg, #062c3a, #0e4d68)', isLight: false },
  { key: 'dawn', label: 'سپیده', emoji: '🌤️', desc: 'سفید گرم + آبی ملایم', preview: 'linear-gradient(135deg, #faf8f3, #f0eee8)', isLight: true },
  { key: 'sunset', label: 'غروب', emoji: '🌅', desc: 'نارنجی + قرمز + بنفش', preview: 'linear-gradient(135deg, #2a1810, #4a3020)', isLight: false },
  { key: 'mint', label: 'نعنایی', emoji: '🌿', desc: 'سبز نعنایی + سفید', preview: 'linear-gradient(135deg, #f0faf4, #e0f5e8)', isLight: true },
  { key: 'spring', label: 'گل‌بهاری', emoji: '🌸', desc: 'صورتی + یاسی + سبز', preview: 'linear-gradient(135deg, #fdf0f5, #f5e0ec)', isLight: true },
  { key: 'peach-kitty', label: 'هلو کیتی', emoji: '🎀', desc: 'صورتی + سفید + قرمز', preview: 'linear-gradient(135deg, #fff5f5, #ffe8e8)', isLight: true },
  { key: 'batman', label: 'بتمنی', emoji: '🦇', desc: 'مشکی + زرد + خاکستری', preview: 'linear-gradient(135deg, #0a0a0a, #1e1e10)', isLight: false },
  { key: 'dark', label: 'تاریک', emoji: '🌑', desc: 'مشکی/خاکستری + سفید', preview: 'linear-gradient(135deg, #0a0a0b, #1a1a1f)', isLight: false },
  { key: 'cedar', label: 'سرو', emoji: '🌲', desc: 'سبز تیره + کرم', preview: 'linear-gradient(135deg, #1a2a1a, #2e4230)', isLight: false },
  { key: 'paper', label: 'کاغذی', emoji: '📜', desc: 'کرم + قهوه‌ای + خاکستری', preview: 'linear-gradient(135deg, #f5f0e0, #ede5d0)', isLight: true },
  { key: 'coffee-night', label: 'قهوه شب', emoji: '☕', desc: 'قهوه‌ای + کرم + طلایی', preview: 'linear-gradient(135deg, #1e1410, #352620)', isLight: false },
  { key: 'midnight', label: 'نیمه‌شب', emoji: '🌙', desc: 'سرمه‌ای + آبی + بنفش', preview: 'linear-gradient(135deg, #0a0e1a, #182040)', isLight: false },
  { key: 'slate', label: 'سنگ‌لوح', emoji: '🪨', desc: 'خاکستری تیره + روشن', preview: 'linear-gradient(135deg, #1e1e22, #353540)', isLight: false },
  { key: 'neon', label: 'نئون', emoji: '⚡', desc: 'مشکی + سبز/آبی نئونی', preview: 'linear-gradient(135deg, #050505, #101010)', isLight: false },
  { key: 'forest', label: 'جنگل', emoji: '🍃', desc: 'سبز جنگلی + قهوه‌ای', preview: 'linear-gradient(135deg, #1a2818, #2e4230)', isLight: false },
  { key: 'ice', label: 'یخچال', emoji: '❄️', desc: 'سفید + آبی یخی', preview: 'linear-gradient(135deg, #f0f8ff, #e0f0fa)', isLight: true },
  { key: 'galaxy', label: 'کهکشانی', emoji: '🌌', desc: 'سرمه‌ای + بنفش + صورتی', preview: 'linear-gradient(135deg, #0a0a1e, #1e1e42)', isLight: false },
  { key: 'amber-glow', label: 'کهربایی', emoji: '🧡', desc: 'کرم + نارنجی + قهوه‌ای', preview: 'linear-gradient(135deg, #f5ede0, #ede0c8)', isLight: true },
  { key: 'sky', label: 'آسمان', emoji: '🩵', desc: 'آبی آسمانی + سفید', preview: 'linear-gradient(135deg, #e8f4ff, #d8ecfa)', isLight: true },
  { key: 'matte-black', label: 'مشکی مات', emoji: '🖤', desc: 'مشکی مات + خاکستری', preview: 'linear-gradient(135deg, #0c0c0c, #202020)', isLight: false },
  { key: 'cyberpunk', label: 'سایبرپانک', emoji: '🧪', desc: 'مشکی + بنفش نئونی', preview: 'linear-gradient(135deg, #0a0014, #1e0028)', isLight: false },
  { key: 'focus', label: 'تمرکز', emoji: '🧠', desc: 'خاکستری روشن + آبی تیره', preview: 'linear-gradient(135deg, #f5f5f5, #ebebeb)', isLight: true },
  { key: 'chocolate', label: 'شکلاتی', emoji: '🍫', desc: 'قهوه‌ای + کرم + طلایی', preview: 'linear-gradient(135deg, #2a1a10, #4a3520)', isLight: false },
  { key: 'lavender', label: 'لاوندر', emoji: '🌺', desc: 'یاسی + سفید + بنفش', preview: 'linear-gradient(135deg, #f5f0fa, #ebe0f5)', isLight: true },
  { key: 'minimal', label: 'مینیمال', emoji: '🩶', desc: 'سفید + خاکستری', preview: 'linear-gradient(135deg, #fafafa, #f0f0f0)', isLight: true },
  { key: 'desert', label: 'کویر', emoji: '🏜️', desc: 'شن گرم + کرم + کهربایی', preview: 'linear-gradient(135deg, #f5ede0, #e8dcc8)', isLight: true },
  { key: 'ruby', label: 'یاقوتی', emoji: '🌹', desc: 'قرمز یاقوتی + بورگوندی + مشکی', preview: 'linear-gradient(135deg, #1a0a0e, #2a1018)', isLight: false },
];

export function SettingsPage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [studyGoal, setStudyGoal] = useState(profile?.study_goal || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Notifications (local state, stored in localStorage)
  const [notifications, setNotifications] = useState({
    studyReminder: true,
    taskReminder: true,
    leaderboard: false,
    chatMentions: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Appearance
  const [theme, setTheme] = useState<ThemeKey>('dark');
  const [reduceMotion, setReduceMotion] = useState(false);

  // Privacy
  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showStats: true,
    showInLeaderboard: true,
  });
  const [privacySaved, setPrivacySaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setUsername(profile.username);
    setStudyGoal(profile.study_goal || '');
    setAvatarUrl(profile.avatar_url);
  }, [profile]);

  useEffect(() => {
    // Load preferences from localStorage first (fast local render)
    const savedNotif = localStorage.getItem('madrsh-notifications');
    if (savedNotif) setNotifications(JSON.parse(savedNotif));
    const savedTheme = localStorage.getItem('madrsh-theme') as ThemeKey | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    } else {
      document.documentElement.dataset.theme = 'dark';
    }
    const savedMotion = localStorage.getItem('madrsh-reduce-motion');
    if (savedMotion) {
      setReduceMotion(savedMotion === 'true');
      if (savedMotion === 'true') document.documentElement.dataset.reduceMotion = 'true';
    }
    const savedPrivacy = localStorage.getItem('madrsh-privacy');
    if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));

    // Then sync from backend so preferences follow the user across platforms
    if (!user) return;
    (async () => {
      await syncPreferencesFromRemote(user.id);
      const remote = await loadRemotePreferences(user.id);
      if (remote) {
        setTheme(remote.theme as ThemeKey);
        setReduceMotion(remote.reduce_motion);
        setNotifications({
          studyReminder: remote.notif_study_reminder,
          taskReminder: remote.notif_task_reminder,
          leaderboard: remote.notif_leaderboard,
          chatMentions: remote.notif_chat_mentions,
        });
        setPrivacy({
          showProfile: remote.privacy_show_profile,
          showStats: remote.privacy_show_stats,
          showInLeaderboard: remote.privacy_show_in_leaderboard,
        });
      }
    })();

    // Realtime: if another platform changes prefs, update here too
    const sub = subscribeToPreferenceChanges(user.id, () => {
      (async () => {
        const remote = await loadRemotePreferences(user.id);
        if (remote) {
          setTheme(remote.theme as ThemeKey);
          setReduceMotion(remote.reduce_motion);
          setNotifications({
            studyReminder: remote.notif_study_reminder,
            taskReminder: remote.notif_task_reminder,
            leaderboard: remote.notif_leaderboard,
            chatMentions: remote.notif_chat_mentions,
          });
          setPrivacy({
            showProfile: remote.privacy_show_profile,
            showStats: remote.privacy_show_stats,
            showInLeaderboard: remote.privacy_show_in_leaderboard,
          });
        }
      })();
    });

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user]);

  async function saveProfile() {
    setSavingProfile(true);
    await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        username,
        study_goal: studyGoal,
        avatar_url: avatarUrl,
      })
      .eq('id', user!.id);
    await refreshProfile();
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  async function changePassword() {
    setPasswordMsg(null);
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'هر دو فیلد را پر کنید' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'رمز جدید حداقل ۶ کاراکتر باید باشد' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSavingPassword(false);
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message });
    } else {
      setPasswordMsg({ type: 'success', text: 'رمز عبور با موفقیت تغییر کرد' });
      setCurrentPassword('');
      setNewPassword('');
    }
  }

  function saveNotifications() {
    localStorage.setItem('madrsh-notifications', JSON.stringify(notifications));
    if (user) {
      upsertRemotePreferences(user.id, {
        notif_study_reminder: notifications.studyReminder,
        notif_task_reminder: notifications.taskReminder,
        notif_leaderboard: notifications.leaderboard,
        notif_chat_mentions: notifications.chatMentions,
      }).catch(() => {});
    }
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  }

  function applyTheme(t: ThemeKey) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('madrsh-theme', t);
    if (user) {
      upsertRemotePreferences(user.id, { theme: t }).catch(() => {});
    }
  }

  function applyReduceMotion(v: boolean) {
    if (v) document.documentElement.dataset.reduceMotion = 'true';
    else delete document.documentElement.dataset.reduceMotion;
    localStorage.setItem('madrsh-reduce-motion', String(v));
    if (user) {
      upsertRemotePreferences(user.id, { reduce_motion: v }).catch(() => {});
    }
  }

  function savePrivacy() {
    localStorage.setItem('madrsh-privacy', JSON.stringify(privacy));
    if (user) {
      upsertRemotePreferences(user.id, {
        privacy_show_profile: privacy.showProfile,
        privacy_show_stats: privacy.showStats,
        privacy_show_in_leaderboard: privacy.showInLeaderboard,
      }).catch(() => {});
    }
    setPrivacySaved(true);
    setTimeout(() => setPrivacySaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">تنظیمات</h1>
        <p className="text-sm text-zinc-400 mt-1">حساب کاربری و ترجیحات خود را مدیریت کنید</p>
      </div>

      {/* Account */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <User size={18} className="text-primary" />
          حساب کاربری
        </h3>
        <div className="flex items-center gap-4 mb-5">
          <AvatarUpload
            userId={user!.id}
            currentUrl={avatarUrl}
            onUploaded={setAvatarUrl}
            size={80}
          />
          <div>
            <p className="text-sm text-white font-semibold">{profile?.display_name}</p>
            <p className="text-xs text-zinc-500">برای تغییر تصویر روی آن کلیک کنید</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">نام نمایشی</label>
            <Input value={displayName} onChange={setDisplayName} placeholder="نام..." />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">نام کاربری</label>
            <Input value={username} onChange={setUsername} placeholder="username" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">هدف مطالعه</label>
            <Input value={studyGoal} onChange={setStudyGoal} placeholder="مثلاً: قبولی کنکور علوم انسانی" />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} fullWidth>
            {savingProfile ? 'در حال ذخیره...' : profileSaved ? (
              <><Check size={18} /> ذخیره شد</>
            ) : 'ذخیره تغییرات'}
          </Button>
        </div>
      </Card>

      {/* Password */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Lock size={18} className="text-amber-400" />
          تغییر رمز عبور
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">رمز فعلی</label>
            <Input type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">رمز جدید</label>
            <Input type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
          </div>
          {passwordMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {passwordMsg.text}
            </div>
          )}
          <Button onClick={changePassword} disabled={savingPassword} fullWidth variant="secondary">
            {savingPassword ? 'در حال تغییر...' : 'تغییر رمز'}
          </Button>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Bell size={18} className="text-cyan-400" />
          اعلان‌ها
        </h3>
        <div className="space-y-3">
          {[
            { key: 'studyReminder' as const, label: 'یادآوری مطالعه روزانه' },
            { key: 'taskReminder' as const, label: 'یادآوری کارهای امروز' },
            { key: 'leaderboard' as const, label: 'به‌روزرسانی برترین‌ها' },
            { key: 'chatMentions' as const, label: 'اشاره در گفت‌وگو' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-zinc-300">{item.label}</span>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`w-12 h-6 rounded-full transition-base relative ${
                  notifications[item.key] ? 'bg-primary' : 'bg-surface-2'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    notifications[item.key] ? 'left-0.5' : 'right-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
          <Button onClick={saveNotifications} variant="secondary" fullWidth>
            {notifSaved ? <><Check size={18} /> ذخیره شد</> : 'ذخیره اعلان‌ها'}
          </Button>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Palette size={18} className="text-rose-400" />
          ظاهر
        </h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-3">تم پس‌زمینه</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setTheme(t.key);
                    applyTheme(t.key);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border interactive ${
                    theme === t.key ? 'border-primary ring-1 ring-primary bg-surface-2' : 'border-border'
                  }`}
                >
                  <div
                    className={`relative w-full min-h-[92px] overflow-hidden rounded-lg border border-white/10 ${
                      THEME_BG_IMAGES[t.key] ? '' : 'bg-surface-2'
                    }`}
                    style={
                      THEME_BG_IMAGES[t.key]
                        ? {
                            backgroundImage: `url("${THEME_BG_IMAGES[t.key]}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                          }
                        : { background: t.preview }
                    }
                  >
                    {THEME_BG_IMAGES[t.key] && (
                      <div className="absolute inset-0 bg-black/10" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base">{t.emoji}</span>
                    <span className="text-sm text-zinc-300 font-semibold">{t.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 text-center leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between cursor-pointer pt-1">
            <div>
              <span className="text-sm text-zinc-300 block">کاهش انیمیشن‌ها</span>
              <span className="text-xs text-zinc-500">برای حس ساده‌تر و سریع‌تر</span>
            </div>
            <button
              onClick={() => {
                setReduceMotion((v) => {
                  const next = !v;
                  applyReduceMotion(next);
                  return next;
                });
              }}
              className={`w-12 h-6 rounded-full transition-base relative ${
                reduceMotion ? 'bg-primary' : 'bg-surface-2'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  reduceMotion ? 'left-0.5' : 'right-0.5'
                }`}
              />
            </button>
          </label>

        </div>
      </Card>

      {/* Privacy */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Shield size={18} className="text-emerald-400" />
          حریم خصوصی
        </h3>
        <div className="space-y-3">
          {[
            { key: 'showProfile' as const, label: 'نمایش پروفایل به دیگران' },
            { key: 'showStats' as const, label: 'نمایش آمار به دیگران' },
            { key: 'showInLeaderboard' as const, label: 'حضور در برترین‌ها' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-zinc-300">{item.label}</span>
              <button
                onClick={() => setPrivacy((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`w-12 h-6 rounded-full transition-base relative ${
                  privacy[item.key] ? 'bg-primary' : 'bg-surface-2'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    privacy[item.key] ? 'left-0.5' : 'right-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
          <Button onClick={savePrivacy} variant="secondary" fullWidth>
            {privacySaved ? <><Check size={18} /> ذخیره شد</> : 'ذخیره تنظیمات حریم خصوصی'}
          </Button>
        </div>
      </Card>

      {/* Sign out */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <LogOut size={18} className="text-red-400" />
          خروج از حساب
        </h3>
        <Button variant="danger" onClick={signOut} fullWidth>
          <LogOut size={18} />
          خروج از حساب کاربری
        </Button>
      </Card>
    </div>
  );
}
