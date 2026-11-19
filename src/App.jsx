import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import styles from './App.module.css'

const REFRESH_MS = 4000

function StatCard({ label, value, unit, color }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={{ color: color || 'var(--accent2)' }}>
        {value}<span className={styles.statUnit}> {unit}</span>
      </span>
    </div>
  )
}

function StatusDot({ status }) {
  const color = status === 'online' ? 'var(--green)' : status === 'warn' ? 'var(--yellow)' : 'var(--red)'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6, boxShadow: `0 0 6px ${color}` }} />
}

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [inferResult, setInferResult] = useState(null)
  const [inferLoading, setInferLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics')
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError('Failed to reach API — make sure your server is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const id = setInterval(fetchMetrics, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchMetrics])

  const handleInfer = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setInferLoading(true)
    setInferResult(null)
    try {
      const res = await fetch('/api/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const json = await res.json()
      setInferResult(json)
    } catch (e) {
      setInferResult({ error: e.message })
    } finally {
      setInferLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>⟨IQ⟩</span>
          <span className={styles.logoText}>InferIQ</span>
        </div>
        <nav className={styles.nav}>
          {[
            { id: 'dashboard', icon: '◈', label: 'Dashboard' },
            { id: 'models', icon: '⬡', label: 'Models' },
            { id: 'playground', icon: '▷', label: 'Playground' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`${styles.navItem} ${activeTab === tab.id ? styles.navActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.navIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            LIVE
          </span>
          {lastUpdated && (
            <span className={styles.lastUpdated}>
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>
              {activeTab === 'dashboard' && 'Inference Dashboard'}
              {activeTab === 'models' && 'Model Registry'}
              {activeTab === 'playground' && 'Inference Playground'}
            </h1>
            <p className={styles.pageSubtitle}>
              {activeTab === 'dashboard' && 'Real-time metrics across all compute nodes'}
              {activeTab === 'models' && 'Live status of deployed models'}
              {activeTab === 'playground' && 'Run real inference via Hugging Face API'}
            </p>
          </div>
          <button className={styles.refreshBtn} onClick={fetchMetrics}>↺ Refresh</button>
        </header>

        {loading && <div className={styles.centered}>Loading metrics…</div>}
        {error && <div className={styles.error}>{error}</div>}

        {data && activeTab === 'dashboard' && (
          <>
            <div className={styles.statsGrid}>
              <StatCard label="Requests / min" value={data.summary.totalRequests} unit="req/min" color="var(--accent)" />
              <StatCard label="Avg Latency" value={data.summary.avgLatencyMs} unit="ms" color="var(--accent2)" />
              <StatCard label="Avg Throughput" value={data.summary.avgThroughput} unit="tok/s" color="var(--green)" />
              <StatCard label="Active Models" value={data.summary.activeModels} unit="models" color="var(--yellow)" />
            </div>

            <div className={styles.chartBox}>
              <h2 className={styles.sectionTitle}>Throughput & Latency — Last 10 min</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8 }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="throughput" stroke="#7c3aed" strokeWidth={2} dot={false} name="Throughput (tok/s)" />
                  <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#06b6d4" strokeWidth={2} dot={false} name="Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.tableBox}>
              <h2 className={styles.sectionTitle}>Model Performance</h2>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Model</th><th>Throughput</th><th>Latency</th><th>GPU Util</th><th>Error Rate</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.map(m => (
                    <tr key={m.id}>
                      <td><b>{m.name}</b><br /><span className={styles.muted}>{m.provider}</span></td>
                      <td className={styles.mono}>{m.tokensPerSec} tok/s</td>
                      <td className={styles.mono}>{m.latencyMs} ms</td>
                      <td className={styles.mono}>{m.gpuUtil}%</td>
                      <td className={styles.mono} style={{ color: m.errorRate > 1 ? 'var(--red)' : 'var(--green)' }}>{m.errorRate}%</td>
                      <td><StatusDot status={m.status} />{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data && activeTab === 'models' && (
          <div className={styles.modelsGrid}>
            {data.models.map(m => (
              <div key={m.id} className={styles.modelCard}>
                <div className={styles.modelCardHeader}>
                  <div>
                    <div className={styles.modelName}>{m.name}</div>
                    <div className={styles.muted}>{m.provider}</div>
                  </div>
                  <StatusDot status={m.status} />
                </div>
                <div className={styles.modelStats}>
                  <div className={styles.modelStat}><span className={styles.muted}>Throughput</span><span className={styles.mono}>{m.tokensPerSec} tok/s</span></div>
                  <div className={styles.modelStat}><span className={styles.muted}>Latency</span><span className={styles.mono}>{m.latencyMs} ms</span></div>
                  <div className={styles.modelStat}><span className={styles.muted}>Req/min</span><span className={styles.mono}>{m.requestsPerMin}</span></div>
                  <div className={styles.modelStat}><span className={styles.muted}>GPU</span><span className={styles.mono}>{m.gpuUtil}%</span></div>
                  <div className={styles.modelStat}><span className={styles.muted}>VRAM</span><span className={styles.mono}>{m.memUsedGb} GB</span></div>
                  <div className={styles.modelStat}><span className={styles.muted}>Error rate</span><span className={styles.mono} style={{ color: m.errorRate > 1 ? 'var(--red)' : 'var(--green)' }}>{m.errorRate}%</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'playground' && (
          <div className={styles.playground}>
            <div className={styles.playgroundInfo}>
              <span>Runs real inference via <b>Hugging Face Inference API</b>. Add your <code>HF_TOKEN</code> in Vercel env vars for higher limits.</span>
            </div>
            <form onSubmit={handleInfer} className={styles.inferForm}>
              <textarea
                className={styles.promptInput}
                placeholder="Enter a prompt… e.g. Explain neural networks in one paragraph."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={5}
              />
              <button type="submit" className={styles.inferBtn} disabled={inferLoading}>
                {inferLoading ? 'Inferring…' : '▷ Run Inference'}
              </button>
            </form>

            {inferResult && (
              <div className={styles.inferResult}>
                {inferResult.error ? (
                  <div className={styles.error}>{inferResult.error}</div>
                ) : (
                  <>
                    <div className={styles.inferMeta}>
                      <span>Model: <b>{inferResult.model}</b></span>
                      <span>Latency: <b className={styles.mono}>{inferResult.latencyMs}ms</b></span>
                      <span>Tokens: <b className={styles.mono}>{inferResult.tokensGenerated}</b></span>
                      <span>Speed: <b className={styles.mono}>{inferResult.tokensPerSec} tok/s</b></span>
                    </div>
                    <pre className={styles.inferOutput}>{inferResult.output}</pre>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
