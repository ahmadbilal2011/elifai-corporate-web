/**
 * Runtime strings for the Arabic page (ar/index.html). Static text is
 * translated at build time by scripts/build-ar.py; this file covers text
 * that JavaScript writes into the page.
 */
export const isAr = document.documentElement.lang === "ar";

const AR = {
  "Thank you. Your enquiry has been sent and we will reply within one business day.": "شكرًا لكم. تم إرسال استفساركم وسنرد خلال يوم عمل واحد.",
  "Thank you. Your enquiry has been sent.": "شكرًا لكم. تم إرسال استفساركم.",
  "Your enquiry could not be sent.": "تعذّر إرسال الاستفسار.",
  "Enter your full name.": "أدخل اسمك الكامل.",
  "Enter an email address like name@company.com.": "أدخل بريدًا إلكترونيًا مثل name@company.com.",
  "Add a little more detail, at least 20 characters.": "أضف مزيدًا من التفاصيل، ٢٠ حرفًا على الأقل.",
  "Tick the box so we can use these details to reply.": "ضع علامة في المربع لنتمكن من استخدام هذه البيانات للرد.",
  "Check the highlighted fields and try again.": "راجع الحقول المحددة وحاول مرة أخرى.",
  "Sending your enquiry": "جارٍ إرسال الاستفسار",
  "Sending": "جارٍ الإرسال",
  "Send enquiry": "أرسل الاستفسار",
  "The enquiry service did not respond.": "لم تستجب خدمة الاستفسارات.",
  "No connection to the server.": "لا يوجد اتصال بالخادم.",
  "FALLBACK": 'يمكنكم أيضًا مراسلتنا على <a href="mailto:info@elifai.pk">info@elifai.pk</a> أو عبر <a href="https://wa.me/966540952792" target="_blank" rel="noopener">واتساب</a>.',
  "On shift now": "في المناوبة الآن",
  "Next shift": "المناوبة التالية",
  "PKT": "بتوقيت باكستان",
  "Open now": "مفتوح الآن",
  "in Riyadh": "في الرياض",
  "Closed now · opens 09:00 Riyadh time, Sunday to Thursday": "مغلق الآن · يفتح 09:00 بتوقيت الرياض، من الأحد إلى الخميس",
  "Switch to dark mode": "التبديل إلى الوضع الداكن",
  "Switch to light mode": "التبديل إلى الوضع الفاتح",
  "Theme chosen for this visit": "المظهر المختار لهذه الزيارة",
  "Theme follows the time of day: dark 7 pm to 3 am": "يتبع المظهر وقت اليوم: داكن من ٧ مساءً حتى ٣ فجرًا",
  "Latest model": "أحدث طراز",
  "Checking latest news": "جارٍ التحقق من آخر الأخبار",
  "In the news ": "في الأخبار ",
  "Open menu": "فتح القائمة",
  "Close menu": "إغلاق القائمة",
  "Automatic rotation is off": "التبديل التلقائي متوقف",
  "Pause animation": "إيقاف الحركة مؤقتًا",
  "Resume animation": "استئناف الحركة",
  "Islamabad HQ": "المقر في إسلام آباد",
  "Gulf": "الخليج",
  "Europe": "أوروبا",
  "Worldwide": "حول العالم",
  "Islamabad HQ · operations centre staffed 24/7": "المقر في إسلام آباد · مركز العمليات يعمل على مدار الساعة",
  "cities": "مدن",
  "in business hours now": "ضمن ساعات العمل الآن",
  "on it": "يتابعها",
  "resolved by": "عالجها",
  "in": "خلال",
  "min": "دقيقة",
};

export function t(s) {
  return isAr && AR[s] != null ? AR[s] : s;
}
export const locale = isAr ? "ar" : "en-GB";
