import React, { useEffect, useState } from "react"

interface AssetOverviewPanelProps {
  assetId: string
}

interface AssetOverview {
  name: string
  priceUsd: number
  supply: number
  holders: number
  marketCapUsd?: number
  volume24hUsd?: number
}

export const AssetOverviewPanel: React.FC<AssetOverviewPanelProps> = ({ assetId }) => {
  const [info, setInfo] = useState<AssetOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let active = true
    async function fetchInfo() {
      setLoading(true)
      try {
        const res = await fetch(`/api/assets/${assetId}`)
        if (!res.ok) throw new Error(`Failed with status ${res.status}`)
        const json = await res.json()
        if (active) setInfo(json)
      } catch (err: any) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchInfo()
    return () => {
      active = false
    }
  }, [assetId])

  if (loading) return <div>Loading asset overview...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>
  if (!info) return <div>No data available.</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-3">Asset Overview</h2>
      <p><strong>ID:</strong> {assetId}</p>
      <p><strong>Name:</strong> {info.name}</p>
      <p><strong>Price (USD):</strong> ${info.priceUsd.toFixed(4)}</p>
      <p><strong>Circulating Supply:</strong> {info.supply.toLocaleString()}</p>
      <p><strong>Holders:</strong> {info.holders.toLocaleString()}</p>
      {typeof info.marketCapUsd === "number" && (
        <p><strong>Market Cap (USD):</strong> ${info.marketCapUsd.toLocaleString()}</p>
      )}
      {typeof info.volume24hUsd === "number" && (
        <p><strong>24h Volume (USD):</strong> ${info.volume24hUsd.toLocaleString()}</p>
      )}
    </div>
  )
}

export default AssetOverviewPanel
