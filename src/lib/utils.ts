import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}
