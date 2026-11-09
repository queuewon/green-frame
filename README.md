# GreenFrame

**Node.js 복기용으로** `http` 모듈만 사용해 직접 만든 간단한 웹 프레임워크
Express가 내부에서 처리해 주는 동작(라우팅, 미들웨어, 바디 파싱, 정적 파일, 세션)을 직접 구현

<img width="1138" height="807" alt="스크린샷 2026-11-10 오전 4 16 34" src="https://github.com/user-attachments/assets/a54d2ee1-126f-4115-b94b-3bffd53925e7" />

## 구현 내용

- **코어 (`greenFrame.ts`)**: 메소드+경로 기반 라우팅, `next()` 미들웨어 파이프라인, `res.status` / `res.json` / `res.sendFile` 응답 헬퍼, 쿠키 파싱, 메모리 세션 저장소 및 만료 세션 정리
- **바디 파서 (`bodyParser.ts`)**: 스트림으로 들어오는 JSON 바디 조립, 1MB 페이로드 제한
- **정적 파일 (`staticMiddleware.ts`)**: `public/` 파일 서빙, 경로 탈출(`../`) 방어
- **세션 인증 (`server.ts`)**: 로그인 시 세션 토큰 발급(`HttpOnly`, `SameSite=Strict` 쿠키), 프로필 조회 시 세션 검증 및 롤링 연장
- **리버스 프록시 (`proxy.ts`)**: 라운드로빈 로드밸런싱, `X-Forwarded-For` 전달, 백엔드 장애 시 502 응답

## 실행

```bash
npm install
npx tsx src/server.ts   # http://localhost:6500
npx tsx src/proxy.ts    # http://localhost:9000 (backends 배열에 대상 서버 등록 필요)
```

## API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/login` | `{ "id": "user1", "password": "1234" }` 로그인, 세션 쿠키 발급 |
| GET | `/api/profile` | 세션 쿠키 검증 후 사용자 이름 반환, 세션 1시간 연장 |

## 구조

```
src/
├── greenFrame.ts        # 프레임워크 코어
├── bodyParser.ts        # JSON 바디 파서 미들웨어
├── staticMiddleware.ts  # 정적 파일 미들웨어
├── server.ts            # 예제 서버 (로그인/프로필)
├── proxy.ts             # 리버스 프록시
└── types.ts             # 공용 타입, http 모듈 타입 보강
public/
├── index.html
└── styles.css
```
