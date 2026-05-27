const API_BASE_URL = (import.meta.env.VITE_BTC_API_BASE_URL || '').replace(/\/$/, '')
const API_KEY = import.meta.env.VITE_BTC_API_KEY || ''

export interface BlockData {
  height: number
  hash: string | null
  time: number | null
}

export interface StatusData {
  blockchain: {
    blocks: number
  }
}

export interface BlocksResponse {
  blocks: BlockData[]
}

async function request<T>(path: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('VITE_BTC_API_BASE_URL이 설정되지 않았습니다.')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: API_KEY
      ? { 'X-API-Key': API_KEY }
      : {}
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

export async function fetchBlocks(from: number, to: number): Promise<BlockData[]> {
  const result = await request<BlocksResponse>(`/api/v1/blocks?from=${from}&to=${to}`)
  return Array.isArray(result.blocks) ? result.blocks : []
}
