const TONE_CLASSES: Record<string, string> = {
  green: "ac-badge-green",
  orange: "ac-badge-orange",
  red: "ac-badge-red",
  maroon: "ac-badge-maroon",
  blue: "ac-badge-blue",
  gray: "ac-badge-gray",
};

export function Badge({ text, tone }: { text: string; tone: string }) {
  return <span className={`ac-badge ${TONE_CLASSES[tone] ?? TONE_CLASSES.gray}`}>{text}</span>;
}
