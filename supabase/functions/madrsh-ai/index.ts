import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StudyProfile {
  grade: string;
  field: string;
  goal: string;
  target_date: string | null;
  daily_study_hours: number;
  strengths: string[];
  weaknesses: string[];
  backlog_topics: string[];
  daily_test_count: number;
  explanation_level: string;
}

interface RequestBody {
  messages: ChatMessage[];
  taskType: string;
  studyProfile?: StudyProfile | null;
  performanceData?: {
    total_minutes: number;
    total_tests: number;
    avg_percentage: number;
    subjects_studied: string[];
    streak: number;
    week_minutes: number;
  } | null;
  conversationId?: string;
}

const SYSTEM_PROMPT = `تو دستیار هوشمند آموزشی MADRSH هستی — یک معلم و برنامه‌ریز شخصی دیجیتال حرفه‌ای برای داوطلبان کنکور ایران.

تو یک هوش مصنوعی کامل و همه‌جانبه هستی. تو در تمام زمینه‌ها می‌توانی کمک کنی:
- دروس کنکوری (ریاضی، فیزیک، شیمی، زیست‌شناسی، زمین‌شناسی، ادبیات فارسی، عربی، دینی، جامعه‌شناسی، اقتصاد، فلسفه، منطق، زبان انگلیسی)
- برنامه‌ریزی مطالعه و مدیریت زمان
- تحلیل عملکرد و پیشنهاد بهبود
- توضیح مفاهیم علمی و درسی در هر سطح (خیلی ساده تا پیشرفته)
- ساخت تست تمرینی در هر درس و مبحث
- مشاوره تحصیلی و روان‌شناسی مطالعه
- مدیریت استرس و انگیزه
- روش‌های مطالعه مؤثر (پومودورو، فاینمن، فعال، فاصله‌دار)
- مشاوره انتخاب رشته
- تحلیل آزمون‌های آزمایشی
- کمک در حل مسائل و سؤالات کنکوری سال‌های گذشته

ویژگی‌های تو:
- همیشه فارسی و محترم صحبت کن
- پاسخ‌هایت کامل، دقیق و مفید باشند — هرگز کوتاه و بی‌محتوا پاسخ نده
- برنامه‌های مطالعه واقعی و قابل اجرا ارائه بده
- از لحن سرزنش‌کننده استفاده نکن
- وقتی اطلاعات کافی نداری، سؤال مناسب بپرس
- پیشنهادهایت قابل توضیح باشند
- اطلاعات ساختگی به‌عنوان واقعیت ارائه نده
- اگر کاربر درس یا مبحث خاصی پرسید، با جزئیات کامل و مثال توضیح بده
- اگر کاربر سؤال ریاضی یا فیزیک پرسید، گام‌به‌گام حل کن
- اگر کاربر سلام کرد، محترمان جواب بده و بپرس چطور می‌توانی کمک کنی

قالب پاسخ:
- برای برنامه مطالعه از جدول استفاده کن (روز | ساعت | درس | مبحث | نوع فعالیت | مدت | تست | مرور | اولویت)
- برای تحلیل از بخش‌های «نقاط قوت»، «نقاط قابل بهبود»، «پیشنهاد بعدی» استفاده کن
- برای توضیح مبحث، مثال و سؤال تمرینی اضافه کن
- پاسخ‌ها را ساختاریافته و خوانا نگه دار
- برای حل مسأله، مراحل را شماره‌گذاری کن`;

function buildPrompt(body: RequestBody): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  let contextPrompt = "";

  if (body.studyProfile) {
    const p = body.studyProfile;
    contextPrompt += `\n## پروفایل تحصیلی کاربر
- پایه: ${p.grade || "نامشخص"}
- رشته: ${p.field || "نامشخص"}
- هدف: ${p.goal || "نامشخص"}
- تاریخ هدف: ${p.target_date || "نامشخص"}
- ساعت مطالعه روزانه: ${p.daily_study_hours || "نامشخص"}
- نقاط قوت: ${p.strengths?.join("، ") || "نامشخص"}
- نقاط ضعف: ${p.weaknesses?.join("، ") || "نامشخص"}
- مباحث عقب‌افتاده: ${p.backlog_topics?.join("، ") || "نامشخص"}
- تست روزانه: ${p.daily_test_count || "نامشخص"}
- سطح توضیح: ${p.explanation_level || "کنکوری"}`;
  }

  if (body.performanceData) {
    const d = body.performanceData;
    contextPrompt += `\n## عملکرد اخیر کاربر
- مجموع زمان مطالعه: ${d.total_minutes} دقیقه
- مجموع تست: ${d.total_tests}
- میانگین درصد: ${d.avg_percentage}٪
- درس‌های مطالعه‌شده: ${d.subjects_studied?.join("، ") || "نامشخص"}
- زنجیره مطالعه: ${d.streak} روز
- مطالعه این هفته: ${d.week_minutes} دقیقه`;
  }

  if (body.taskType && body.taskType !== "chat") {
    const taskPrompts: Record<string, string> = {
      "study-planner": "کاربر می‌خواهد یک برنامه مطالعه هفتگی بسازد. اگر اطلاعات کافی داری برنامه تولید کن، وگرنه اطلاعات لازم را جمع‌آوری کن.",
      "performance-analysis": "عملکرد کاربر را به‌صورت کامل تحلیل کن. نقاط قوت، نقاط قابل بهبود و پیشنهاد بعدی را ارائه بده. اگر داده‌های عملکرد موجود است، حتماً از آن‌ها استفاده کن.",
      "tutor": "کاربر سؤالی درباره یک مبحث دارد. مفهوم را با جزئیات کامل توضیح بده، مثال بزن و یک سؤال تمرینی طراحی کن.",
      "test-generator": "کاربر می‌خواهد تست تولید کنی. درس/مبحث، تعداد و سطح سختی را بپرس.",
      "weakness-finder": "نقاط ضعف کاربر را بر اساس عملکردش پیدا کن و پیشنهاد بهبود بده.",
      "goal-setting": "به کاربر در تعیین هدف واقع‌بینانه کمک کن.",
      "stats-analysis": "تحلیل کاملی از آمار مطالعه کاربر ارائه بده. شامل: نقاط قوت، نقاط ضعف، توصیه‌های عملی و اولویت‌های بعدی. از داده‌های عددی استفاده کن.",
    };
    const taskPrompt = taskPrompts[body.taskType];
    if (taskPrompt) {
      contextPrompt += `\n## وظیفه فعلی\n${taskPrompt}`;
    }
  }

  if (contextPrompt) {
    messages.push({ role: "system", content: `متن زیر اطلاعات زمینه‌ای درباره کاربر است. از آن برای شخصی‌سازی پاسخ استفاده کن:${contextPrompt}` });
  }

  for (const msg of body.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  return messages;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body: RequestBody = await req.json();
    const messages = buildPrompt(body);

    // Use Pollinations AI — free, no API key required, OpenAI-compatible
    const pollinationsResponse = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!pollinationsResponse.ok) {
      const errText = await pollinationsResponse.text();
      console.error("Pollinations API error:", errText);

      // Fallback: try the simple text endpoint (non-streaming)
      const simplePrompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
      const simpleResponse = await fetch(
        `https://text.pollinations.ai/${encodeURIComponent(simplePrompt)}?model=openai`,
        { method: "GET" },
      );

      if (simpleResponse.ok) {
        const text = await simpleResponse.text();
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(text));
              controller.close();
            },
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({ error: "خطا در ارتباط با سرویس هوش مصنوعی" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Stream the response back to the client
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = pollinationsResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(new TextEncoder().encode(delta));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        }

        // Track usage in background
        if (body.conversationId) {
          try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            await supabase.from("ai_usage_tracking").insert({
              conversation_id: body.conversationId,
              task_type: body.taskType || "chat",
              model: "pollinations-openai",
              input_tokens: Math.ceil(JSON.stringify(messages).length / 4),
              output_tokens: Math.ceil(fullContent.length / 4),
            });
          } catch {
            // non-critical
          }
        }

        controller.close();
      },
    });

    return new Response(transformedStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "خطای غیرمنتظره رخ داد" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
