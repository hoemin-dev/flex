# MONA Flex

MonaHub 왼쪽에 밀착되는 Web 기반 채팅 패널 MVP입니다.

## 실행

```sh
npm install
npm run dev
# 또는 native dock host
npm run tauri dev
```

MonaHub Host는 실제 창 rect가 바뀔 때마다 `sync_to_hub_rect`를 호출합니다. 펼치기는 `expand_flex`, 접기는 `collapse_flex` 명령을 사용합니다.
