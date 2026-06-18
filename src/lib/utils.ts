import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  dateStr: string | Date,
  format: "short" | "long" | "full" = "short"
): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  if (format === "full") {
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return `${y}年${m}月${d}日 ${weekdays[date.getDay()]} ${hh}:${mm}`;
  }
  if (format === "long") {
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }
  return `${y}-${m}-${d}`;
}

export function isOverdue(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days;
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}
