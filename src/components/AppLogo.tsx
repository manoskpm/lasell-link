import { APP_NAME, APP_NAME_EN } from "@/lib/app";

/// 라셀링크 로고 마크: LaSell Link (Live + Seller + Link)의 이니셜 LS
export function AppLogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient
          id="lasell-gradient"
          x1="0"
          y1="0"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="0.5" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#FB3B53" />
        </linearGradient>
        <mask id="lasell-cut">
          <rect width="48" height="48" fill="#fff" />
          <text
            x="22"
            y="25"
            dominantBaseline="central"
            fill="#000"
            stroke="#000"
            strokeWidth="3.4"
            fontSize="27"
            fontWeight="800"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            S
          </text>
        </mask>
      </defs>

      <rect width="48" height="48" rx="13" fill="url(#lasell-gradient)" />
      {/* L 위에 S가 겹치고, 겹친 자리에 얇은 틈을 내서 두 글자가 엮인 것처럼 보이게 함 */}
      <text
        x="11"
        y="25"
        dominantBaseline="central"
        fill="#fff"
        fontSize="27"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        mask="url(#lasell-cut)"
      >
        L
      </text>
      <text
        x="22"
        y="25"
        dominantBaseline="central"
        fill="#fff"
        fontSize="27"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        S
      </text>
    </svg>
  );
}

export function AppLogo({
  size = 28,
  className = "text-base font-bold tracking-tight",
  english = false,
}: {
  size?: number;
  className?: string;
  english?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <AppLogoMark size={size} />
      <span className={className}>{english ? APP_NAME_EN : APP_NAME}</span>
    </span>
  );
}

/// 지원하는 라이브 판매 플랫폼 표시.
/// 각 회사 로고는 상표라서 쓰지 않고, 일반 아이콘 + 플랫폼 이름으로 표현
const PLATFORMS = [
  { label: "유튜브", color: "#FF0033", icon: PlayIcon },
  { label: "인스타", color: "#C13584", icon: PhotoIcon },
  { label: "틱톡", color: "#00C2CB", icon: MusicIcon },
];

export function PlatformStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {PLATFORMS.map((platform) => {
        const Icon = platform.icon;
        return (
          <span
            key={platform.label}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500"
          >
            <Icon color={platform.color} />
            {!compact && platform.label}
          </span>
        );
      })}
    </div>
  );
}

function PlayIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="4.5" fill={color} />
      <path d="M10 9.2 15 12l-5 2.8z" fill="#fff" />
    </svg>
  );
}

function PhotoIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="16" rx="3.5" fill={color} />
      <circle cx="8.5" cy="9.5" r="1.8" fill="#fff" />
      <path d="M4.5 17.5 10 12l3.5 3.5L16.5 13l3 4.5z" fill="#fff" />
    </svg>
  );
}

function MusicIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 18.5a3 3 0 1 1-3-3c.4 0 .7 0 1 .2V5l8-2v3.2l-6 1.5z"
        fill={color}
      />
    </svg>
  );
}
