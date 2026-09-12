import Image from "next/image";

/// 로고가 등록되어 있으면 로고 이미지를, 없으면 상호명 텍스트를 보여줌
export function ShopLogo({
  logoUrl,
  shopName,
  height = 36,
  textClassName = "text-lg font-bold",
}: {
  logoUrl: string | null;
  shopName: string;
  height?: number;
  textClassName?: string;
}) {
  if (!logoUrl) {
    return <span className={textClassName}>{shopName}</span>;
  }

  return (
    <Image
      src={logoUrl}
      alt={shopName}
      width={height * 4}
      height={height}
      style={{ height, width: "auto" }}
      className="max-w-[180px] object-contain"
      priority
      unoptimized
    />
  );
}
