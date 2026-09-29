import { Heart, Github, Mail, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui';

export function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">حمایت از MADRSH</h1>
        <p className="text-sm text-zinc-400 mt-1">با حمایت خود به توسعه پلتفرم کمک کنید</p>
      </div>

      <Card className="p-8 text-center">
        <div className="inline-flex p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-5">
          <Heart size={48} className="text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">از MADRSH حمایت کنید</h2>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-7">
          MADRSH یک پلتفرم رایگان برای دانشجویان و داوطلبان کنکور است. با حمایت شما می‌توانیم
          امکانات بیشتری اضافه کنیم و پلتفرم را بهتر نگه‌داریم. هر کمکی، حتی کوچک، ارزشمند است.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 interactive" hover>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
              <Heart size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">حمایت مالی</h3>
              <p className="text-xs text-zinc-500">مستقیم به توسعه‌دهنده</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            با حمایت مالی خود به ما کمک کنید تا سرورها و امکانات پلتفرم را نگه‌داریم.
          </p>
          <a
            href="mailto:support@madrsh.app"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600/10 text-rose-400 rounded-xl text-sm font-semibold interactive"
          >
            <Mail size={18} />
            ارتباط برای حمایت
          </a>
        </Card>

        <Card className="p-6 interactive" hover>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-primary-10 text-primary">
              <Github size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ریپو پروژه</h3>
              <p className="text-xs text-zinc-500">GitHub</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            می‌توانید به توسعه پلتفرم کمک کنید یا ستاره بدهید تا بیشتر دیده شود.
          </p>
          <a
            href="https://github.com/hkhany753-hub/MADRSH.git"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-10 text-primary rounded-xl text-sm font-semibold interactive"
          >
            <Github size={18} />
            مشاهده در GitHub
          </a>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={20} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white">راه‌های دیگر حمایت</h3>
        </div>
        <div className="space-y-3">
          {[
            { title: 'معرفی به دوستان', desc: 'پلتفرم را به دوستان خود معرفی کنید تا بیشتر شناخته شود' },
            { title: 'بازخورد و پیشنهاد', desc: 'نظرات خود را با ما در میان بگذارید تا پلتفرم را بهتر کنیم' },
            { title: 'گزارش مشکلات', desc: 'اگر مشکلی دیدید، به ما اطلاع دهید تا سریع برطرف کنیم' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-surface-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-center text-xs text-zinc-500 py-4">
        با تشکر از حمایت شما — تیم MADRSH
      </p>
    </div>
  );
}
