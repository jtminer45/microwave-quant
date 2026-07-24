import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function LeafMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={cn("shrink-0 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]", className)}
    >
      <path d="M50,92 C22,70 20,28 50,8 C80,28 78,70 50,92 Z" fill="var(--color-primary)" />
      <path
        d="M50,86 C50,64 50,34 50,14"
        stroke="var(--color-background)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.55}
      />
      <path d="M50,88 L50,97" stroke="var(--color-primary)" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 28, showWordmark = true, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LeafMark size={size} />
      {showWordmark && (
        <span
          className="font-mono font-bold tracking-[0.14em] uppercase text-ink"
          style={{ fontSize: size * 0.5 }}
        >
          Longon <span className="text-primary">Capital</span>
        </span>
      )}
    </div>
  );
}
