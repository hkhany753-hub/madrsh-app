import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Send,
  Image as ImageIcon,
  Users,
  MessageSquare,
  Plus,
  ArrowRight,
  Search,
  Hash,
  Lock,
  User as UserIcon,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { Button, Input } from '@/components/Form';
import { Modal } from '@/components/Modal';
import { Avatar } from '@/components/Avatar';
import { formatTime, relativeTime, toPersianDigits } from '@/lib/jalali';
import type { ChatConversation, ChatMessage, Profile, ConversationMember } from '@/lib/types';

const PUBLIC_CONV_ID = '00000000-0000-0000-0000-000000000001';

export function ChatPage() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<(ChatConversation & { other_profile?: Profile })[]>([]);
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Composer state — isolated from message updates
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatType, setNewChatType] = useState<'group' | 'direct'>('direct');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeConvRef = useRef<ChatConversation | null>(null);
  const inputTextRef = useRef('');

  // Keep refs in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { inputTextRef.current = inputText; }, [inputText]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    // Get public conversation
    const { data: publicConv } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('type', 'public')
      .maybeSingle();

    // Get conversations where user is a member
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    const memberConvIds = (memberships || []).map((m: { conversation_id: string }) => m.conversation_id);

    // Get conversations created by user
    const { data: ownedConvs } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('created_by', user.id);

    const allConvIds = new Set([...memberConvIds, ...(ownedConvs || []).map((c: ChatConversation) => c.id)]);
    if (publicConv) allConvIds.add(publicConv.id);

    let convs: ChatConversation[] = [];
    if (allConvIds.size > 0) {
      const { data: convData } = await supabase
        .from('chat_conversations')
        .select('*')
        .in('id', Array.from(allConvIds));
      convs = (convData as ChatConversation[]) || [];
    }

    // For direct conversations, get the other user's profile
    const convsWithProfiles = await Promise.all(
      convs.map(async (conv) => {
        if (conv.type === 'direct') {
          const { data: otherMember } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .maybeSingle();

          if (otherMember) {
            const { data: otherProf } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', (otherMember as { user_id: string }).user_id)
              .maybeSingle();
            return { ...conv, other_profile: otherProf as Profile };
          }
          // If no other member yet, check if creator is the other person
          if (conv.created_by !== user.id) {
            const { data: creatorProf } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', conv.created_by)
              .maybeSingle();
            return { ...conv, other_profile: creatorProf as Profile };
          }
        }
        return conv;
      })
    );

    setConversations(convsWithProfiles);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100);

    // Load profiles for each unique user
    const msgData = (data as ChatMessage[]) || [];
    const userIds = Array.from(new Set(msgData.map((m) => m.user_id)));
    const profileMap = new Map<string, Profile>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      (profiles || []).forEach((p: Profile) => profileMap.set(p.id, p));
    }
    const msgsWithProfiles = msgData.map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id),
    }));

    setMessages(msgsWithProfiles);
    setLoadingMessages(false);
  }, []);

  // Realtime subscription for messages
  useEffect(() => {
    if (!activeConv) return;

    const channel = supabase
      .channel(`chat-${activeConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConv.id}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Load profile for the new message
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.user_id)
            .maybeSingle();

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, profile: prof as Profile }];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-join public conversation
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function joinPublic() {
      const { data: existing } = await supabase
        .from('conversation_members')
        .select('id')
        .eq('conversation_id', PUBLIC_CONV_ID)
        .eq('user_id', userId)
        .maybeSingle();
      if (!existing) {
        await supabase.from('conversation_members').insert({
          conversation_id: PUBLIC_CONV_ID,
          user_id: userId,
        });
      }
      await loadConversations();
    }
    joinPublic();
  }, [user, loadConversations]);

  async function sendMessage() {
    if (!activeConv || !user) return;
    const text = inputText.trim();
    if (!text) return;

    setSending(true);
    setInputText(''); // Clear input immediately

    const { data } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConv.id,
        user_id: user.id,
        content: text,
        status: 'sent',
      })
      .select()
      .single();

    // Optimistically add to messages if not from realtime yet
    if (data) {
      const newMsg = { ...(data as ChatMessage), profile: profile as Profile };
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    }

    setSending(false);
  }

  async function sendImage(file: File) {
    if (!activeConv || !user) return;

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('chat-images').upload(path, file);
    if (upErr) return;

    const { data } = supabase.storage.from('chat-images').getPublicUrl(path);

    const { data: msgData } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConv.id,
        user_id: user.id,
        content: '',
        image_url: data.publicUrl,
        status: 'sent',
      })
      .select()
      .single();

    if (msgData) {
      const newMsg = { ...(msgData as ChatMessage), profile: profile as Profile };
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    }
  }

  function openConversation(conv: ChatConversation & { other_profile?: Profile }) {
    setActiveConv(conv);
    loadMessages(conv.id);
  }

  // Search users for new chat
  async function searchUsers(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .neq('id', user!.id)
      .limit(10);
    setSearchResults((data as Profile[]) || []);
  }

  async function createDirectChat(otherUser: Profile) {
    if (!user) return;

    // Check if a direct conversation already exists between these two users
    const { data: existingMemberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existingMemberships && existingMemberships.length > 0) {
      for (const m of existingMemberships as { conversation_id: string }[]) {
        const { data: conv } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('id', m.conversation_id)
          .eq('type', 'direct')
          .maybeSingle();
        if (conv) {
          const { data: otherMember } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', m.conversation_id)
            .neq('user_id', user.id)
            .maybeSingle();
          if (otherMember && (otherMember as { user_id: string }).user_id === otherUser.id) {
            // Found existing direct chat
            openConversation(conv as ChatConversation);
            setShowNewChat(false);
            setSelectedUser(null);
            setSearchQuery('');
            setSearchResults([]);
            return;
          }
        }
      }
    }

    // Create new direct conversation
    const { data: newConv } = await supabase
      .from('chat_conversations')
      .insert({
        type: 'direct',
        name: '',
        created_by: user.id,
      })
      .select()
      .single();

    if (newConv) {
      // Add both members
      await supabase.from('conversation_members').insert([
        { conversation_id: (newConv as ChatConversation).id, user_id: user.id },
        { conversation_id: (newConv as ChatConversation).id, user_id: otherUser.id },
      ]);
      openConversation({ ...(newConv as ChatConversation), other_profile: otherUser });
      setShowNewChat(false);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      loadConversations();
    }
  }

  async function createGroupChat() {
    if (!user || !newChatName.trim()) return;
    setChatError(null);

    const { data: newConv, error: conversationError } = await supabase
      .from('chat_conversations')
      .insert({
        type: 'group',
        name: newChatName.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (conversationError || !newConv) {
      setChatError('ساخت گفت‌وگوی گروهی انجام نشد.');
      return;
    }

    const { error: memberError } = await supabase.from('conversation_members').insert({
      conversation_id: (newConv as ChatConversation).id,
      user_id: user.id,
    });
    if (memberError) {
      setChatError('گروه ساخته شد اما ورود شما به آن انجام نشد.');
      return;
    }

    openConversation(newConv as ChatConversation);
    setShowNewChat(false);
    setNewChatName('');
    await loadConversations();
  }

  function getConvDisplay(conv: ChatConversation & { other_profile?: Profile }): { name: string; icon: typeof Hash; avatar?: string | null; avatarName?: string } {
    if (conv.type === 'public') return { name: conv.name || 'چت عمومی', icon: Hash };
    if (conv.type === 'group') return { name: conv.name || 'گروه', icon: Users };
    // Direct
    return {
      name: conv.other_profile?.display_name || 'چت خصوصی',
      icon: UserIcon,
      avatar: conv.other_profile?.avatar_url,
      avatarName: conv.other_profile?.display_name,
    };
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Conversations sidebar */}
      <div className={`${activeConv ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 shrink-0`}>
        <Card className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">گفت‌وگوها</h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-lg interactive text-zinc-400 hover:text-primary"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map((conv) => {
              const display = getConvDisplay(conv);
              const Icon = display.icon;
              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl interactive ${
                    activeConv?.id === conv.id ? 'bg-primary-10 border border-primary-20' : 'border border-transparent'
                  }`}
                >
                  {conv.type === 'direct' ? (
                    <Avatar url={display.avatar} name={display.avatarName} size={40} />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      conv.type === 'public' ? 'bg-primary-10 text-primary' : 'bg-emerald-600/10 text-emerald-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-semibold text-white truncate">{display.name}</p>
                    <p className="text-xs text-zinc-500">
                      {conv.type === 'public' ? 'عمومی' : conv.type === 'group' ? 'گروه' : 'خصوصی'}
                    </p>
                  </div>
                </button>
              );
            })}
            {conversations.length === 0 && (
              <div className="text-center py-8 text-sm text-zinc-500">گفت‌وگویی موجود نیست</div>
            )}
          </div>
        </Card>
      </div>

      {/* Chat area */}
      <div className={`${activeConv ? 'flex' : 'hidden lg:flex'} flex-col flex-1`}>
        <Card className="flex flex-col flex-1 overflow-hidden">
          {activeConv ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <button
                  onClick={() => setActiveConv(null)}
                  className="lg:hidden p-1.5 rounded-lg interactive text-zinc-400"
                >
                  <ArrowRight size={20} />
                </button>
                {activeConv.type === 'direct' ? (
                  <Avatar
                    url={(conversations.find((c) => c.id === activeConv.id) as { other_profile?: Profile })?.other_profile?.avatar_url}
                    name={(conversations.find((c) => c.id === activeConv.id) as { other_profile?: Profile })?.other_profile?.display_name}
                    size={36}
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    activeConv.type === 'public' ? 'bg-primary-10 text-primary' : 'bg-emerald-600/10 text-emerald-400'
                  }`}>
                    {activeConv.type === 'public' ? <Hash size={18} /> : <Users size={18} />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {getConvDisplay(activeConv).name}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {activeConv.type === 'public' ? 'همه کاربران' : activeConv.type === 'group' ? 'گروه خصوصی' : 'گفت‌وگو خصوصی'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg/30">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size={28} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <EmptyState
                      icon={<MessageSquare size={28} />}
                      title="پیامی موجود نیست"
                      description="اولین پیام را ارسال کنید"
                    />
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.user_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} message-in`}
                      >
                        <Avatar
                          url={msg.profile?.avatar_url}
                          name={msg.profile?.display_name}
                          size={32}
                          className="mt-1 shrink-0"
                        />
                        <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!isMine && (
                            <span className="text-xs text-zinc-400 mb-1 px-2">
                              {msg.profile?.display_name || 'کاربر'}
                            </span>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2.5 ${
                              isMine
                                ? 'bg-primary text-white rounded-tl-sm'
                                : 'bg-surface-2 text-zinc-200 rounded-tr-sm'
                            }`}
                          >
                            {msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="image"
                                className="rounded-lg max-w-full max-h-60 mb-2"
                                loading="lazy"
                              />
                            )}
                            {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                          </div>
                          <div className={`flex items-center gap-1 px-2 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] text-zinc-500">{formatTime(new Date(msg.created_at))}</span>
                            {isMine && (
                              msg.status === 'sent' ? <CheckCheck size={14} className="text-primary" /> : <Check size={14} className="text-zinc-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer — isolated to prevent re-render issues */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl interactive text-zinc-400 hover:text-primary shrink-0"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) sendImage(file);
                      e.target.value = '';
                    }}
                  />
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="پیام بنویسید..."
                    className="flex-1 px-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm placeholder:text-zinc-500 focus:border-primary focus:outline-none transition-base"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !inputText.trim()}
                    className="p-3 rounded-xl bg-primary interactive text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <EmptyState
                icon={<MessageSquare size={32} />}
                title="یک گفت‌وگو انتخاب کنید"
                description="گفت‌وگوی خود را از لیست انتخاب کنید یا گفت‌وگوی جدیدی شروع کنید"
              />
            </div>
          )}
        </Card>
      </div>

      {/* New chat modal */}
      {chatError && (
        <div className="fixed bottom-5 left-5 z-50 max-w-sm rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 shadow-xl">
          {chatError}
        </div>
      )}

      <Modal open={showNewChat} onClose={() => { setShowNewChat(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); setChatError(null); }} title="گفت‌وگوی جدید">
        <div className="space-y-4">
          {/* Chat type selector */}
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl">
            <button
              onClick={() => setNewChatType('direct')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold interactive flex items-center justify-center gap-2 ${
                newChatType === 'direct' ? 'bg-primary text-white' : 'text-zinc-400'
              }`}
            >
              <Lock size={16} />
              خصوصی
            </button>
            <button
              onClick={() => setNewChatType('group')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold interactive flex items-center justify-center gap-2 ${
                newChatType === 'group' ? 'bg-primary text-white' : 'text-zinc-400'
              }`}
            >
              <Users size={16} />
              گروه
            </button>
          </div>

          {newChatType === 'direct' ? (
            <>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">جستجوی کاربر</label>
                <Input
                  value={searchQuery}
                  onChange={(v) => searchUsers(v)}
                  placeholder="نام یا نام کاربری..."
                  icon={<Search size={18} />}
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => createDirectChat(p)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl interactive"
                  >
                    <Avatar url={p.avatar_url} name={p.display_name} size={36} />
                    <div className="flex-1 text-right min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.display_name}</p>
                      <p className="text-xs text-zinc-500">@{p.username}</p>
                    </div>
                    <MessageSquare size={18} className="text-zinc-500" />
                  </button>
                ))}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-center text-sm text-zinc-500 py-4">کاربری یافت نشد</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">نام گروه</label>
                <Input
                  value={newChatName}
                  onChange={setNewChatName}
                  placeholder="نام گروه..."
                />
              </div>
              <Button fullWidth size="lg" onClick={createGroupChat} disabled={!newChatName.trim()}>
                ساخت گروه
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
