type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Undo = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9a5 5 0 0 1 0 10h-2" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
export const Lamp = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>;
/** A quarter turn of the case. */
export const TurnLeft = ({ size }: P) => <svg {...s(size)} aria-hidden><rect x="8.5" y="8.5" width="9" height="9" rx="1.5" /><path d="M5 13a8 8 0 0 1 8-8" /><path d="M10.5 3.2 13 5l-2.2 2.4" /></svg>;
export const TurnRight = ({ size }: P) => <svg {...s(size)} aria-hidden><rect x="6.5" y="8.5" width="9" height="9" rx="1.5" /><path d="M19 13a8 8 0 0 0-8-8" /><path d="M13.5 3.2 11 5l2.2 2.4" /></svg>;
export const Turn = ({ size }: P) => <svg {...s(size)} aria-hidden><rect x="7" y="7" width="10" height="10" rx="1.5" transform="rotate(15 12 12)" /><path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6" /></svg>;
export const Vials = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M6 4v13a2.5 2.5 0 0 0 5 0V4M13 4v13a2.5 2.5 0 0 0 5 0V4" /><path d="M5 4h7M12 4h7" /><path d="M6 13h5M13 11h5" opacity=".6" /></svg>;
/** Stars are vials of layered sand. */
export const Vial = ({ size = 22, on = true }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {on && <circle cx="12" cy="13" r="10" fill="rgba(255,214,150,.18)" />}
    <defs><clipPath id="vc"><path d="M8.5 6h7v12a3.5 3.5 0 0 1-7 0z" /></clipPath></defs>
    {on && <g clipPath="url(#vc)"><rect x="8" y="16" width="8" height="6" fill="#c8553d" /><rect x="8" y="13" width="8" height="3" fill="#f2a541" /><rect x="8" y="10" width="8" height="3" fill="#2a9d8f" /></g>}
    <path d="M8.5 6h7v12a3.5 3.5 0 0 1-7 0z" fill="none" stroke={on ? '#fff3dc' : 'rgba(255,255,255,.45)'} strokeWidth="1.3" />
    <rect x="9" y="3.2" width="6" height="2.6" rx=".8" fill={on ? '#b98352' : 'none'} stroke={on ? '#6a3a1e' : 'rgba(255,255,255,.4)'} strokeWidth="1" />
  </svg>
);
