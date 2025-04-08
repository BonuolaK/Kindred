import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateCallDuration(callDay: number): number {
  switch (callDay) {
    case 1: return 5 * 60; // 5 minutes in seconds
    case 2: return 10 * 60; // 10 minutes in seconds
    case 3: return 20 * 60; // 20 minutes in seconds
    default: return 60 * 60; // 60 minutes for day 4+
  }
}

export function formatCallDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), 'h:mm a');
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
}

export function generateRandomAvatarColor(seed: string): string {
  const colors = [
    'from-primary to-secondary',
    'from-purple-500 to-indigo-600',
    'from-blue-500 to-teal-400',
    'from-rose-400 to-red-500',
    'from-amber-400 to-orange-500',
    'from-emerald-500 to-green-600'
  ];
  
  // Simple hash function for the seed string
  const hash = seed.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return colors[hash % colors.length];
}

export function formatPhoneNumber(number: string): string {
  // Implement phone number formatting if needed
  return number;
}

export const AVATAR_SHAPES = [
  'M100,0 L200,69 L162,180 L38,180 L0,69 Z', // pentagon
  'M100,0 L168,32 L200,100 L168,168 L100,200 L32,168 L0,100 L32,32 Z', // octagon
  'M100,0 A100,100 0 0 1 100,200 A100,100 0 0 1 100,0 Z', // circle
  'M100,30 A70,70 0 1 1 100,170 A70,70 0 1 1 100,30 Z M40,100 L160,100 M100,40 L100,160', // circle with plus
];

export function getAvatarShape(userId: number): string {
  return AVATAR_SHAPES[userId % AVATAR_SHAPES.length];
}

// WebSocket connection setup
export function setupWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  return new WebSocket(wsUrl);
}
