# bitcoin-content

Bitcoin Core RPC API를 시각화하는 Vue/Vite 프론트엔드입니다. 최신 블록 스택과 현재 채굴 중인 `ING` 블록을 보여주며, 10초 폴링에서 새 블록이 감지되면 `ING` 블록이 실제 블록으로 전환되는 듯한 적재 애니메이션을 표시합니다.

## 보안 원칙

- 실제 API URL, API 키, SSH 별칭, onion 주소, Cloudflare 터널 주소는 이 저장소에 커밋하지 않습니다.
- `.env`와 `.env.local`은 `.gitignore`에 포함되어 있으므로 로컬에서만 관리합니다.
- README나 코드 주석에는 운영 인프라의 실제 접속 정보를 적지 않습니다.
- 외부 API 호출은 `VITE_BTC_API_BASE_URL`과 `VITE_BTC_API_KEY`를 통해서만 설정합니다.
- 브라우저용 Vite 환경 변수는 빌드 결과에 포함될 수 있으므로, 공개 배포 환경에서는 API 키 권한을 읽기 전용으로 제한하고 필요하면 서버 프록시를 둡니다.
- 운영 접속 절차나 민감한 서버 정보가 필요하면 로컬 개인 문서를 확인하되, 그 내용을 프로젝트 파일로 옮기지 않습니다.

## 로컬 실행

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에는 실제 값을 직접 넣습니다. 값은 커밋하지 않습니다.

```text
VITE_BTC_API_BASE_URL=https://example.invalid
VITE_BTC_API_KEY=replace-with-local-secret
```

## 스크립트

- `npm run dev`: Vite 개발 서버를 `127.0.0.1`에만 바인딩합니다.
- `npm run typecheck`: Vue/TypeScript 타입 검사만 실행합니다.
- `npm run build`: 타입 검사 후 프로덕션 빌드를 생성합니다.
- `npm run preview`: 빌드 결과를 로컬에서 미리 봅니다.

## 주요 파일

- `src/App.vue`: 블록 스택, 스크롤바, 모달, 10초 폴링, 신규 블록 애니메이션 상태를 관리합니다.
- `src/components/Block.vue`: 개별 블록의 3D 레고 형태 UI와 `ING`/신규 블록 애니메이션을 담당합니다.
- `src/api.ts`: Bitcoin API 호출 래퍼와 응답 타입을 정의합니다.
- `src/styles.css`: 전역 배경과 기본 스타일을 정의합니다.
- `.env.example`: 공개 가능한 환경 변수 이름과 더미 값만 둡니다.

## API 계약

프론트엔드는 아래 엔드포인트가 있다고 가정합니다. 실제 호스트와 키는 환경 변수로 주입합니다.

- `GET /api/v1/status`: 현재 체인 높이를 가져옵니다.
- `GET /api/v1/blocks?from={height}&to={height}`: 화면에 필요한 블록 상세를 범위로 가져옵니다.
- `GET /api/v1/block/{height}`: 블록 클릭 시 보상, 수수료, 거래 요약, Coinbase 메시지가 포함된 상세를 가져옵니다.
- `GET /api/v1/block/{height}/transactions?offset={offset}&limit={limit}`: 전체화면 거래내역 모달에서 블록 거래 요약을 페이지 단위로 가져옵니다. 응답은 `{ height, total, offset, limit, next_offset, has_more, transactions }` 형태이며, `transactions` 항목은 `txid`, `hash`, `is_coinbase`, `output_satoshi`, `fee_satoshi`, `vsize`, `size`, `weight`, `vin_count`, `vout_count`를 포함합니다.
- `GET /api/v1/mempool`: `ING` 블록 클릭 시 Bitcoin Core `getmempoolinfo` 기반 mempool 현황을 가져옵니다.
- `GET /api/v1/server-status`: 왼쪽 하단 서버 상태 패널에 필요한 시스템/Bitcoin 상태를 가져옵니다.

요청 헤더는 `VITE_BTC_API_KEY`가 있을 때만 `X-API-Key`를 추가합니다.

## 블록 표시 흐름

- 초기 로딩에서 `/api/v1/status`로 `tipHeight`를 가져옵니다.
- 화면 높이에 따라 `visibleCount`를 계산하고 최신 블록 범위를 로드합니다.
- `visibleBlocks`는 `visibleStartHeight`부터 `tipHeight`까지 필요한 블록을 계산합니다.
- 맨 위에는 항상 `tipHeight + 1` 높이의 `ING` 블록이 표시됩니다.
- 10초마다 `/api/v1/status`를 다시 호출해 새 높이를 확인합니다.
- 새 높이가 감지되면 `oldTip + 1`부터 `newTip`까지를 신규 블록으로 표시하고, 최신 화면 범위만 애니메이션 대상으로 잡습니다.
- 신규 블록 상세는 이후 `fetchVisibleBlocks()`가 채웁니다.

## 신규 블록 애니메이션

관련 구현 위치는 `src/App.vue`와 `src/components/Block.vue`입니다.

- `TransitionGroup`이 스택 행 이동을 자연스럽게 처리합니다.
- `newlyMinedBlockDelays`가 신규 블록 높이별 애니메이션 지연 시간을 저장합니다.
- `markNewlyMinedBlocks()`는 한 번에 여러 블록이 들어와도 최신 화면 범위만 순차적으로 애니메이션합니다.
- `Block.vue`의 `isNew` prop이 실제 블록 전환 효과를 켭니다.
- `isIng` prop은 회색 `ING` 블록의 pulse/dot 애니메이션을 유지합니다.

## 블록 상세 모달

- 블록을 클릭하면 목록용 데이터로 모달을 먼저 열고, `/api/v1/block/{height}`로 상세 데이터를 다시 가져옵니다.
- 채굴 보조금, 총 수수료, 총 보상, 평균 수수료, 거래 요약, 채굴자 Coinbase 메시지를 표시합니다.
- 각 주요 항목 옆의 `?` 아이콘은 해당 값의 의미를 설명하는 툴팁입니다.
- 툴팁은 모달 스크롤 영역 밖으로 잘리지 않도록 화면 기준으로 표시됩니다.
- 거래 요약 목록은 상세 모달에서 처음 5개만 표시합니다.
- `거래내역 더보기`를 누르면 전체화면 거래내역 모달이 열리고, 아래로 스크롤할 때 `/api/v1/block/{height}/transactions`를 `offset`/`limit` 기반으로 계속 호출합니다.

## 서버 상태 패널

- `src/components/ServerStatusPanel.vue`가 왼쪽 하단 서버/네트워크/Mempool 아이콘 dock을 렌더링합니다.
- 서버 아이콘은 클릭 시 서버 상태 패널을 열고, 네트워크/Mempool/설정 아이콘은 각각 관련 모달을 엽니다.
- 30초마다 `/api/v1/server-status`를 호출합니다.
- 메모리, 루트 디스크, Bitcoin 장부 용량, 블록 높이, 동기화율, 네트워크 연결 수, 서버 시간을 표시합니다.
- API 응답과 UI에는 실제 서버 경로, 호스트명, IP, 터널 주소, API 키를 표시하지 않습니다.

## 금액 표기

- 왼쪽 하단 설정 아이콘에서 `BTC`와 `sats` 표기를 선택합니다.
- 선택값은 `localStorage`에 저장됩니다.
- `BTC` 표기는 불필요한 뒤쪽 0을 숨기고, 소수부가 있을 때 4자리 단위로 띄어 씁니다. 예: `0.0000 0594 BTC`.

## 작업 시 주의

- 기존 사용자 변경이 있을 수 있으므로 수정 전에 `git status --short`와 관련 파일 diff를 확인합니다.
- `.env`, 서버 접속 정보, 실제 API 키, 실제 터널 URL은 읽거나 출력하거나 커밋하지 않습니다.
- UI 변경 후에는 최소 `npm run build`를 실행해 `vue-tsc`와 Vite 빌드를 확인합니다.
- `dist/`는 빌드 산출물이며 커밋 대상이 아닙니다.
- 보안 관련 값을 문서화해야 할 때는 변수명과 더미 값만 사용합니다.
