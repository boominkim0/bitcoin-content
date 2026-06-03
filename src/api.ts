const API_BASE_URL = (import.meta.env.VITE_BTC_API_BASE_URL || '').replace(/\/$/, '')
const API_KEY = import.meta.env.VITE_BTC_API_KEY || ''

export interface BlockData {
  height: number
  hash: string | null
  time: number | null
  nTx?: number
  difficulty?: number
  bits?: number
  size?: number
  weight?: number
  nonce?: number
  tx_count?: number
  merkle_root?: string
  previousblockhash?: string
  nextblockhash?: string | null
  reward_satoshi?: number
  subsidy_satoshi?: number
  total_fee_satoshi?: number
  avg_fee_satoshi?: number
  avg_fee_rate?: number
  coinbase_message?: string | null
  hashrate_estimate?: number
  tx_detail_limit?: number
  tx_detail_truncated?: boolean
  tx_summary?: TransactionSummaryData[]
}

export interface TransactionSummaryData {
  txid?: string
  hash?: string
  is_coinbase: boolean
  output_satoshi?: number
  fee_satoshi?: number
  vsize?: number
  size?: number
  weight?: number
  vin_count?: number
  vout_count?: number
}

export interface TransactionAddressData {
  address: string
  value_satoshi?: number
  vout?: number
}

export interface TransactionDetailData extends TransactionSummaryData {
  txid: string
  version?: number
  locktime?: number
  fee?: number
  vin?: unknown[]
  vout?: unknown[]
  addresses?: TransactionAddressData[]
  summary?: TransactionSummaryData
}

export interface StatusData {
  blockchain: {
    blocks: number
  }
}

export interface BlocksResponse {
  blocks: BlockData[]
}

export interface BlockTransactionsResponse {
  height: number
  total?: number
  offset: number
  limit: number
  next_offset?: number | null
  has_more?: boolean
  transactions: TransactionSummaryData[]
}

export interface AddressUtxoData {
  tx_hash: string
  tx_pos: number
  height: number
  value: number
}

export interface AddressHistoryData {
  tx_hash: string
  height: number
  fee?: number
}

export interface AddressUtxosResponse {
  address: string
  scripthash?: string
  total: number
  total_value_satoshi?: number
  offset: number
  limit: number
  next_offset?: number | null
  has_more?: boolean
  utxos: AddressUtxoData[]
}

export interface AddressHistoryResponse {
  address: string
  scripthash?: string
  total: number
  offset: number
  limit: number
  next_offset?: number | null
  has_more?: boolean
  transactions: AddressHistoryData[]
}

export type SearchResponse =
  | {
      query: string
      type: 'block'
      height: number
      block: BlockData
    }
  | {
      query: string
      type: 'transaction'
      txid: string
      transaction: TransactionDetailData
    }
  | {
      query: string
      type: 'address'
      address: string
      utxos?: AddressUtxosResponse
      history?: AddressHistoryResponse
    }

export interface MempoolData {
  loaded: boolean
  size: number
  bytes: number
  usage: number
  total_fee: number
  maxmempool: number
  mempoolminfee: number
  minrelaytxfee: number
  incrementalrelayfee: number
  unbroadcastcount: number
}

export interface ResourceUsageData {
  total_bytes: number
  used_bytes: number
  used_percent: number
}

export interface MemoryUsageData extends ResourceUsageData {
  available_bytes: number
}

export interface DiskUsageData extends ResourceUsageData {
  free_bytes: number
}

export interface ServerStatusData {
  server_time: string
  uptime_seconds: number
  memory: MemoryUsageData | null
  disk: DiskUsageData | null
  bitcoin: {
    ledger_size_bytes: number | null
    blocks: number | null
    verification_progress: number | null
  }
  network: {
    bitcoin_network_active: boolean | null
    connections: number | null
    rpc_ok: boolean
  }
}

type RequestOptions = {
  timeoutMs?: number
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('VITE_BTC_API_BASE_URL이 설정되지 않았습니다.')
  }

  const controller = options.timeoutMs ? new AbortController() : null
  const timeoutId = options.timeoutMs
    ? window.setTimeout(() => controller?.abort(), options.timeoutMs)
    : undefined

  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal: controller?.signal,
    headers: API_KEY
      ? { 'X-API-Key': API_KEY }
      : {}
  }).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  })

  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message = body && body.error ? body.error : `요청 실패: HTTP ${response.status}`
    throw new Error(message)
  }

  return body as T
}

export async function fetchStatus(): Promise<StatusData> {
  return request<StatusData>('/api/v1/status')
}

export async function fetchBlock(height: number): Promise<BlockData> {
  return request<BlockData>(`/api/v1/block/${height}`)
}

export async function fetchBlockTransactions(
  height: number,
  offset: number,
  limit: number
): Promise<BlockTransactionsResponse> {
  return request<BlockTransactionsResponse>(
    `/api/v1/block/${height}/transactions?offset=${offset}&limit=${limit}`
  )
}

export async function fetchTransaction(txid: string): Promise<TransactionDetailData> {
  return request<TransactionDetailData>(`/api/v1/tx/${encodeURIComponent(txid)}`)
}

export async function fetchAddressUtxos(
  address: string,
  offset: number,
  limit: number
): Promise<AddressUtxosResponse> {
  return request<AddressUtxosResponse>(
    `/api/v1/address/${encodeURIComponent(address)}/utxos?offset=${offset}&limit=${limit}`,
    { timeoutMs: 12000 }
  )
}

export async function fetchAddressHistory(
  address: string,
  offset: number,
  limit: number
): Promise<AddressHistoryResponse> {
  return request<AddressHistoryResponse>(
    `/api/v1/address/${encodeURIComponent(address)}/history?offset=${offset}&limit=${limit}`,
    { timeoutMs: 12000 }
  )
}

export async function searchBitcoin(query: string): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/v1/search?q=${encodeURIComponent(query)}`)
}

export async function fetchBlocks(from: number, to: number): Promise<BlockData[]> {
  const result = await request<BlocksResponse>(`/api/v1/blocks?from=${from}&to=${to}`)
  return Array.isArray(result.blocks) ? result.blocks : []
}

export async function fetchMempool(): Promise<MempoolData> {
  return request<MempoolData>('/api/v1/mempool')
}

export async function fetchServerStatus(): Promise<ServerStatusData> {
  return request<ServerStatusData>('/api/v1/server-status')
}
