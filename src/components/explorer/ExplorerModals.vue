<template>
  <div
    v-if="networkModalVisible"
    class="block-modal dock-modal"
    :class="`block-modal-${variant}`"
    @click="closeNetworkModal"
    @wheel.stop
  >
    <div class="modal-card dock-info-card network-card" @click.stop>
      <button class="modal-close" @click="closeNetworkModal">&times;</button>
      <div class="modal-header dock-modal-header">
        <span>네트워크 상태</span>
        비트코인 한눈에 보기
      </div>
      <div class="modal-body dock-info-body">
        <section class="modal-hero-card">
          <div>
            <span class="modal-label">지금 네트워크는</span>
            <strong>{{ mempoolStatusLabel }}</strong>
          </div>
          <p>{{ mempoolStatusDescription }}</p>
        </section>

        <div class="metric-grid">
          <div class="metric-tile">
            <span class="modal-label">최신 블록</span>
            <strong>#{{ formatNumber(tipHeight) }}</strong>
            <small>가장 최근 쌓인 블록</small>
          </div>
          <div class="metric-tile">
            <span class="modal-label">다음 블록</span>
            <strong>#{{ formatNumber(tipHeight + 1) }}</strong>
            <small>채굴 대기 중</small>
          </div>
          <div class="metric-tile">
            <span class="modal-label">현재 보상</span>
            <strong>{{ formatBTCAmount(currentBlockReward) }}</strong>
            <small>블록마다 새로 발행</small>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">다가오는 일정</div>
          <div class="event-list">
            <div class="event-card">
              <span>반감기</span>
              <strong>#{{ formatNumber(nextHalvingHeight) }}</strong>
              <small>{{ blocksToHalving.toLocaleString('ko-KR') }} 블록 남음 · 약 {{ formatDuration(blocksToHalving * 10) }}</small>
            </div>
            <div class="event-card">
              <span>난이도 조정</span>
              <strong>#{{ formatNumber(nextDifficultyHeight) }}</strong>
              <small>{{ blocksToDifficulty.toLocaleString('ko-KR') }} 블록 남음 · 약 {{ formatDuration(blocksToDifficulty * 10) }}</small>
            </div>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">밈풀 이해하기</div>
          <p class="modal-help-text">
            밈풀은 아직 블록에 들어가지 못한 거래들이 잠시 줄 서 있는 대기실입니다.
            줄이 길거나 수수료율이 높으면 다음 블록에 빨리 들어가기 위해 더 높은 수수료가 필요할 수 있습니다.
          </p>

          <div v-if="mempoolLoading" class="skeleton-panel">
            <div class="skeleton-line wide"></div>
            <div class="skeleton-grid">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <template v-else-if="mempoolData">
            <div class="mempool-summary">
              <div>
                <span class="status-dot" :class="mempoolStatusClass"></span>
                <strong>{{ mempoolStatusLabel }}</strong>
              </div>
              <p>{{ mempoolStatusDescription }}</p>
            </div>

            <div class="metric-grid">
              <div class="metric-tile">
                <span class="modal-label">대기 거래</span>
                <strong>{{ mempoolData.size.toLocaleString('ko-KR') }} tx</strong>
                <small>아직 블록에 안 들어간 거래</small>
              </div>
              <div class="metric-tile">
                <span class="modal-label">평균 수수료율</span>
                <strong>{{ averageMempoolFeeRate.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) }} sat/vB</strong>
                <small>높을수록 붐비는 편</small>
              </div>
              <div class="metric-tile">
                <span class="modal-label">총 크기</span>
                <strong>{{ formatSize(mempoolData.bytes) }}</strong>
                <small>대기열 데이터 크기</small>
              </div>
              <div class="metric-tile">
                <span class="modal-label">최저 수수료</span>
                <strong>{{ btcPerKvBToSatPerVByte(mempoolData.mempoolminfee).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) }} sat/vB</strong>
                <small>노드가 받아들이는 기준</small>
              </div>
            </div>

            <div class="usage-card">
              <div>
                <span class="modal-label">메모리풀 용량</span>
                <strong>{{ formatSize(mempoolData.usage) }} / {{ formatSize(mempoolData.maxmempool) }}</strong>
              </div>
              <div class="usage-bar">
                <span :style="{ width: mempoolUsagePercent + '%' }"></span>
              </div>
            </div>
          </template>
          <div v-else class="modal-state error">밈풀 데이터를 불러오지 못했습니다.</div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="settingsModalVisible"
    class="block-modal dock-modal"
    :class="`block-modal-${variant}`"
    @click="closeSettingsModal"
    @wheel.stop
  >
    <div class="modal-card dock-info-card settings-card" @click.stop>
      <button class="modal-close" @click="closeSettingsModal">&times;</button>
      <div class="modal-header dock-modal-header">
        <span>화면 설정</span>
        표기 설정
      </div>
      <div class="modal-body">
        <div class="modal-section">
          <div class="modal-section-title">금액 단위</div>
          <div class="unit-options">
            <button
              class="unit-option"
              :class="{ active: displayUnit === 'btc' }"
              type="button"
              @click="setDisplayUnit('btc')"
            >
              <strong>BTC</strong>
              <span>0.0000 0000 형식</span>
            </button>
            <button
              class="unit-option"
              :class="{ active: displayUnit === 'sats' }"
              type="button"
              @click="setDisplayUnit('sats')"
            >
              <strong>sats</strong>
              <span>정수 사토시 형식</span>
            </button>
          </div>
          <div class="modal-state">선택한 단위는 이 브라우저에 저장되어 다음 방문에도 유지됩니다.</div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">기록 시간 표기</div>
          <div class="unit-options">
            <button
              class="unit-option"
              :class="{ active: timeDisplayMode === 'local' }"
              type="button"
              @click="setTimeDisplayMode('local')"
            >
              <strong>브라우저 시간</strong>
              <span>내 기기의 시간대로 자동 표시</span>
            </button>
            <button
              class="unit-option"
              :class="{ active: timeDisplayMode === 'utc' }"
              type="button"
              @click="setTimeDisplayMode('utc')"
            >
              <strong>UTC</strong>
              <span>UTC 기준으로 변환 표시</span>
            </button>
          </div>
          <div class="modal-state">현재 시간 표기는 {{ blockTimeModeLabel }}입니다.</div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="selectedBlock"
    class="block-modal"
    :class="`block-modal-${variant}`"
    @click.self="closeBlockDetail"
    @wheel.stop
  >
    <div class="modal-card detail-card" @click.stop>
      <button class="modal-close" @click="closeBlockDetail">&times;</button>
      <div class="modal-header detail-header">
        <span>블록 상세</span>
        #{{ formatNumber(selectedBlock.height) }}
      </div>
      <div ref="detailBodyRef" class="modal-body detail-body">
        <div v-if="selectedBlockError" class="modal-state error">{{ selectedBlockError }}</div>

        <section class="detail-hero-card">
          <span class="modal-label">요약</span>
          <p v-if="selectedBlockLoading">
            블록 안의 거래, 채굴 보상, 기술 정보를 불러오고 있습니다.
          </p>
          <p v-else>
            이 블록에는 {{ blockTxCount(selectedBlock).toLocaleString('ko-KR') }}개의 거래가 담겨 있습니다.
            채굴자는 새로 발행된 보조금과 거래 수수료를 함께 받습니다.
          </p>
        </section>

        <div class="detail-summary-grid">
          <div class="metric-tile">
            <span class="modal-label">기록 시간 <InfoTip text="블록 헤더에 채굴자가 넣은 시간값입니다. 채굴자가 어느 정도 임의로 넣을 수 있지만, 노드들은 이전 블록들의 중앙값보다 커야 하고 네트워크 시간보다 너무 미래이면 거부하는 방식으로 과도한 조작을 제한합니다." /></span>
            <span v-if="selectedBlockLoading" class="inline-skeleton wide"></span>
            <strong v-else>{{ formatBlockTime(selectedBlock.time) }}</strong>
            <small>{{ blockTimeModeLabel }}</small>
          </div>
          <div class="metric-tile">
            <span class="modal-label">거래 수</span>
            <span v-if="selectedBlockLoading" class="inline-skeleton"></span>
            <strong v-else>{{ blockTxCount(selectedBlock).toLocaleString('ko-KR') }} tx</strong>
            <small>블록에 포함된 전체 거래</small>
          </div>
          <div class="metric-tile reward-tile">
            <span class="modal-label">총 보상 <InfoTip text="채굴자가 이 블록으로 받은 총액입니다. 새로 발행된 보조금과 블록에 포함된 거래 수수료의 합입니다." /></span>
            <span v-if="selectedBlockLoading" class="inline-skeleton"></span>
            <strong v-else>{{ formatBlockReward(selectedBlock) }}</strong>
            <small>보조금 + 거래 수수료</small>
            <details v-if="!selectedBlockLoading" class="metric-breakdown">
              <summary>계산 보기</summary>
              <div>
                <span>보조금</span>
                <strong>{{ formatBlockSubsidy(selectedBlock) }}</strong>
              </div>
              <div>
                <span>거래 수수료</span>
                <strong>{{ formatSatoshiAmount(selectedBlock.total_fee_satoshi) }}</strong>
              </div>
            </details>
          </div>
          <div class="metric-tile fee-rate-tile">
            <span class="modal-label">평균 수수료율</span>
            <span v-if="selectedBlockLoading" class="inline-skeleton"></span>
            <strong v-else>{{ formatFeeRate(selectedBlock.avg_fee_rate) }}</strong>
            <small>거래 크기당 평균 비용</small>
          </div>
        </div>

        <template v-if="selectedBlockLoading">
          <div class="detail-skeleton-panel">
            <div class="skeleton-line wide"></div>
            <div class="skeleton-grid">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="detail-skeleton-panel">
            <div class="skeleton-line"></div>
            <div class="skeleton-line wide"></div>
            <div class="skeleton-line wide"></div>
          </div>
          <div class="detail-skeleton-panel">
            <div class="skeleton-line"></div>
            <div class="tx-skeleton-list">
              <div v-for="index in 3" :key="index" class="tx-skeleton-item">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <section v-if="selectedBlock.coinbase_message" class="detail-section-card message-card">
            <div class="detail-section-heading">
              <div class="modal-section-title">채굴자 메시지 <InfoTip text="Coinbase 거래 안에 채굴자나 채굴 풀이 남긴 임의의 텍스트입니다. 모든 블록에 사람이 읽을 수 있는 메시지가 있는 것은 아닙니다." /></div>
              <p>Coinbase 거래 안에 남겨진 텍스트입니다.</p>
            </div>
            <div class="modal-row">
              <span class="modal-value modal-message">{{ selectedBlock.coinbase_message }}</span>
            </div>
          </section>

          <section class="detail-section-card">
            <div class="detail-section-heading">
              <div class="modal-section-title">블록 식별 정보</div>
              <p>해시와 머클 루트는 이 블록과 거래 묶음을 검증할 때 쓰는 핵심 지문입니다. 시간은 위의 기록 시간 카드에서만 표시합니다.</p>
            </div>
            <div class="modal-row">
              <span class="modal-label">해시 <InfoTip text="블록을 고유하게 식별하는 64자리 지문입니다. 블록 내용이 조금이라도 바뀌면 해시도 달라집니다." /></span>
              <span class="modal-value modal-hash">{{ selectedBlock.hash ?? '---' }}</span>
            </div>
            <div class="modal-row">
              <span class="modal-label">머클 루트 <InfoTip text="블록 안의 모든 거래를 트리 구조로 묶어 최종적으로 하나의 해시로 요약한 값입니다. 특정 거래가 이 블록에 포함됐는지 빠르게 증명할 때 사용됩니다." /></span>
              <span class="modal-value modal-hash">{{ selectedBlock.merkle_root ?? '---' }}</span>
            </div>
            <details class="detail-explainer">
              <summary>머클 루트가 뭔가요?</summary>
              <p>
                거래 해시들을 둘씩 묶어 다시 해시하고, 그 결과를 또 둘씩 묶는 과정을 반복하면 맨 위에 하나의 해시가 남습니다.
                그 값이 머클 루트입니다.
              </p>
              <p>
                그래서 전체 거래 목록을 모두 다시 내려받지 않아도, 일부 경로만으로 특정 거래가 이 블록 안에 들어 있다는 것을 검증할 수 있습니다.
              </p>
            </details>
          </section>

          <section class="detail-section-card">
            <div class="detail-section-heading">
              <div class="modal-section-title">채굴 수익</div>
              <p>채굴자는 새 BTC 보조금과 블록에 들어간 거래 수수료를 받습니다.</p>
            </div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">보조금 <InfoTip text="새 블록을 만든 채굴자에게 새로 발행되어 지급되는 BTC입니다. 반감기마다 줄어듭니다." /></span>
                <span class="modal-value">{{ formatBlockSubsidy(selectedBlock) }}</span>
              </div>
              <div>
                <span class="modal-label">수수료 <InfoTip text="이 블록에 포함된 거래들이 낸 수수료의 합계입니다. 채굴자는 보조금과 함께 이 수수료를 받습니다." /></span>
                <span class="modal-value">{{ formatSatoshiAmount(selectedBlock.total_fee_satoshi) }}</span>
              </div>
            </div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">총 보상 <InfoTip text="채굴자가 받은 총액입니다. 보조금과 거래 수수료를 더한 값입니다." /></span>
                <span class="modal-value">{{ formatBlockReward(selectedBlock) }}</span>
              </div>
              <div>
                <span class="modal-label">평균 수수료 <InfoTip text="블록 안의 일반 거래들이 평균적으로 낸 수수료입니다. Coinbase 거래는 제외됩니다." /></span>
                <span class="modal-value">{{ formatSatoshiAmount(selectedBlock.avg_fee_satoshi) }}</span>
              </div>
            </div>
          </section>

          <section class="detail-section-card">
            <div class="detail-section-heading">
              <div class="modal-section-title">거래내역 <InfoTip text="블록에 포함된 거래 요약입니다. 화면에는 처음 일부 거래만 표시하고, 전체 거래 수는 별도로 보여줍니다." /></div>
              <p>첫 거래는 채굴 보상을 받는 Coinbase 거래이고, 아래 ID는 줄이지 않은 전체값입니다.</p>
            </div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">거래 수 <InfoTip text="이 블록 안에 들어 있는 전체 거래 개수입니다. 첫 거래는 항상 Coinbase 거래입니다." /></span>
                <span class="modal-value">{{ blockTxCount(selectedBlock).toLocaleString('ko-KR') }} tx</span>
              </div>
              <div>
                <span class="modal-label">평균 수수료율 <InfoTip text="거래 데이터 크기(vB)당 평균 수수료입니다. 수수료 시장이 얼마나 비싼지 보는 지표입니다." /></span>
                <span class="modal-value">{{ formatFeeRate(selectedBlock.avg_fee_rate) }}</span>
              </div>
            </div>

            <div v-if="previewTransactions.length" class="tx-list">
              <div v-for="(tx, index) in previewTransactions" :key="tx.txid || tx.hash || index" class="tx-item">
                <div class="tx-head">
                  <span class="tx-kind">{{ tx.is_coinbase ? 'Coinbase' : `TX ${index + 1}` }}</span>
                  <span>{{ tx.vin_count ?? 0 }} in / {{ tx.vout_count ?? 0 }} out</span>
                </div>
                <div class="txid-card">
                  <span class="modal-label">트랜잭션 ID</span>
                  <code>{{ tx.txid || tx.hash || '---' }}</code>
                </div>
                <div class="tx-meta">
                  <span>출력 {{ formatSatoshiAmount(tx.output_satoshi) }}</span>
                  <span>{{ tx.is_coinbase ? '채굴 보상 거래' : `수수료 ${formatSatoshiAmount(tx.fee_satoshi)}` }}</span>
                  <span>{{ tx.vsize ?? tx.size ?? '---' }} vB</span>
                </div>
              </div>
              <button
                v-if="hasMoreTransactions"
                class="tx-more-button"
                type="button"
                @click.stop="openTransactionHistory"
              >
                거래내역 더보기
                <span>{{ blockTxCount(selectedBlock).toLocaleString('ko-KR') }}개 보기</span>
              </button>
              <div class="tx-note">
                상세 화면에는 처음 {{ DETAIL_TRANSACTION_PREVIEW_LIMIT }}개만 표시합니다.
              </div>
            </div>
            <div v-else class="modal-state">거래 요약을 불러오지 못했습니다.</div>
          </section>

          <section class="detail-section-card">
            <div class="detail-section-heading">
              <div class="modal-section-title">작업증명 정보</div>
              <p>채굴자는 블록 헤더 해시가 목표값보다 작아질 때까지 Nonce 등을 바꿔가며 반복해서 시도합니다.</p>
            </div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">난이도 <InfoTip text="이 블록을 찾기 위해 필요한 작업량입니다. 값이 클수록 올바른 해시를 찾기 어렵습니다." /></span>
                <span class="modal-value">{{ selectedBlock.difficulty?.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) ?? '---' }}</span>
              </div>
              <div>
                <span class="modal-label">Nonce <InfoTip text="채굴자가 목표 해시를 찾기 위해 바꿔가며 시도한 숫자입니다." /></span>
                <span class="modal-value">{{ selectedBlock.nonce?.toLocaleString('ko-KR') ?? '---' }}</span>
              </div>
            </div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">블록 크기 <InfoTip text="블록 데이터의 실제 바이트 크기입니다." /></span>
                <span class="modal-value">{{ formatSize(selectedBlock.size) }}</span>
              </div>
              <div>
                <span class="modal-label">해시레이트 <InfoTip text="최근 블록 간격과 난이도로 추정한 네트워크 전체 연산 속도입니다." /></span>
                <span class="modal-value">{{ formatHashrate(selectedBlock.hashrate_estimate) }}</span>
              </div>
            </div>

            <div v-if="selectedBlock.bits" class="modal-row">
              <span class="modal-label">Bits <InfoTip text="현재 난이도 목표값을 압축해 표현한 블록 헤더 필드입니다." /></span>
              <span class="modal-value">{{ selectedBlock.bits }}</span>
            </div>

            <details class="detail-explainer pow-explainer">
              <summary>난이도, Nonce, 검증 공식 보기</summary>
              <p>
                비트코인은 블록 헤더를 해시한 결과가 네트워크 목표값보다 작아야 정답으로 인정합니다.
                난이도가 높다는 것은 목표값이 더 낮아져 맞출 확률이 작아졌다는 뜻입니다.
              </p>
              <code class="formula-line">hash256(block header) &lt;= target</code>
              <code class="formula-line">difficulty = difficulty_1_target / target</code>
              <p>
                Nonce는 채굴자가 계속 바꿔 넣는 숫자입니다. Nonce만으로 답이 안 나오면 시간이나 Coinbase 영역도 바꿔
                새로운 해시 조합을 계속 시도합니다.
              </p>
              <p>
                검증자는 받은 블록 헤더를 같은 방식으로 두 번 SHA-256 해시한 뒤, 그 숫자가 Bits에서 풀어낸 목표값 이하인지 확인합니다.
              </p>
            </details>
          </section>

          <div class="modal-badges">
            <div v-if="isDifficultyAdjustment(selectedBlock.height)" class="modal-badge difficulty">
              난이도 조정 블록
            </div>
            <div v-if="isHalving(selectedBlock.height)" class="modal-badge halving">
              반감기 블록
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <div
    v-if="selectedBlock && transactionHistoryVisible"
    class="block-modal tx-history-modal"
    :class="`block-modal-${variant}`"
    @wheel.stop
  >
    <div class="modal-card tx-history-card" @click.stop>
      <div class="tx-history-header">
        <button
          class="modal-back"
          type="button"
          aria-label="블록 상세로 돌아가기"
          @click.stop="closeTransactionHistory"
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <div>
          <span>거래내역</span>
          <strong>#{{ formatNumber(selectedBlock.height) }}</strong>
        </div>
        <button
          class="modal-close tx-history-close"
          type="button"
          aria-label="거래내역 닫기"
          @click.stop="closeTransactionHistory"
        >
          &times;
        </button>
      </div>

      <div ref="transactionHistoryBodyRef" class="modal-body tx-history-body" @scroll="handleTransactionHistoryScroll">
        <section class="tx-history-summary">
          <span class="modal-label">표시 중인 거래</span>
          <strong>
            {{ transactionHistory.length.toLocaleString('ko-KR') }} /
            {{ transactionHistoryDisplayTotal.toLocaleString('ko-KR') }}개
          </strong>
          <p v-if="transactionHistoryError && !transactionHistoryHasMore">
            거래 페이지 API가 연결되기 전에는 블록 상세 응답에 포함된 거래만 보여줍니다.
            API가 준비되면 스크롤로 다음 거래를 자동으로 불러옵니다.
          </p>
          <p v-else>
            아래로 스크롤하면 다음 거래 페이지를 자동으로 불러옵니다.
            트랜잭션 ID는 줄이지 않고 전체값으로 표시합니다.
          </p>
        </section>

        <div v-if="transactionHistoryLoading" class="tx-history-loading">
          <div v-for="index in 5" :key="index" class="tx-skeleton-item">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div v-else-if="transactionHistory.length" class="tx-list tx-list-full">
          <div v-for="(tx, index) in transactionHistory" :key="tx.txid || tx.hash || index" class="tx-item">
            <div class="tx-head">
              <span class="tx-kind">{{ tx.is_coinbase ? 'Coinbase' : `TX ${index + 1}` }}</span>
              <span>{{ tx.vin_count ?? 0 }} in / {{ tx.vout_count ?? 0 }} out</span>
            </div>
            <div class="txid-card">
              <span class="modal-label">트랜잭션 ID</span>
              <code>{{ tx.txid || tx.hash || '---' }}</code>
            </div>
            <div class="tx-meta">
              <span>출력 {{ formatSatoshiAmount(tx.output_satoshi) }}</span>
              <span>{{ tx.is_coinbase ? '채굴 보상 거래' : `수수료 ${formatSatoshiAmount(tx.fee_satoshi)}` }}</span>
              <span>{{ tx.vsize ?? tx.size ?? '---' }} vB</span>
            </div>
          </div>
          <div v-if="transactionHistoryLoadingMore" class="tx-history-loading compact">
            <div v-for="index in 2" :key="index" class="tx-skeleton-item">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div v-if="transactionHistoryError" class="modal-state error">{{ transactionHistoryError }}</div>
          <div v-else-if="transactionHistoryHasMore" class="tx-note">
            계속 스크롤하면 다음 거래내역을 자동으로 불러옵니다.
          </div>
          <div v-else class="tx-note">
            표시 가능한 거래내역의 끝입니다.
          </div>
        </div>
        <div v-else-if="transactionHistoryError" class="modal-state error">{{ transactionHistoryError }}</div>
        <div v-else class="modal-state">거래 요약을 불러오지 못했습니다.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import type { DeviceKind } from '@/composables/useDeviceKind'
import type { BitcoinExplorerController } from '@/composables/useBitcoinExplorer'

const props = defineProps<{
  explorer: BitcoinExplorerController
  variant: DeviceKind
}>()

const {
  tipHeight,
  selectedBlock,
  selectedBlockLoading,
  selectedBlockError,
  networkModalVisible,
  settingsModalVisible,
  mempoolData,
  mempoolLoading,
  displayUnit,
  timeDisplayMode,
  blockTimeModeLabel,
  nextHalvingHeight,
  blocksToHalving,
  nextDifficultyHeight,
  blocksToDifficulty,
  currentBlockReward,
  averageMempoolFeeRate,
  selectedTransactions,
  transactionHistoryVisible,
  transactionHistory,
  transactionHistoryLoading,
  transactionHistoryLoadingMore,
  transactionHistoryError,
  transactionHistoryHasMore,
  transactionHistoryDisplayTotal,
  closeModal,
  closeNetworkModal,
  closeSettingsModal,
  openTransactionHistory,
  closeTransactionHistory,
  loadMoreBlockTransactions,
  setDisplayUnit,
  setTimeDisplayMode,
  formatDuration,
  formatNumber,
  isDifficultyAdjustment,
  isHalving,
  formatBlockTime,
  formatSatoshiAmount,
  formatBTCAmount,
  formatBlockSubsidy,
  formatBlockReward,
  blockTxCount,
  formatFeeRate,
  formatSize,
  btcPerKvBToSatPerVByte,
  formatHashrate
} = props.explorer

const DETAIL_TRANSACTION_PREVIEW_LIMIT = 5
const detailBodyRef = ref<HTMLElement | null>(null)
const transactionHistoryBodyRef = ref<HTMLElement | null>(null)

const previewTransactions = computed(() => {
  return selectedTransactions.value.slice(0, DETAIL_TRANSACTION_PREVIEW_LIMIT)
})

const hasMoreTransactions = computed(() => {
  if (selectedBlock.value) {
    return blockTxCount(selectedBlock.value) > DETAIL_TRANSACTION_PREVIEW_LIMIT
  }
  return selectedTransactions.value.length > DETAIL_TRANSACTION_PREVIEW_LIMIT
})

function closeBlockDetail() {
  closeTransactionHistory()
  closeModal()
}

function handleTransactionHistoryScroll(event: Event) {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return

  const threshold = 180
  const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (distanceToBottom <= threshold) {
    loadMoreBlockTransactions()
  }
}

watch(
  [() => selectedBlock.value?.height, selectedBlockLoading],
  async ([height]) => {
    if (height == null) return
    await nextTick()
    detailBodyRef.value?.scrollTo({ top: 0 })
  },
  { flush: 'post' }
)

watch(
  transactionHistoryVisible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    transactionHistoryBodyRef.value?.scrollTo({ top: 0 })
  },
  { flush: 'post' }
)

const mempoolUsagePercent = computed(() => {
  if (!mempoolData.value || mempoolData.value.maxmempool <= 0) return 0
  return Math.max(0, Math.min(100, (mempoolData.value.usage / mempoolData.value.maxmempool) * 100))
})

const mempoolStatusLevel = computed<'quiet' | 'normal' | 'busy' | 'crowded'>(() => {
  const data = mempoolData.value
  if (!data) return 'normal'

  const feeRate = averageMempoolFeeRate.value
  if (data.size < 10000 && feeRate < 5) return 'quiet'
  if (data.size < 50000 && feeRate < 20) return 'normal'
  if (data.size < 150000 && feeRate < 60) return 'busy'
  return 'crowded'
})

const mempoolStatusClass = computed(() => `status-${mempoolStatusLevel.value}`)

const mempoolStatusLabel = computed(() => {
  if (mempoolLoading.value) return '상태 확인 중'
  if (!mempoolData.value) return '대기열 확인 필요'

  return {
    quiet: '한산한 편',
    normal: '보통 수준',
    busy: '조금 붐빔',
    crowded: '많이 붐빔'
  }[mempoolStatusLevel.value]
})

const mempoolStatusDescription = computed(() => {
  if (mempoolLoading.value) return '거래 대기열과 수수료 흐름을 확인하고 있습니다.'
  if (!mempoolData.value) return '밈풀 데이터를 가져오면 거래 대기열의 혼잡도를 쉽게 볼 수 있습니다.'

  return {
    quiet: '대기 중인 거래가 많지 않아 비교적 여유로운 상태입니다.',
    normal: '대기열이 안정적입니다. 일반적인 수수료로도 다음 블록을 기대할 수 있습니다.',
    busy: '대기 거래가 늘고 있습니다. 빠른 처리를 원하면 수수료율을 더 신경 써야 합니다.',
    crowded: '대기열이 많이 붐빕니다. 낮은 수수료 거래는 블록에 들어가기까지 오래 걸릴 수 있습니다.'
  }[mempoolStatusLevel.value]
})
</script>

<style scoped lang="scss">
.block-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 24px;
  background: rgba(18, 32, 29, 0.24);
  backdrop-filter: blur(8px) saturate(1.15);
  -webkit-backdrop-filter: blur(8px) saturate(1.15);
  touch-action: pan-y;
}

.block-modal.dock-modal {
  z-index: 20;
}

.modal-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.64), rgba(235, 248, 243, 0.36)),
    rgba(255, 253, 246, 0.44);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  padding: 24px;
  width: min(480px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  box-shadow: var(--glass-shadow), var(--glass-highlight);
  backdrop-filter: blur(28px) saturate(1.35);
  -webkit-backdrop-filter: blur(28px) saturate(1.35);
  animation: modal-in 0.25s ease;
}

.detail-card {
  height: calc(100vh - 48px);
  height: calc(100dvh - 48px);
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 14px;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 1.6rem;
  line-height: 1;
  color: rgba(23, 35, 31, 0.52);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.42);
    color: var(--danger);
  }
}

.modal-header {
  flex-shrink: 0;
  font-size: 1.4rem;
  font-weight: 950;
  color: var(--ink);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.42);
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  touch-action: pan-y;
}

.detail-body {
  gap: 12px;
}

.dock-modal-header {
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    color: rgba(49, 93, 80, 0.78);
    font-size: 0.68rem;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}

.dock-info-body {
  gap: 12px;
}

.modal-hero-card,
.detail-hero-card,
.detail-section-card,
.detail-skeleton-panel,
.mempool-summary,
.usage-card,
.metric-tile,
.event-card {
  background: rgba(33, 29, 23, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(12px) saturate(1.12);
  -webkit-backdrop-filter: blur(12px) saturate(1.12);
}

.modal-hero-card,
.detail-hero-card {
  padding: 14px;

  strong {
    display: block;
    margin-top: 4px;
    color: var(--ink);
    font-size: 1.28rem;
    font-weight: 950;
  }

  p {
    margin: 8px 0 0;
    color: var(--ink-muted);
    font-size: 0.78rem;
    font-weight: 750;
    line-height: 1.55;
  }
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    color: rgba(49, 93, 80, 0.78);
    font-size: 0.68rem;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}

.detail-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-section-card,
.detail-skeleton-panel {
  display: grid;
  gap: 11px;
  padding: 13px;
}

.message-card {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(213, 171, 85, 0.12)),
    rgba(255, 253, 246, 0.34);
  border-color: rgba(255, 255, 255, 0.42);
}

.detail-section-heading {
  display: grid;
  gap: 5px;

  .modal-section-title {
    margin-bottom: 0;
  }

  p {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.74rem;
    font-weight: 750;
    line-height: 1.45;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.metric-tile {
  min-width: 0;
  padding: 11px;

  strong {
    display: block;
    margin-top: 5px;
    color: var(--ink);
    font-size: 0.96rem;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  small {
    display: block;
    margin-top: 4px;
    color: rgba(23, 35, 31, 0.52);
    font-size: 0.66rem;
    font-weight: 800;
    line-height: 1.35;
  }
}

.reward-tile,
.fee-rate-tile {
  grid-column: 1 / -1;
}

.metric-breakdown {
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px solid rgba(33, 29, 23, 0.07);

  summary {
    color: #8d291f;
    font-size: 0.7rem;
    font-weight: 950;
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    &::after {
      content: " +";
    }
  }

  &[open] summary::after {
    content: " -";
  }

  div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 7px;
    color: rgba(33, 29, 23, 0.6);
    font-size: 0.7rem;
    font-weight: 800;

    strong {
      margin: 0;
      color: #211d17;
      font-size: 0.74rem;
      text-align: right;
    }
  }
}

.event-list {
  display: grid;
  gap: 8px;
}

.event-card {
  padding: 11px;

  span,
  small {
    display: block;
    color: rgba(33, 29, 23, 0.56);
    font-size: 0.68rem;
    font-weight: 850;
  }

  strong {
    display: block;
    margin: 4px 0;
    color: #211d17;
    font-size: 0.95rem;
    font-weight: 950;
  }
}

.modal-help-text {
  margin: 0 0 10px;
  color: rgba(33, 29, 23, 0.64);
  font-size: 0.78rem;
  font-weight: 750;
  line-height: 1.55;
}

.mempool-summary {
  padding: 12px;
  margin-bottom: 10px;
  background: rgba(111, 139, 132, 0.09);

  div {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  strong {
    color: #211d17;
    font-size: 0.92rem;
    font-weight: 950;
  }

  p {
    margin: 7px 0 0;
    color: rgba(33, 29, 23, 0.62);
    font-size: 0.74rem;
    font-weight: 760;
    line-height: 1.5;
  }
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #6f8b84;
  box-shadow: 0 0 0 4px rgba(111, 139, 132, 0.14);

  &.status-quiet {
    background: #4d9c61;
    box-shadow: 0 0 0 4px rgba(77, 156, 97, 0.14);
  }

  &.status-normal {
    background: #6f8b84;
  }

  &.status-busy {
    background: #d4a64b;
    box-shadow: 0 0 0 4px rgba(212, 166, 75, 0.15);
  }

  &.status-crowded {
    background: #c44838;
    box-shadow: 0 0 0 4px rgba(196, 72, 56, 0.14);
  }
}

.usage-card {
  padding: 11px;
  margin-top: 8px;

  strong {
    display: block;
    margin-top: 4px;
    color: #211d17;
    font-size: 0.86rem;
    font-weight: 950;
  }
}

.usage-bar {
  height: 8px;
  margin-top: 9px;
  overflow: hidden;
  background: rgba(33, 29, 23, 0.09);
  border-radius: 999px;

  span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #6f8b84, #d4a64b);
    border-radius: inherit;
  }
}

.skeleton-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  background: rgba(33, 29, 23, 0.04);
  border: 1px solid rgba(33, 29, 23, 0.06);
  border-radius: 12px;
}

.skeleton-line,
.skeleton-grid span,
.inline-skeleton,
.tx-skeleton-item span,
.server-skeleton-line {
  display: block;
  overflow: hidden;
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.44), transparent),
    rgba(33, 29, 23, 0.08);
  background-size: 220% 100%, 100% 100%;
  border-radius: 999px;
  animation: dock-skeleton-sweep 1.35s ease-in-out infinite;
}

.skeleton-line {
  width: 62%;
  height: 13px;

  &.wide {
    width: 84%;
  }
}

.skeleton-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  span {
    height: 54px;
    border-radius: 12px;
  }
}

.inline-skeleton {
  width: 70%;
  height: 18px;
  margin-top: 7px;
  border-radius: 8px;

  &.wide {
    width: 96%;
  }
}

.tx-skeleton-list {
  display: grid;
  gap: 8px;
}

.tx-skeleton-item {
  display: grid;
  gap: 8px;
  padding: 11px;
  background: rgba(255, 253, 248, 0.58);
  border: 1px solid rgba(33, 29, 23, 0.05);
  border-radius: 10px;

  span {
    height: 12px;

    &:first-child {
      width: 34%;
    }

    &:nth-child(2) {
      width: 100%;
      height: 34px;
      border-radius: 9px;
    }

    &:last-child {
      width: 70%;
    }
  }
}

.modal-row {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    > div {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  }
}

.modal-label {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(33, 29, 23, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.modal-value {
  font-size: 0.88rem;
  font-weight: 800;
  color: #211d17;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

.modal-hash {
  font-size: 0.78rem;
  color: rgba(33, 29, 23, 0.75);
}

.modal-message {
  font-size: 0.82rem;
  color: rgba(33, 29, 23, 0.85);
  white-space: pre-wrap;
  line-height: 1.5;
  background: rgba(255, 253, 248, 0.72);
  border: 1px solid rgba(141, 41, 31, 0.08);
  padding: 10px;
  border-radius: 9px;
}

.modal-section {
  padding: 12px 0;
  border-bottom: 1px solid rgba(141, 41, 31, 0.08);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
}

.modal-section-title {
  font-size: 0.8rem;
  font-weight: 900;
  color: rgba(33, 29, 23, 0.7);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.modal-state {
  padding: 8px 10px;
  color: var(--ink-muted);
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 800;

  &.error {
    color: var(--danger);
    background: rgba(255, 234, 225, 0.4);
    border-color: rgba(160, 74, 58, 0.18);
  }
}

.settings-card {
  width: min(360px, calc(100vw - 48px));
}

.unit-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.unit-option {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  color: rgba(23, 35, 31, 0.72);
  background: rgba(255, 255, 255, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, color 0.15s;

  strong {
    font-size: 0.9rem;
    font-weight: 950;
  }

  span {
    font-size: 0.7rem;
    font-weight: 800;
  }

  &:hover,
  &.active {
    color: #255c4b;
    background: rgba(142, 185, 177, 0.22);
    border-color: rgba(255, 255, 255, 0.56);
  }
}

.tx-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  max-height: 310px;
  overflow-y: auto;
  padding-right: 4px;
}

.tx-more-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 11px 12px;
  color: #255c4b;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.42), rgba(142, 185, 177, 0.16)),
    rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 950;
  cursor: pointer;

  span {
    color: rgba(37, 92, 75, 0.68);
    font-size: 0.68rem;
    font-weight: 850;
  }
}

.tx-item {
  display: grid;
  gap: 8px;
  padding: 11px;
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 10px;
}

.tx-head,
.tx-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: rgba(23, 35, 31, 0.58);
  font-size: 0.68rem;
  font-weight: 850;
  line-height: 1.35;
}

.tx-kind {
  color: #255c4b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.txid-card {
  display: grid;
  gap: 5px;
  padding: 9px;
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 8px;

  code {
    display: block;
    color: var(--ink);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.76rem;
    font-weight: 900;
    line-height: 1.42;
    overflow-wrap: anywhere;
    word-break: break-all;
    white-space: normal;
    user-select: text;
  }
}

.tx-meta {
  flex-wrap: wrap;
}

.tx-note {
  color: rgba(33, 29, 23, 0.54);
  font-size: 0.72rem;
  font-weight: 750;
}

.tx-history-modal {
  z-index: 170;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  background: rgba(18, 32, 29, 0.28);
  backdrop-filter: blur(10px) saturate(1.15);
  -webkit-backdrop-filter: blur(10px) saturate(1.15);
}

.tx-history-card {
  width: min(720px, 100vw);
  height: 100vh;
  height: 100dvh;
  max-height: none;
  padding: 0;
  border-radius: 0;
}

.tx-history-header {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: max(14px, env(safe-area-inset-top)) 14px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.42);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.68), rgba(236, 248, 243, 0.38)),
    rgba(255, 253, 246, 0.44);

  div {
    min-width: 0;
    text-align: center;
  }

  span {
    display: block;
    color: rgba(49, 93, 80, 0.78);
    font-size: 0.68rem;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: var(--ink);
    font-size: 1rem;
    font-weight: 950;
  }
}

.modal-back,
.tx-history-close {
  position: static;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin: 0;
  color: rgba(23, 35, 31, 0.68);
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 10px;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: 950;
  line-height: 1;

  &:hover {
    color: var(--danger);
    background: rgba(255, 255, 255, 0.44);
  }
}

.tx-history-body {
  gap: 10px;
  padding: 12px 14px calc(18px + env(safe-area-inset-bottom));
}

.tx-history-summary {
  display: grid;
  gap: 5px;
  padding: 13px;
  background: rgba(255, 255, 255, 0.26);
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 12px;

  strong {
    color: var(--ink);
    font-size: 1rem;
    font-weight: 950;
  }

  p {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.74rem;
    font-weight: 750;
    line-height: 1.45;
  }
}

.tx-history-loading {
  display: grid;
  gap: 8px;

  &.compact {
    margin-top: 2px;
  }
}

.tx-list-full {
  max-height: none;
  overflow: visible;
  padding-right: 0;
}

.detail-explainer {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.36), rgba(142, 185, 177, 0.14)),
    rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 10px;
  padding: 0;
  overflow: hidden;

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 42px;
    padding: 11px 12px;
    color: #255c4b;
    font-size: 0.75rem;
    font-weight: 950;
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    &::after {
      content: "+";
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 22px;
      height: 22px;
      color: #255c4b;
      background: rgba(255, 255, 255, 0.32);
      border-radius: 50%;
      font-size: 1rem;
      line-height: 1;
    }
  }

  &[open] summary::after {
    content: "-";
  }

  p {
    margin: 0;
    padding: 0 12px 11px;
    color: var(--ink-muted);
    font-size: 0.74rem;
    font-weight: 750;
    line-height: 1.55;
  }
}

.formula-line {
  display: block;
  margin: 0 12px 9px;
  padding: 8px 10px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.modal-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.modal-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 900;

  &.difficulty {
    background: rgba(111, 139, 132, 0.14);
    color: #4f6862;
  }

  &.halving {
    background: rgba(138, 116, 142, 0.14);
    color: #65516a;
  }
}

.tooltip-loading {
  font-size: 0.75rem;
  color: rgba(255, 245, 213, 0.6);
  padding: 4px 0;
}

@keyframes dock-skeleton-sweep {
  0% { background-position: 220% 0, 0 0; }
  100% { background-position: -220% 0, 0 0; }
}

.block-modal-mobile {
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));

  &:not(.dock-modal) {
    padding: 0;
    background: rgba(18, 32, 29, 0.22);
    backdrop-filter: blur(8px) saturate(1.12);
    -webkit-backdrop-filter: blur(8px) saturate(1.12);

    .detail-card {
      width: 100%;
      height: min(86dvh, 720px);
      max-height: calc(100dvh - max(18px, env(safe-area-inset-top)));
      padding: 22px 16px calc(18px + env(safe-area-inset-bottom));
      border-radius: 22px 22px 0 0;
      animation: mobile-slide-over-in 0.32s cubic-bezier(0.18, 0.89, 0.24, 1) both;
      box-shadow: 0 -22px 54px rgba(35, 29, 20, 0.28);

      &::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 9px;
        width: 42px;
        height: 5px;
        background: rgba(23, 35, 31, 0.24);
        border-radius: 999px;
        transform: translateX(-50%);
      }
    }
  }

  &.dock-modal {
    z-index: 120;
    align-items: flex-end;
    padding-bottom: calc(78px + env(safe-area-inset-bottom));
    background: rgba(18, 32, 29, 0.12);
    backdrop-filter: blur(4px) saturate(1.05);
    -webkit-backdrop-filter: blur(4px) saturate(1.05);

    .modal-card {
      width: min(320px, calc(100vw - 24px));
      max-height: min(58dvh, 460px);
      padding: 14px;
      border-radius: 16px;
      box-shadow: 0 18px 42px rgba(35, 29, 20, 0.2);
    }

    .network-card {
      width: min(350px, calc(100vw - 24px));
      max-height: min(76dvh, 660px);
    }
  }

  .modal-card,
  .settings-card {
    width: 100%;
    max-height: calc(100dvh - 24px);
    padding: 18px 16px 16px;
    border-radius: 12px;
  }

  .detail-card {
    height: calc(100dvh - 24px);
  }

  .modal-header {
    margin-bottom: 12px;
    padding-right: 36px;
    font-size: 1.18rem;
  }

  .modal-row.two-col {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .unit-options {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: 1fr 1fr;
  }

  .tx-list {
    max-height: none;
  }

  &.tx-history-modal {
    align-items: stretch;
    padding: 0;
    padding-bottom: 0;

    .tx-history-card {
      width: 100%;
      height: 100dvh;
      max-height: 100dvh;
      padding: 0;
      border-radius: 0;
    }

    .tx-history-body {
      padding-bottom: calc(18px + env(safe-area-inset-bottom));
    }
  }
}

@keyframes mobile-slide-over-in {
  from {
    opacity: 0.96;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
