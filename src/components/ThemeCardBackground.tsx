import { useEffect, useState } from 'react';
import type { ThemeKey } from '@/pages/SettingsPage';

interface ThemeScene {
  bg: string;
  bgEnd: string;
  accent: string;
  accent2: string;
  text: string;
  overlay: string;
  character: CharacterType;
}

type CharacterType =
  | 'kitty' | 'bat' | 'moon' | 'wave' | 'sun' | 'leaf' | 'star'
  | 'bolt' | 'book' | 'snow' | 'flower' | 'coffee' | 'rock' | 'tree' | 'spark'
  | 'dune' | 'ruby-gem';

const THEME_SCENES: Record<ThemeKey, ThemeScene> = {
  'neon-purple': { bg: '#1a0a2e', bgEnd: '#2d1b4e', accent: '#a855f7', accent2: '#6366f1', text: '#e9d5ff', overlay: 'from-purple-900/70 via-purple-900/30', character: 'star' },
  ocean: { bg: '#062c3a', bgEnd: '#0e4d68', accent: '#06b6d4', accent2: '#0891b2', text: '#cffafe', overlay: 'from-blue-900/70 via-cyan-900/30', character: 'wave' },
  dawn: { bg: '#faf8f3', bgEnd: '#f0eee8', accent: '#f59e0b', accent2: '#fbbf24', text: '#92400e', overlay: 'from-amber-100/60 via-amber-50/20', character: 'sun' },
  sunset: { bg: '#2a1810', bgEnd: '#4a3020', accent: '#ea580c', accent2: '#dc2626', text: '#fed7aa', overlay: 'from-orange-950/70 via-red-950/30', character: 'sun' },
  mint: { bg: '#f0faf4', bgEnd: '#e0f5e8', accent: '#10b981', accent2: '#34d399', text: '#065f46', overlay: 'from-emerald-100/60 via-emerald-50/20', character: 'leaf' },
  spring: { bg: '#fdf0f5', bgEnd: '#f5e0ec', accent: '#ec4899', accent2: '#f472b6', text: '#9f1239', overlay: 'from-pink-100/60 via-rose-50/20', character: 'flower' },
  'peach-kitty': { bg: '#fff5f5', bgEnd: '#ffe8e8', accent: '#f87171', accent2: '#fb7185', text: '#9f1239', overlay: 'from-red-100/50 via-pink-50/20', character: 'kitty' },
  batman: { bg: '#0a0a0a', bgEnd: '#1e1e10', accent: '#facc15', accent2: '#eab308', text: '#fef08a', overlay: 'from-gray-950/80 via-yellow-950/30', character: 'bat' },
  dark: { bg: '#0a0a0b', bgEnd: '#1a1a1f', accent: '#3b82f6', accent2: '#60a5fa', text: '#bfdbfe', overlay: 'from-gray-900/70 via-gray-900/30', character: 'moon' },
  cedar: { bg: '#1a2a1a', bgEnd: '#2e4230', accent: '#65a30d', accent2: '#84cc16', text: '#d9f99d', overlay: 'from-green-950/70 via-green-900/30', character: 'tree' },
  paper: { bg: '#f5f0e0', bgEnd: '#ede5d0', accent: '#a8896a', accent2: '#92704e', text: '#5b4a35', overlay: 'from-amber-100/60 via-yellow-100/20', character: 'book' },
  'coffee-night': { bg: '#1e1410', bgEnd: '#352620', accent: '#d4a056', accent2: '#b8860b', text: '#f5d49a', overlay: 'from-amber-950/70 via-yellow-950/30', character: 'coffee' },
  midnight: { bg: '#0a0e1a', bgEnd: '#182040', accent: '#6366f1', accent2: '#818cf8', text: '#c7d2fe', overlay: 'from-indigo-950/70 via-blue-950/30', character: 'moon' },
  slate: { bg: '#1e1e22', bgEnd: '#353540', accent: '#94a3b8', accent2: '#cbd5e1', text: '#e2e8f0', overlay: 'from-slate-800/70 via-slate-700/30', character: 'rock' },
  neon: { bg: '#050505', bgEnd: '#101010', accent: '#00ff88', accent2: '#22c55e', text: '#bbf7d0', overlay: 'from-green-950/70 via-black/30', character: 'bolt' },
  forest: { bg: '#1a2818', bgEnd: '#2e4230', accent: '#84cc16', accent2: '#a3e635', text: '#d9f99d', overlay: 'from-green-950/70 via-green-900/30', character: 'tree' },
  ice: { bg: '#f0f8ff', bgEnd: '#e0f0fa', accent: '#0ea5e9', accent2: '#38bdf8', text: '#0c4a6e', overlay: 'from-sky-100/60 via-blue-100/20', character: 'snow' },
  galaxy: { bg: '#0a0a1e', bgEnd: '#1e1e42', accent: '#a855f7', accent2: '#ec4899', text: '#f0abfc', overlay: 'from-indigo-950/70 via-purple-950/30', character: 'star' },
  'amber-glow': { bg: '#f5ede0', bgEnd: '#ede0c8', accent: '#d97706', accent2: '#f59e0b', text: '#92400e', overlay: 'from-amber-100/60 via-orange-100/20', character: 'sun' },
  sky: { bg: '#e8f4ff', bgEnd: '#d8ecfa', accent: '#3b82f6', accent2: '#60a5fa', text: '#1e40af', overlay: 'from-blue-100/60 via-sky-100/20', character: 'wave' },
  'matte-black': { bg: '#0c0c0c', bgEnd: '#202020', accent: '#e4e4e7', accent2: '#a1a1aa', text: '#fafafa', overlay: 'from-black/80 via-zinc-900/30', character: 'spark' },
  cyberpunk: { bg: '#0a0014', bgEnd: '#1e0028', accent: '#ec4899', accent2: '#a855f7', text: '#f5d0fe', overlay: 'from-fuchsia-950/70 via-purple-950/30', character: 'bolt' },
  focus: { bg: '#f5f5f5', bgEnd: '#ebebeb', accent: '#1e3a5f', accent2: '#3b82f6', text: '#1e3a5f', overlay: 'from-slate-200/60 via-slate-100/20', character: 'book' },
  chocolate: { bg: '#2a1a10', bgEnd: '#4a3520', accent: '#d4a056', accent2: '#c08040', text: '#f5d49a', overlay: 'from-amber-950/70 via-yellow-950/30', character: 'coffee' },
  lavender: { bg: '#f5f0fa', bgEnd: '#ebe0f5', accent: '#8b5cf6', accent2: '#a78bfa', text: '#5b21b6', overlay: 'from-violet-100/60 via-purple-100/20', character: 'flower' },
  minimal: { bg: '#fafafa', bgEnd: '#f0f0f0', accent: '#52525b', accent2: '#71717a', text: '#27272a', overlay: 'from-zinc-200/60 via-zinc-100/20', character: 'spark' },
  desert: { bg: '#f5ede0', bgEnd: '#e8dcc8', accent: '#c8965a', accent2: '#d4a06a', text: '#4a3a28', overlay: 'from-amber-100/50 via-amber-50/20', character: 'dune' },
  ruby: { bg: '#1a0a0e', bgEnd: '#2a1018', accent: '#c41e3a', accent2: '#8b1538', text: '#f5d0d0', overlay: 'from-red-950/70 via-rose-950/30', character: 'ruby-gem' },
};

function CharacterSVG({ type, accent, accent2 }: { type: CharacterType; accent: string; accent2: string }) {
  switch (type) {
    case 'kitty':
      return (
        <g>
          <ellipse cx="100" cy="120" rx="42" ry="38" fill="#fff" />
          <path d="M68 88 L60 68 L78 82 Z" fill="#fff" />
          <path d="M132 88 L140 68 L122 82 Z" fill="#fff" />
          <path d="M70 86 L66 74 L76 82 Z" fill={accent} />
          <path d="M130 86 L134 74 L124 82 Z" fill={accent} />
          <ellipse cx="86" cy="116" rx="4" ry="6" fill="#1a1a1a" />
          <ellipse cx="114" cy="116" rx="4" ry="6" fill="#1a1a1a" />
          <ellipse cx="100" cy="128" rx="4" ry="3" fill={accent} />
          <path d="M93 132 Q100 138 107 132" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <line x1="78" y1="128" x2="66" y2="124" stroke="#1a1a1a" strokeWidth="1.5" />
          <line x1="78" y1="132" x2="66" y2="134" stroke="#1a1a1a" strokeWidth="1.5" />
          <line x1="122" y1="128" x2="134" y2="124" stroke="#1a1a1a" strokeWidth="1.5" />
          <line x1="122" y1="132" x2="134" y2="134" stroke="#1a1a1a" strokeWidth="1.5" />
          <path d="M60 155 Q100 145 140 155 L140 180 L60 180 Z" fill={accent} opacity="0.8" />
        </g>
      );
    case 'bat':
      return (
        <g>
          <path d="M100 75 Q70 80 55 100 Q45 115 50 135 Q60 130 70 125 Q80 135 90 130 Q95 120 100 118 Q105 120 110 130 Q120 135 130 125 Q140 130 150 135 Q155 115 145 100 Q130 80 100 75Z" fill="#1a1a1a" />
          <path d="M88 92 L82 85 L90 90Z M112 92 L118 85 L110 90Z" fill={accent} />
          <ellipse cx="90" cy="105" rx="5" ry="6" fill={accent} />
          <ellipse cx="110" cy="105" rx="5" ry="6" fill={accent} />
          <path d="M93 118 Q100 122 107 118" stroke={accent} strokeWidth="2" fill="none" />
          <path d="M70 145 Q100 140 130 145 L130 170 L70 170Z" fill="#1a1a1a" />
          <path d="M75 148 L85 165 M125 148 L115 165" stroke={accent} strokeWidth="2" />
        </g>
      );
    case 'moon':
      return (
        <g>
          <circle cx="100" cy="110" r="38" fill={accent} opacity="0.9" />
          <circle cx="108" cy="105" r="34" fill={undefined as unknown as string} opacity="0" />
          <path d="M100 72 a38 38 0 1 0 25 67 a32 32 0 0 1-25-67z" fill={accent} />
          <circle cx="88" cy="100" r="3" fill={accent2} opacity="0.5" />
          <circle cx="110" cy="115" r="4" fill={accent2} opacity="0.4" />
          <circle cx="95" cy="120" r="2" fill={accent2} opacity="0.3" />
          <path d="M65 160 Q100 150 135 160 L135 178 L65 178Z" fill={accent} opacity="0.6" />
          <circle cx="50" cy="50" r="1.5" fill={accent2} />
          <circle cx="155" cy="60" r="2" fill={accent2} />
          <circle cx="40" cy="90" r="1" fill={accent2} />
        </g>
      );
    case 'wave':
      return (
        <g>
          <path d="M55 95 Q70 80 85 95 T115 95 T145 95" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M55 110 Q70 95 85 110 T115 110 T145 110" stroke={accent2} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
          <circle cx="100" cy="130" r="28" fill={accent} opacity="0.85" />
          <path d="M82 125 Q100 115 118 125" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="128" r="3" fill="#fff" />
          <circle cx="112" cy="128" r="3" fill="#fff" />
          <path d="M65 165 Q100 155 135 165 L135 180 L65 180Z" fill={accent} opacity="0.5" />
        </g>
      );
    case 'sun':
      return (
        <g>
          <circle cx="100" cy="105" r="35" fill={accent} />
          <g stroke={accent2} strokeWidth="3" strokeLinecap="round">
            <line x1="100" y1="55" x2="100" y2="65" />
            <line x1="100" y1="145" x2="100" y2="155" />
            <line x1="50" y1="105" x2="60" y2="105" />
            <line x1="140" y1="105" x2="150" y2="105" />
            <line x1="65" y1="70" x2="72" y2="77" />
            <line x1="128" y1="133" x2="135" y2="140" />
            <line x1="135" y1="70" x2="128" y2="77" />
            <line x1="72" y1="133" x2="65" y2="140" />
          </g>
          <circle cx="88" cy="100" r="3" fill="#fff" opacity="0.8" />
          <circle cx="112" cy="100" r="3" fill="#fff" opacity="0.8" />
          <path d="M90 112 Q100 120 110 112" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M65 160 Q100 150 135 160 L135 180 L65 180Z" fill={accent} opacity="0.6" />
        </g>
      );
    case 'leaf':
      return (
        <g>
          <path d="M100 70 Q70 90 70 120 Q70 145 100 150 Q130 145 130 120 Q130 90 100 70Z" fill={accent} opacity="0.85" />
          <path d="M100 70 L100 150" stroke={accent2} strokeWidth="2" />
          <path d="M100 85 L82 95 M100 85 L118 95 M100 105 L78 115 M100 105 L122 115 M100 125 L85 135 M100 125 L115 135" stroke={accent2} strokeWidth="1.5" opacity="0.6" />
          <circle cx="88" cy="110" r="2.5" fill="#fff" />
          <circle cx="112" cy="110" r="2.5" fill="#fff" />
          <path d="M92 122 Q100 128 108 122" stroke="#fff" strokeWidth="1.5" fill="none" />
          <path d="M65 165 Q100 155 135 165 L135 180 L65 180Z" fill={accent} opacity="0.5" />
        </g>
      );
    case 'star':
      return (
        <g>
          <path d="M100 65 L108 88 L132 90 L113 107 L120 131 L100 118 L80 131 L87 107 L68 90 L92 88Z" fill={accent} />
          <circle cx="92" cy="98" r="3" fill="#fff" />
          <circle cx="108" cy="98" r="3" fill="#fff" />
          <path d="M93 110 Q100 116 107 110" stroke="#fff" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="2" fill={accent2} />
          <circle cx="150" cy="55" r="1.5" fill={accent2} />
          <circle cx="160" cy="100" r="2" fill={accent2} />
          <circle cx="40" cy="110" r="1.5" fill={accent2} />
          <path d="M65 160 Q100 150 135 160 L135 180 L65 180Z" fill={accent} opacity="0.5" />
        </g>
      );
    case 'bolt':
      return (
        <g>
          <path d="M95 65 L78 100 L92 100 L85 135 L115 100 L100 100 L110 65Z" fill={accent} />
          <path d="M95 65 L78 100 L92 100 L85 135 L115 100 L100 100 L110 65Z" fill={accent2} opacity="0.4" />
          <circle cx="88" cy="95" r="2.5" fill="#fff" />
          <circle cx="105" cy="95" r="2.5" fill="#fff" />
          <path d="M90 108 Q98 114 106 108" stroke="#fff" strokeWidth="1.5" fill="none" />
          <path d="M65 160 Q100 150 135 160 L135 180 L65 180Z" fill={accent} opacity="0.5" />
        </g>
      );
    case 'book':
      return (
        <g>
          <rect x="68" y="80" width="64" height="50" rx="4" fill={accent} opacity="0.9" />
          <rect x="68" y="80" width="64" height="8" rx="4" fill={accent2} />
          <line x1="100" y1="88" x2="100" y2="130" stroke={accent2} strokeWidth="2" opacity="0.5" />
          <line x1="78" y1="100" x2="92" y2="100" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
          <line x1="78" y1="108" x2="92" y2="108" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
          <line x1="78" y1="116" x2="88" y2="116" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
          <line x1="108" y1="100" x2="122" y2="100" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
          <line x1="108" y1="108" x2="122" y2="108" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
          <line x1="108" y1="116" x2="118" y2="116" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
          <circle cx="88" cy="140" r="2.5" fill="#fff" />
          <circle cx="112" cy="140" r="2.5" fill="#fff" />
          <path d="M92 150 Q100 156 108 150" stroke="#fff" strokeWidth="1.5" fill="none" />
          <path d="M65 165 Q100 155 135 165 L135 180 L65 180Z" fill={accent} opacity="0.5" />
        </g>
      );
    case 'snow':
      return (
        <g>
          <g stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.8">
            <line x1="100" y1="65" x2="100" y2="145" />
            <line x1="65" y1="105" x2="135" y2="105" />
            <line x1="75" y1="80" x2="125" y2="130" />
            <line x1="125" y1="80" x2="75" y2="130" />
          </g>
          <g stroke={accent2} strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
            <line x1="100" y1="70" x2="95" y2="75" /><line x1="100" y1="70" x2="105" y2="75" />
            <line x1="100" y1="140" x2="95" y2="135" /><line x1="100" y1="140" x2="105" y2="135" />
            <line x1="70" y1="105" x2="75" y2="100" /><line x1="70" y1="105" x2="75" y2="110" />
            <line x1="130" y1="105" x2="125" y2="100" /><line x1="130" y1="105" x2="125" y2="110" />
          </g>
          <circle cx="100" cy="105" r="8" fill={accent} opacity="0.3" />
          <circle cx="50" cy="50" r="2" fill={accent} opacity="0.5" />
          <circle cx="150" cy="60" r="1.5" fill={accent} opacity="0.4" />
          <circle cx="160" cy="120" r="2" fill={accent} opacity="0.5" />
          <circle cx="40" cy="130" r="1.5" fill={accent} opacity="0.4" />
          <path d="M65 165 Q100 155 135 165 L135 180 L65 180Z" fill={accent} opacity="0.4" />
        </g>
      );
    case 'flower':
      return (
        <g>
          <g fill={accent} opacity="0.85">
            <ellipse cx="100" cy="75" rx="12" ry="18" />
            <ellipse cx="100" cy="135" rx="12" ry="18" />
            <ellipse cx="75" cy="105" rx="18" ry="12" />
            <ellipse cx="125" cy="105" rx="18" ry="12" />
            <ellipse cx="82" cy="82" rx="14" ry="14" transform="rotate(-30 82 82)" />
            <ellipse cx="118" cy="82" rx="14" ry="14" transform="rotate(30 118 82)" />
            <ellipse cx="82" cy="128" rx="14" ry="14" transform="rotate(30 82 128)" />
            <ellipse cx="118" cy="128" rx="14" ry="14" transform="rotate(-30 118 128)" />
          </g>
          <circle cx="100" cy="105" r="12" fill={accent2} />
          <circle cx="95" cy="102" r="2" fill="#fff" />
          <circle cx="105" cy="102" r="2" fill="#fff" />
          <path d="M95 108 Q100 112 105 108" stroke="#fff" strokeWidth="1.5" fill="none" />
          <path d="M65 165 Q100 155 135 165 L135 180 L65 180Z" fill={accent} opacity="0.4" />
        </g>
      );
    case 'coffee':
      return (
        <g>
          <path d="M72 85 L75 135 Q75 145 85 145 L115 145 Q125 145 125 135 L128 85Z" fill={accent} opacity="0.9" />
          <path d="M128 95 Q140 95 140 110 Q140 125 128 125" stroke={accent} strokeWidth="4" fill="none" />
          <ellipse cx="100" cy="85" rx="28" ry="6" fill={accent2} />
          <ellipse cx="100" cy="83" rx="24" ry="4" fill="#5a3a1a" opacity="0.6" />
          <path d="M85 75 Q88 65 85 55 M95 75 Q98 65 95 55 M105 75 Q108 65 105 55 M115 75 Q118 65 115 55" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />
          <circle cx="90" cy="115" r="2.5" fill="#fff" />
          <circle cx="110" cy="115" r="2.5" fill="#fff" />
          <path d="M93 125 Q100 130 107 125" stroke="#fff" strokeWidth="1.5" fill="none" />
          <path d="M65 165 Q100 155 135 165 L135 180 L65 180Z" fill={accent} opacity="0.5" />
        </g>
      );
    case 'rock':
      return (
        <g>
          <path d="M70 130 L75 90 Q80 80 90 78 L110 78 Q120 80 125 90 L130 130 Q130 145 115 148 L85 148 Q70 145 70 130Z" fill={accent} opacity="0.85" />
          <path d="M75 95 L80 90 L90 88 L100 92 L110 88 L120 90 L125 95" stroke={accent2} strokeWidth="2" fill="none" opacity="0.6" />
          <circle cx="88" cy="105" r="3" fill="#fff" />
          <circle cx="112" cy="105" r="3" fill="#fff" />
          <path d="M92 118 Q100 124 108 118" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M65 160 Q100 155 135 160 L135 180 L65 180Z" fill={accent} opacity="0.5" />
        </g>
      );
    case 'tree':
      return (
        <g>
          <path d="M100 55 Q70 75 65 100 Q60 120 75 130 Q85 135 100 132 Q115 135 125 130 Q140 120 135 100 Q130 75 100 55Z" fill={accent} opacity="0.85" />
          <path d="M100 132 L100 155" stroke="#5a3a1a" strokeWidth="6" />
          <path d="M100 140 L90 150 M100 140 L110 150" stroke="#5a3a1a" strokeWidth="3" />
          <circle cx="85" cy="95" r="3" fill="#fff" />
          <circle cx="115" cy="95" r="3" fill="#fff" />
          <path d="M90 108 Q100 115 110 108" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M65 165 Q100 155 135 165 L135 180 L65 180Z" fill={accent} opacity="0.5" />
        </g>
      );
    case 'spark':
      return (
        <g>
          <circle cx="100" cy="105" r="30" fill={accent} opacity="0.15" />
          <circle cx="100" cy="105" r="20" fill={accent} opacity="0.25" />
          <circle cx="100" cy="105" r="10" fill={accent} opacity="0.4" />
          <circle cx="100" cy="105" r="4" fill={accent} />
          <circle cx="88" cy="100" r="2" fill="#fff" />
          <circle cx="112" cy="100" r="2" fill="#fff" />
          <path d="M93 110 Q100 115 107 110" stroke="#fff" strokeWidth="1.5" fill="none" />
          <path d="M65 165 Q100 155 135 165 L135 180 L65 180Z" fill={accent} opacity="0.4" />
        </g>
      );
    case 'dune':
      return (
        <g>
          {/* Flowing sand dunes — elegant curves concentrated at edges */}
          <path d="M0 140 Q40 120 80 130 Q120 115 160 125 Q180 130 200 128 L200 200 L0 200Z" fill={accent} opacity="0.3" />
          <path d="M0 155 Q50 138 100 148 Q150 140 200 150 L200 200 L0 200Z" fill={accent} opacity="0.2" />
          <path d="M0 170 Q60 158 120 165 Q170 155 200 162 L200 200 L0 200Z" fill={accent2} opacity="0.15" />
          {/* Subtle dust particles at edges */}
          <circle cx="25" cy="50" r="1.5" fill={accent} opacity="0.25" />
          <circle cx="175" cy="45" r="1" fill={accent2} opacity="0.2" />
          <circle cx="180" cy="90" r="1.5" fill={accent} opacity="0.2" />
          <circle cx="20" cy="100" r="1" fill={accent2} opacity="0.15" />
          {/* Center stays clean — just a soft sun glow in corner */}
          <circle cx="170" cy="35" r="12" fill={accent2} opacity="0.12" />
          <circle cx="170" cy="35" r="6" fill={accent} opacity="0.2" />
        </g>
      );
    case 'ruby-gem':
      return (
        <g>
          {/* Abstract faceted gem — deep crimson, concentrated at edges */}
          <path d="M20 60 L10 90 L25 130 L15 160" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.3" />
          <path d="M180 50 L190 85 L175 125 L185 155" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.3" />
          {/* Faceted gem shape in lower-left corner */}
          <g opacity="0.7">
            <path d="M30 150 L25 170 L40 180 L55 175 L50 155Z" fill={accent} opacity="0.4" />
            <path d="M30 150 L35 165 L50 155Z" fill={accent2} opacity="0.5" />
            <path d="M35 165 L40 180 L55 175 L50 155Z" fill={accent} opacity="0.3" />
          </g>
          {/* Subtle glow particles */}
          <circle cx="170" cy="40" r="2" fill={accent} opacity="0.25" />
          <circle cx="160" cy="70" r="1.5" fill={accent2} opacity="0.2" />
          <circle cx="30" cy="40" r="1.5" fill={accent} opacity="0.2" />
          {/* Center stays dark and clean */}
        </g>
      );
    default:
      return null;
  }
}

interface ThemeCardBackgroundProps {
  theme: ThemeKey;
  className?: string;
}

export function ThemeCardBackground({ theme, className = '' }: ThemeCardBackgroundProps) {
  const scene = THEME_SCENES[theme] || THEME_SCENES.dark;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id={`bg-${theme}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={scene.bg} />
            <stop offset="100%" stopColor={scene.bgEnd} />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#bg-${theme})`} />
        {/* Decorative dots */}
        <circle cx="30" cy="30" r="2" fill={scene.accent2} opacity="0.3" />
        <circle cx="170" cy="25" r="1.5" fill={scene.accent} opacity="0.25" />
        <circle cx="180" cy="80" r="2" fill={scene.accent2} opacity="0.2" />
        <circle cx="20" cy="90" r="1.5" fill={scene.accent} opacity="0.2" />
        <circle cx="160" cy="140" r="2" fill={scene.accent2} opacity="0.25" />
        <circle cx="25" cy="160" r="1.5" fill={scene.accent} opacity="0.2" />
        <circle cx="175" cy="170" r="2" fill={scene.accent2} opacity="0.2" />
        {/* Character */}
        <CharacterSVG type={scene.character} accent={scene.accent} accent2={scene.accent2} />
      </svg>
      {/* Readability overlay */}
      <div className={`absolute inset-0 bg-gradient-to-l ${scene.overlay} to-transparent`} />
    </div>
  );
}

export function useCurrentTheme(): [ThemeKey, (t: ThemeKey) => void] {
  const [theme, setTheme] = useState<ThemeKey>(() => {
    return (localStorage.getItem('madrsh-theme') as ThemeKey) || 'dark';
  });

  useEffect(() => {
    const check = setInterval(() => {
      const t = (localStorage.getItem('madrsh-theme') as ThemeKey) || 'dark';
      setTheme((prev) => (t !== prev ? t : prev));
    }, 500);
    return () => clearInterval(check);
  }, []);

  const updateTheme = (t: ThemeKey) => {
    setTheme(t);
    localStorage.setItem('madrsh-theme', t);
    document.documentElement.dataset.theme = t;
  };

  return [theme, updateTheme];
}

export { THEME_SCENES };
