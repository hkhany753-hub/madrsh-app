import { useRef, useState } from 'react';
import { Upload, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AvatarProps {
  url: string | null | undefined;
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ url, name, size = 40, className = '' }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
    : '';

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'avatar'}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover border border-border ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className={`rounded-full bg-surface-2 border border-border flex items-center justify-center text-zinc-400 font-semibold ${className}`}
    >
      {initials || <User size={size * 0.5} />}
    </div>
  );
}

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  size?: number;
}

export function AvatarUpload({ userId, currentUrl, onUploaded, size = 100 }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => inputRef.current?.click()}
        className="relative group"
        style={{ width: size, height: size }}
      >
        <Avatar url={currentUrl} size={size} className="group-hover:opacity-50 transition-base" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-base">
          <Upload size={size * 0.25} className="text-white" />
        </div>
      </button>
      {uploading && (
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
    </div>
  );
}
