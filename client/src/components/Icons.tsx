type IconProps = {
  className?: string;
  size?: number;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconClose({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function IconTrash({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M2 4h12" />
      <path d="M6 4V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4" />
      <path d="M4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4" />
      <path d="M6.5 7v4M9.5 7v4" />
    </svg>
  );
}

export function IconCheck({ className, size = 12 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function IconCircle({ className, size = 12 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  );
}

export function IconChevronRight({ className, size = 12 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

export function IconChevronLeft({ className, size = 16 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M10 3l-5 5 5 5" />
    </svg>
  );
}

export function IconHeart({ className, size = 16, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 13.3C8 13.3 2.5 10 2.5 6.3A3.2 3.2 0 0 1 8 4.2a3.2 3.2 0 0 1 5.5 2.1c0 3.7-5.5 7-5.5 7Z" />
    </svg>
  );
}

export function IconChevronDown({ className, size = 11 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M3 6l5 5 5-5" />
    </svg>
  );
}

export function IconEdit({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M11 2.5a1.5 1.5 0 0 1 2 2l-7 7-3 1 1-3 7-7Z" />
      <path d="M9.5 4l2 2" />
    </svg>
  );
}

export function IconCalendar({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" />
      <path d="M2 6.5h12" />
      <path d="M5 2v3M11 2v3" />
    </svg>
  );
}

export function IconUsers({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <circle cx="6" cy="5.5" r="2.3" />
      <path d="M1.8 14c0-2.6 1.9-4.2 4.2-4.2s4.2 1.6 4.2 4.2" />
      <circle cx="12" cy="6.2" r="1.7" />
      <path d="M10.3 8.6c.5-.3 1.1-.4 1.7-.4 1.8 0 3.2 1.4 3.2 3.4" />
    </svg>
  );
}

export function IconWallet({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <rect x="1.5" y="4" width="13" height="9" rx="1.8" />
      <path d="M1.5 6.5h13" />
      <circle cx="11.5" cy="9.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconStore({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M2 5l1-2.5h10L14 5" />
      <path d="M2 5v1.5a1.8 1.8 0 0 0 3.6 0 1.8 1.8 0 0 0 3.6 0 1.8 1.8 0 0 0 3.6 0V5" />
      <path d="M3 6.8V13.5h10V6.8" />
      <path d="M6.5 13.5V10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v3.5" />
    </svg>
  );
}

export function IconLayers({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M8 2L2 5.3 8 8.6l6-3.3L8 2Z" />
      <path d="M2 8.3 8 11.6l6-3.3" />
      <path d="M2 11 8 14.3 14 11" />
    </svg>
  );
}

export function IconImage({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <circle cx="5.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <path d="M2 11.5l3.2-3.2a1 1 0 0 1 1.4 0L9 10.7M9.5 9.5l1-1a1 1 0 0 1 1.4 0L14 11" />
    </svg>
  );
}

export function IconExternalLink({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10" />
      <path d="M9 2h5v5" />
      <path d="M14 2L7 9" />
    </svg>
  );
}

export function IconBell({ className, size = 18 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M4 6.5a4 4 0 0 1 8 0c0 3 1 4 1 4H3s1-1 1-4Z" />
      <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

export function IconLogOut({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
      <path d="M10.5 11.5L14 8l-3.5-3.5" />
      <path d="M14 8H6" />
    </svg>
  );
}

export function IconEye({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M1.5 8S4 3 8 3s6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

export function IconEyeOff({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M2 2l12 12" />
      <path d="M6.6 3.3C7.05 3.1 7.52 3 8 3c4 0 6.5 5 6.5 5a12.6 12.6 0 0 1-2.42 3.1M4.32 4.9A12.6 12.6 0 0 0 1.5 8s2.5 5 6.5 5c.86 0 1.65-.23 2.36-.6" />
      <path d="M6.6 9.4a2 2 0 0 0 2.83 2.83" />
    </svg>
  );
}

export function IconGrip({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5.5" cy="3.5" r="1.3" />
      <circle cx="10.5" cy="3.5" r="1.3" />
      <circle cx="5.5" cy="8" r="1.3" />
      <circle cx="10.5" cy="8" r="1.3" />
      <circle cx="5.5" cy="12.5" r="1.3" />
      <circle cx="10.5" cy="12.5" r="1.3" />
    </svg>
  );
}
