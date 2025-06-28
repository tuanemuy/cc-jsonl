import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function formatDate(date: Date): string {
  if (isToday(date)) {
    return `Today at ${format(date, "HH:mm")}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "HH:mm")}`;
  }
  return format(date, "PP 'at' HH:mm");
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatFullDateTime(date: Date): string {
  return format(date, "PP 'at' HH:mm");
}
