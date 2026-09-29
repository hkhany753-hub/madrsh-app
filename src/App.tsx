import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/pages/AuthPage';
import { LandingPage } from '@/pages/LandingPage';
import { Layout, type PageKey } from '@/components/Layout';
import { FullPageLoader } from '@/components/ui';
import { CursorGlow } from '@/components/CursorGlow';
import { DashboardPage } from '@/pages/DashboardPage';
import { LogActivityPage } from '@/pages/LogActivityPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { TodayTasksPage } from '@/pages/TodayTasksPage';
import { StatsPage } from '@/pages/StatsPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { StudyRoomPage } from '@/pages/StudyRoomPage';
import { ChatPage } from '@/pages/ChatPage';
import { ExamPage } from '@/pages/ExamPage';
import { ToolsPage } from '@/pages/ToolsPage';
import { SearchPage } from '@/pages/SearchPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SupportPage } from '@/pages/SupportPage';
import { AIPage } from '@/pages/AIPage';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return <FullPageLoader />;
  }

  if (!session) {
    if (showAuth) {
      return <AuthPage onBack={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <DashboardPage onNavigate={setPage} />;
      case 'log-activity':
        return <LogActivityPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'today-tasks':
        return <TodayTasksPage />;
      case 'stats':
        return <StatsPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'study-room':
        return <StudyRoomPage />;
      case 'chat':
        return <ChatPage />;
      case 'ai':
        return <AIPage />;
      case 'exam':
        return <ExamPage />;
      case 'tools':
        return <ToolsPage />;
      case 'search':
        return <SearchPage onNavigate={setPage} />;
      case 'profile':
        return <ProfilePage onNavigate={setPage} />;
      case 'settings':
        return <SettingsPage />;
      case 'support':
        return <SupportPage />;
      default:
        return <DashboardPage onNavigate={setPage} />;
    }
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <CursorGlow />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
