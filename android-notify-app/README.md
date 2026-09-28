# 라스켓 입금 알림 (안드로이드)

은행 앱 알림 중 셀러가 고른 것만 읽어서 라스켓 서버로 보내는 아주 작은 앱.
카톡·문자 등 다른 알림은 앱이 아예 쳐다보지 않는다 (NotifyListenerService.kt 참고).

## 빌드 방법 (이 세션에서는 Android SDK가 없어서 직접 빌드/테스트하지 못했음)

1. Android Studio로 이 폴더(`android-notify-app/`)를 연다.
2. `Build > Build Bundle(s) / APK(s) > Build APK(s)` 로 디버그 APK를 만든다.
3. 만들어진 `app-debug.apk`를 셀러 폰으로 보내서 직접 설치한다 (플레이스토어 아님 — "출처를 알 수 없는 앱 설치" 허용 필요).

## 셀러가 할 일 (앱 안에서)

1. 라스켓 관리자 화면 > 설정에서 발급받은 **주소**와 **연동키**를 붙여넣고 저장
2. 쓰는 은행 앱 체크
3. "알림 접근 허용하러 가기" → 라스켓 입금 알림 앱을 켜기
4. "배터리 최적화 제외하러 가기" (특히 삼성 폰 — 안 하면 화면 꺼졌을 때 알림이 안 옴)

## 구조

- `MainActivity.kt` — 설정 화면. 주소/연동키/은행 앱 선택을 SharedPreferences에 저장
- `NotifyListenerService.kt` — 알림이 뜰 때마다 실행됨. 선택된 은행 앱 패키지명이 아니면 즉시 무시.
  맞으면 제목+본문을 서버로 POST (`Authorization: Bearer <연동키>`)
