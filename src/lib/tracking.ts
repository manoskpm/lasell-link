/// 택배사별 배송조회 주소. {{번호}} 자리에 운송장번호가 들어감
/// 택배사가 주소를 바꾸면 관리자 설정에서 직접 고칠 수 있음
export const COURIER_PRESETS = [
  {
    name: "한진택배",
    siteUrl: "https://www.hanjin.co.kr",
    trackingUrlTemplate:
      "https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2={{번호}}",
  },
  {
    name: "CJ대한통운",
    siteUrl: "https://www.cjlogistics.com",
    trackingUrlTemplate:
      "https://trace.cjlogistics.com/next/tracking.html?wblNo={{번호}}",
  },
  {
    name: "우체국택배",
    siteUrl: "https://service.epost.go.kr",
    trackingUrlTemplate:
      "https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1={{번호}}",
  },
  {
    name: "롯데택배",
    siteUrl: "https://www.lotteglogis.com",
    trackingUrlTemplate:
      "https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo={{번호}}",
  },
  {
    name: "로젠택배",
    siteUrl: "https://www.ilogen.com",
    trackingUrlTemplate: "https://www.ilogen.com/web/personal/trace/{{번호}}",
  },
] as const;

export function buildTrackingUrl(
  template: string | null | undefined,
  trackingNumber: string | null | undefined
) {
  if (!template || !trackingNumber) return null;
  const cleaned = trackingNumber.replace(/[^0-9A-Za-z]/g, "");
  if (!cleaned) return null;
  return template.replace(/\{\{번호\}\}/g, cleaned);
}
