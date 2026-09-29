import { useRef, useState, memo } from 'react';
import { Send, ImagePlus, Loader2 } from 'lucide-react';

interface AIChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder: string;
}

function AIChatInputBase({ onSend, disabled, placeholder }: AIChatInputProps) {
  const [text, setText] = useState('');
  const textRef = useRef('');

  // Keep ref synced — this protects the text from parent re-renders
  textRef.current = text;

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <div className="p-4 border-t border-border bg-surface/50 backdrop-blur-sm">
      <div className="flex items-end gap-2">
        <button
          className="p-2.5 rounded-xl interactive text-zinc-400 hover:text-primary shrink-0 transition-base"
          title="ارسال تصویر (به‌زودی)"
        >
          <ImagePlus size={20} />
        </button>
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm placeholder:text-zinc-500 focus:border-primary focus:outline-none transition-base resize-none max-h-32 disabled:opacity-50"
            style={{ minHeight: '48px' }}
        />
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="p-3 rounded-xl bg-primary interactive text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 transition-base"
        >
          {disabled ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}

export const AIChatInput = memo(AIChatInputBase);
