const TONE_CLASSES: Record<string, string> = {
  green: "bg-status-greenBg text-status-green",
  orange: "bg-status-orangeBg text-status-orange",
  red: "bg-status-redBg text-status-red",
  maroon: "bg-status-maroonBg text-status-maroon",
  gray: "bg-slate-100 text-slate-600",
  blue: "bg-blue-100 text-corporate-blue",
};

export function Badge({ text, tone }: { text: string; tone: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
        TONE_CLASSES[tone] ?? TONE_CLASSES.gray
      }`}
    >
      {text}
    </span>
  );
}
