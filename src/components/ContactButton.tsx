import Link from "next/link";

/// 카카오채널/채팅 문의 버튼. 설정에 링크가 없으면 아무것도 표시하지 않음
export function ContactButton({
  kakaoChannelUrl,
  chatUrl,
}: {
  kakaoChannelUrl?: string | null;
  chatUrl?: string | null;
}) {
  const href = kakaoChannelUrl || chatUrl;
  if (!href) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 mx-auto flex max-w-[480px] justify-end px-4">
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto flex h-14 w-14 flex-col items-center justify-center rounded-full bg-[#FAE100] text-[10px] font-bold text-[#3C1E1E] shadow-lg active:brightness-95"
        aria-label="문의하기"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.9 3 2.8 6.2 2.8 10.2c0 2.5 1.7 4.7 4.2 6l-.9 3.4c-.1.3.2.5.5.4l4-2.6c.5.1 1 .1 1.4.1 5.1 0 9.2-3.2 9.2-7.2S17.1 3 12 3z" />
        </svg>
        문의
      </Link>
    </div>
  );
}

