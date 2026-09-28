import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 배포(Docker/Railway)에서 이미지를 작게 만들기 위한 설정. 로컬 개발(next dev)에는 영향 없음
  output: "standalone",
};

export default nextConfig;
