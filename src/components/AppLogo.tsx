import { APP_NAME, APP_NAME_EN } from "@/lib/app";

/// 라셀링크 모노그램: 얇은 선 프레임 안에 세리프 L·S를 살짝 겹쳐 넣음.
/// 색은 currentColor라 밝은 화면·어두운 화면 어디서나 그대로 읽힘
const SERIF =
  "'Playfair Display','Didot','Bodoni MT','Times New Roman',Georgia,serif";

export function AppLogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        {/* S가 지나가는 자리를 L에서 얇게 덜어내 두 글자가 엮여 보이게 함 */}
        <mask id="lasell-cut">
          <rect width="120" height="120" fill="#fff" />
          <text
            x="72"
            y="62"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#000"
            stroke="#000"
            strokeWidth="5.5"
            fontSize="72"
            fontFamily={SERIF}
          >
            S
          </text>
        </mask>
      </defs>

      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="38"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <text
        x="48"
        y="62"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize="72"
        fontFamily={SERIF}
        mask="url(#lasell-cut)"
      >
        L
      </text>
      <text
        x="72"
        y="62"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize="72"
        fontFamily={SERIF}
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
