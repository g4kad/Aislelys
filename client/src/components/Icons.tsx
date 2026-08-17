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

export function IconExternalLink({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10" />
      <path d="M9 2h5v5" />
      <path d="M14 2L7 9" />
    </svg>
  );
}
