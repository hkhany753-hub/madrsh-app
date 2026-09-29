import { useEffect, useRef, useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  BarChart3,
  Trophy,
  Users,
  MessageSquare,
  Wrench,
  Target,
  Flame,
  Clock,
  CheckCircle,
  ArrowLeft,
  ArrowDown,
  Sparkles,
  Zap,
  TrendingUp,
  Timer,
  Search,
  Bell,
  Menu,
  X,
  LayoutDashboard,
  PlusCircle,
  CheckSquare,
  Heart,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

/* ---------- Scroll reveal hook ---------- */
function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ---------- Tiny UI preview pieces (static, mimic dashboard) ---------- */
function PreviewRing({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke="var(--color-primary)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{label}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-400 mt-2">{sublabel}</p>
    </div>
  );
}

function PreviewBarChart() {
  const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const values = [120, 210, 90, 340, 280, 420, 150];
  const max = Math.max(...values);
  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {days.map((d, i) => (
        <div key={d} className="flex flex-col items-center gap-2 flex-1">
          <div className="w-full flex items-end justify-center h-full">
            <div
              className="w-full max-w-[28px] rounded-t-lg bg-primary transition-all duration-1000 ease-out"
              style={{ height: `${(values[i] / max) * 100}%`, transitionDelay: `${i * 80}ms` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500">{d}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Full dashboard preview (glassmorphic) ---------- */
function DashboardPreview() {
  return (
    <div className="glass-strong rounded-2xl overflow-hidden shadow-2xl bounce-in">
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-amber-500/60" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-zinc-500">madrsh.app/dashboard</span>
        </div>
      </div>

      {/* Dashboard body */}
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col gap-1 p-3 border-l border-border bg-surface/30 min-w-[160px]">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary-10">
              <GraduationCap size={16} className="text-primary" />
            </div>
            <span className="text-sm font-bold text-white">MADRSH</span>
          </div>
          {[
            { icon: <LayoutDashboard size={16} />, label: 'داشبورد', active: true },
            { icon: <PlusCircle size={16} />, label: 'ثبت فعالیت' },
            { icon: <Calendar size={16} />, label: 'تقویم' },
            { icon: <CheckSquare size={16} />, label: 'کارها' },
            { icon: <Trophy size={16} />, label: 'برترین‌ها' },
            { icon: <BarChart3 size={16} />, label: 'آمار' },
            { icon: <Users size={16} />, label: 'اتاق مطالعه' },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs ${
                item.active
                  ? 'bg-primary-10 text-primary border border-primary-20'
                  : 'text-zinc-500'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-4 space-y-3">
          {/* Welcome */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">سلام، علی</h3>
              <p className="text-[11px] text-zinc-500">چهارشنبه ۱ مهر ۱۴۰۴</p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1.5 bg-surface-2 rounded-lg text-[11px] text-zinc-300 flex items-center gap-1.5">
                <Timer size={12} /> تایمر
              </div>
              <div className="px-3 py-1.5 bg-primary rounded-lg text-[11px] text-white flex items-center gap-1.5">
                <Target size={12} /> ثبت فعالیت
              </div>
            </div>
          </div>

          {/* Motivational + streak */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 p-3 rounded-xl bg-primary-5 border border-primary-20 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary-10 shrink-0">
                <Flame size={16} className="text-primary" />
              </div>
              <p className="text-xs text-zinc-300">عالی! امروز هدف روزانه‌ات رو کامل کردی</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-2 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Flame size={16} className="text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">۱۲</p>
                <p className="text-[10px] text-zinc-500">روز پیوسته</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Clock size={14} />, label: 'امروز', value: '۴س ۳۰د', color: 'text-primary' },
              { icon: <Clock size={14} />, label: 'هفته', value: '۲۸س', color: 'text-cyan-400' },
              { icon: <FileText size={14} />, label: 'تست امروز', value: '۱۲۰', color: 'text-emerald-400' },
              { icon: <FileText size={14} />, label: 'تست هفته', value: '۶۸۰', color: 'text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="p-2.5 rounded-xl bg-surface-2">
                <div className={`mb-1 ${s.color}`}>{s.icon}</div>
                <p className="text-sm font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Ring + chart */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 p-3 rounded-xl bg-surface-2 flex flex-col items-center">
              <p className="text-[10px] text-zinc-500 self-start mb-2">هدف روزانه</p>
              <PreviewRing value={92} label="۹۲٪" sublabel="۳۸ دقیقه باقی‌مانده" />
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-surface-2">
              <p className="text-[10px] text-zinc-500 mb-3">نمودار مطالعه این هفته</p>
              <PreviewBarChart />
            </div>
          </div>

          {/* Tasks */}
          <div className="p-3 rounded-xl bg-surface-2">
            <p className="text-[10px] text-zinc-500 mb-2">کارهای امروز</p>
            <div className="space-y-1.5">
              {[
                { done: true, text: 'مطالعه فصل ۳ ریاضی' },
                { done: true, text: '۶۰ تست اقتصاد' },
                { done: false, text: 'مرور منطق' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  {t.done ? (
                    <CheckCircle size={14} className="text-emerald-400" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" />
                  )}
                  <span className={`text-xs ${t.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                    {t.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Feature card ---------- */
interface FeatureItem {
  icon: typeof BookOpen;
  title: string;
  desc: string;
  color: string;
}

const FEATURES: FeatureItem[] = [
  { icon: BookOpen, title: 'مدیریت درس', desc: 'تمام درس‌های کنکور را در یک پلتفرم سازماندهی کنید، فعالیت هر درس را جداگانه ثبت و پیگیری کنید.', color: 'text-sky-400' },
  { icon: Calendar, title: 'برنامه‌ریزی هوشمند', desc: 'با تقویم شمسی و کارهای روزانه، برنامه‌ای ساختارمند داشته باشید و هیچ چیزی را از قلم نیندازید.', color: 'text-emerald-400' },
  { icon: FileText, title: 'آزمون شبیه‌سازی', desc: 'آزمون‌های شبیه‌سازی شده بسازید، پاسخ‌نامه بزنید و درصد خام و کنکوری را آنی محاسبه کنید.', color: 'text-amber-400' },
  { icon: BarChart3, title: 'تحلیل پیشرفت', desc: 'نمودارهای مطالعه، توزیع تست‌ها و روند رشد شما به‌صورت بصری و قابل فهم در اختیار شماست.', color: 'text-rose-400' },
  { icon: Trophy, title: 'جدول برترین‌ها', desc: 'با دیگر داوطلبان رقابت کنید، انگیازه خود را حفظ کنید و در جمع برترین‌ها قرار بگیرید.', color: 'text-orange-400' },
  { icon: Wrench, title: 'ابزارهای هوشمند', desc: 'کرنومتر، پومودورو، تایمر، ماشین حساب، محاسبه درصد تست و میانگین — همه در یک جا.', color: 'text-cyan-400' },
];

const BENEFITS: FeatureItem[] = [
  { icon: Zap, title: 'سریع و سبک', desc: 'بدون نصب اپلیکیشن، مستقیم در مرورگر. بارگذاری آنی و تجربه روان حتی در شبکه‌های کند.', color: 'text-primary' },
  { icon: Target, title: 'تمرکز روی هدف', desc: 'هر فعالیتی به هدف روزانه شما متصل است. همیشه می‌دانید چقدر از مسیر را آمده‌اید.', color: 'text-emerald-400' },
  { icon: Sparkles, title: '۲۶ تم رنگی', desc: 'محیطی که خودتان می‌سازید. از تاریک تا روشن، از مینیمال تا نئون — تم دلخواه خود را انتخاب کنید.', color: 'text-amber-400' },
  { icon: Users, title: 'جامعه فعال', desc: 'اتاق مطالعه، گفت‌وگوی عمومی و جستجوی کاربران؛ همراه با جامعه‌ای از داوطلبان پیش بروید.', color: 'text-rose-400' },
];

const AUDIENCES = [
  { icon: GraduationCap, title: 'داوطلبان کنکور', desc: 'برای کسانی که آمادگی کنکور کارشناسی ارشد معلمی را جدی می‌گیرند و می‌خواهند منظم مطالعه کنند.' },
  { icon: BookOpen, title: 'دانشجویان', desc: 'برای دانشجویانی که می‌خواهند بازدهی مطالعه خود را پیگیری و بهبود بدهند.' },
  { icon: Target, title: 'افراد هدف‌مند', desc: 'برای هر کسی که دوست دارد با داده و آمار، مسیر یادگیری خود را شفاف ببیند.' },
];

/* ---------- Component ---------- */
export function LandingPage({ onGetStarted }: LandingPageProps) {
  useReveal();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }

  const navLinks = [
    { id: 'what-is', label: 'MADRSH چیست' },
    { id: 'features', label: 'امکانات' },
    { id: 'dashboard', label: 'داشبورد' },
    { id: 'benefits', label: 'مزایا' },
    { id: 'audience', label: 'برای چه کسی' },
  ];

  return (
    <div className="min-h-screen relative z-10 text-zinc-200 overflow-x-hidden">
      {/* ===== Floating background orbs ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] right-[15%] w-[400px] h-[400px] bg-primary-10 rounded-full blur-[120px] orb-float" />
        <div className="absolute bottom-[20%] left-[10%] w-[350px] h-[350px] bg-cyan-500/5 rounded-full blur-[100px] orb-float-slow" />
        <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] bg-primary-5 rounded-full blur-[100px] orb-float" />
      </div>

      {/* ===== Navbar ===== */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass-strong shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-10 border border-primary-20">
              <GraduationCap size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">MADRSH</h1>
              <p className="text-[10px] text-zinc-500 hidden sm:block">مدیریت مطالعه و کنکور</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToId(link.id)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white interactive"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold shadow-primary interactive"
            >
              شروع رایگان
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-lg interactive text-zinc-400 hover:text-white"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden glass-strong border-t border-border px-4 py-4 space-y-1 fade-in">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToId(link.id)}
                className="w-full text-right px-4 py-3 rounded-xl text-sm text-zinc-400 hover:text-white interactive"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => { onGetStarted(); setMenuOpen(false); }}
              className="w-full mt-2 px-4 py-3 bg-primary text-white rounded-xl text-sm font-semibold interactive"
            >
              شروع رایگان
            </button>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div className="text-center lg:text-right reveal">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-10 border border-primary-20 mb-6">
                <Sparkles size={16} className="text-primary" />
                <span className="text-xs font-medium text-primary">پلتفرم هوشمند مطالعه</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                <span className="text-white">مسیر قبولی،</span>
                <br />
                <span className="gradient-shimmer">با نظم و داده</span>
              </h1>

              <p className="text-base lg:text-lg text-zinc-400 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                MADRSH پلتفرمی است که تمام ابزارهای مدیریت مطالعه، برنامه‌ریزی، آزمون و تحلیل پیشرفت را
                در یک تجربه زیبا و یکپارچه جمع می‌کند. کنکور را با اطلاعات و نظم اداره کنید، نه با استرس.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-base font-semibold shadow-primary-lg interactive glow-pulse"
                >
                  ساخت حساب رایگان
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={() => scrollToId('dashboard')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-surface-2 border border-border text-zinc-200 rounded-xl text-base font-semibold interactive"
                >
                  مشاهده داشبورد
                  <ArrowDown size={18} />
                </button>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-8 mt-10 justify-center lg:justify-start">
                {[
                  { value: '۱۰+', label: 'درس کنکوری' },
                  { value: '۲۶', label: 'تم رنگی' },
                  { value: '۷+', label: 'ابزار مطالعه' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-zinc-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="reveal" style={{ transitionDelay: '150ms' }}>
              <DashboardPreview />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-16">
            <div className="flex flex-col items-center gap-1 text-zinc-600">
              <span className="text-xs">برای ادامه اسکرول کنید</span>
              <ArrowDown size={20} className="scroll-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== What is MADRSH ===== */}
      <section id="what-is" className="py-20 px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border mb-4">
              <BookOpen size={14} className="text-primary" />
              <span className="text-xs text-zinc-400">MADRSH چیست؟</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              یک دستیار کامل برای <span className="text-primary">سفر مطالعه</span> شما
            </h2>
            <p className="text-base lg:text-lg text-zinc-400 leading-relaxed">
              MADRSH یک پلتفرم وب است که به شما کمک می‌کند فعالیت‌های مطالعه، تست و آزمون خود را ثبت
              کنید، برنامه روزانه بسازید، پیشرفت خود را در نمودار ببینید و با جامعه‌ای از داوطلبان
              همراه شوید. هدف ما ساده است: جایگزینی برای دفترچه و استرس — با داده، نظم و انگیزه.
            </p>
          </div>

          {/* Quick pillars */}
          <div className="grid sm:grid-cols-3 gap-4 mt-12">
            {[
              { icon: TrendingUp, title: 'ثبت و پیگیری', desc: 'هر دقیقه مطالعه و هر تست را ثبت کنید' },
              { icon: BarChart3, title: 'تحلیل و بصری‌سازی', desc: 'نمودار و آمار قابل فهم از پیشرفت' },
              { icon: Users, title: 'انگیازه و جامعه', desc: 'رقابت و همراهی با دیگر داوطلبان' },
            ].map((p, i) => (
              <div
                key={p.title}
                className="reveal glass rounded-2xl p-6 interactive"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex p-3 rounded-xl bg-primary-10 text-primary mb-4">
                  <p.icon size={24} />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{p.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ===== Features ===== */}
      <section id="features" className="py-20 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border mb-4">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs text-zinc-400">امکانات</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              همه آنچه برای <span className="text-primary">مطالعه منظم</span> نیاز دارید
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl mx-auto">
              از ثبت فعالیت تا آزمون شبیه‌سازی، از تقویم تا تحلیل پیشرفت — MADRSH ابزارهای کامل را در
              یک پلتفرم جمع کرده است.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="reveal glass rounded-2xl p-6 interactive group"
                style={{ transitionDelay: `${(i % 3) * 100}ms` }}
              >
                <div className={`inline-flex p-3 rounded-xl bg-surface-2 ${f.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon size={24} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ===== Dashboard showcase ===== */}
      <section id="dashboard" className="py-20 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="reveal order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border mb-4">
                <LayoutDashboard size={14} className="text-primary" />
                <span className="text-xs text-zinc-400">داشبورد</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                <span className="text-primary">داشبورد</span> که همه‌چیز را در یک نگاه نشان می‌دهد
              </h2>
              <p className="text-base text-zinc-400 leading-relaxed mb-8">
                وقتی وارد می‌شوید، داشبورد تصویری کامل از وضعیت امروز شما ارائه می‌دهد: زمان مطالعه،
                تعداد تست، پیشرفت نسبت به هدف، زنجیره روزهای پیوسته، نمودار هفته و کارهای باقی‌مانده.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Flame, title: 'زنجیره مطالعه (Streak)', desc: 'روزهای پیوسته مطالعه شما را می‌شمارد تا انگیوزه حفظ شود' },
                  { icon: Target, title: 'هدف روزانه', desc: 'نزد پیشرفت نسبت به هدف مطالعه روزانه را به‌صورت حلقه‌ای ببینید' },
                  { icon: BarChart3, title: 'نمودار هفته', desc: 'مطالعه هر روز هفته را در یک نمودار میله‌ای مقایسه کنید' },
                  { icon: CheckSquare, title: 'کارهای امروز', desc: 'لیست کارهای روزانه و درصد تکمیل آن‌ها در یک نگاه' },
                ].map((item, i) => (
                  <div
                    key={item.title}
                    className="reveal flex items-start gap-3 p-4 rounded-xl glass interactive"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div className="p-2.5 rounded-xl bg-primary-10 text-primary shrink-0">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal order-1 lg:order-2" style={{ transitionDelay: '120ms' }}>
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ===== Benefits ===== */}
      <section id="benefits" className="py-20 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border mb-4">
              <Zap size={14} className="text-primary" />
              <span className="text-xs text-zinc-400">مزایا و تفاوت</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              چرا <span className="text-primary">MADRSH</span> متفاوت است
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl mx-auto">
              ما فقط یک دفترچه دیجیتال نیستیم. MADRSH تجربه‌ای است که با داده و طراحی، مطالعه را
              لذت‌بخش و هدف‌مند می‌کند.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="reveal glass rounded-2xl p-6 interactive text-center"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`inline-flex p-4 rounded-2xl bg-surface-2 ${b.color} mb-4`}>
                  <b.icon size={28} />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{b.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ===== Audience ===== */}
      <section id="audience" className="py-20 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border mb-4">
              <Users size={14} className="text-primary" />
              <span className="text-xs text-zinc-400">برای چه کسی</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              MADRSH برای <span className="text-primary">چه کسانی</span> است
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {AUDIENCES.map((a, i) => (
              <div
                key={a.title}
                className="reveal glass rounded-2xl p-6 interactive"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex p-3 rounded-xl bg-primary-10 text-primary mb-4">
                  <a.icon size={24} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{a.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="py-24 px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center reveal">
          <div className="glass-strong rounded-3xl p-10 lg:p-14 relative overflow-hidden">
            {/* Glow accents */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/5 rounded-full blur-[80px]" />

            <div className="relative">
              <div className="inline-flex p-4 rounded-2xl bg-primary-10 border border-primary-20 mb-6">
                <GraduationCap size={32} className="text-primary" />
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                همین امروز شروع کنید
              </h2>
              <p className="text-base text-zinc-400 mb-8 max-w-xl mx-auto leading-relaxed">
                ساخت حساب کاملاً رایگان است. بدون نیاز به کارت بانکی، بدون تبلیغات مزاحم.
                فقط ثبت‌نام کنید و اولین فعالیت مطالعه خود را ثبت کنید.
              </p>

              <button
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-lg font-bold shadow-primary-lg interactive glow-pulse"
              >
                ساخت حساب رایگان
                <ArrowLeft size={22} />
              </button>

              <p className="text-xs text-zinc-500 mt-6">
                با ثبت‌نام، شما قوانین MADRSH را می‌پذیرید
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border py-8 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-10">
              <GraduationCap size={18} className="text-primary" />
            </div>
            <span className="text-sm font-bold text-white">MADRSH</span>
            <span className="text-xs text-zinc-600">© ۱۴۰۴</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => scrollToId('features')} className="text-xs text-zinc-500 hover:text-white interactive">
              امکانات
            </button>
            <button onClick={() => scrollToId('dashboard')} className="text-xs text-zinc-500 hover:text-white interactive">
              داشبورد
            </button>
            <button onClick={onGetStarted} className="text-xs text-zinc-500 hover:text-white interactive">
              ثبت‌نام
            </button>
          </div>
          <p className="text-xs text-zinc-600">ساخته‌شده با ❤️ برای داوطلبان کنکور</p>
        </div>
      </footer>
    </div>
  );
}
