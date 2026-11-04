import type { ReactNode } from "react";

const paths = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m6 0h1m-8 3h1m6 0h1" /></>,
  transmission: <><path d="M6 5v14m12-14v14M6 12h12M12 5v7" /><circle cx="6" cy="4" r="1" /><circle cx="12" cy="4" r="1" /><circle cx="18" cy="4" r="1" /><circle cx="6" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
  drive: <><rect x="3" y="3" width="4" height="6" rx="1" /><rect x="17" y="3" width="4" height="6" rx="1" /><rect x="3" y="15" width="4" height="6" rx="1" /><rect x="17" y="15" width="4" height="6" rx="1" /><path d="M7 6h10M7 18h10M12 6v12" /></>,
  fuel: <><path d="M3 21h11M5 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16M5 10h8m0 3h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9l-4-4m2 2v3h2" /></>,
  seats: <><circle cx="10" cy="5" r="3" /><path d="M5 19v-2a5 5 0 0 1 10 0v2M4 21h12m3-12v8a2 2 0 0 1-2 2" /></>,
  car: <><path d="m5 7 2-4h10l2 4 2 3v8H3v-8l2-3Zm0 0h14M3 12h18m-15 0v2m12-2v2M5 18v3m14-3v3" /></>,
  engine: <><path d="M3 10v7m0-4h3m0-5h4l2-3h4v3h3v3h3v7h-3v2H9l-3-3V8Zm4-6h6m-3 0v3" /></>,
  location: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3m0 4v1a2 2 0 0 1-2 2h-3" /><rect x="3" y="12" width="4" height="7" rx="2" /><rect x="17" y="12" width="4" height="7" rx="2" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  document: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8m-8 4h6" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></>,
  send: <><path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3" /></>,
} satisfies Record<string, ReactNode>;

export type VehicleIconName = keyof typeof paths;

export function VehicleIcon({ name, size = 24, className }: Readonly<{ name: VehicleIconName; size?: number; className?: string }>) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
