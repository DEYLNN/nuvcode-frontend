import { useState, useCallback } from 'react'
import { iconUrl } from '../api'
import type { ProviderMeta } from '../api'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta)
      ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }, [text])
  return (
    <button onClick={onCopy} title="Copy model ID"
      className="shrink-0 p-1 rounded border border-line/50 hover:border-primary hover:bg-primary/10 transition-all text-subtext hover:text-primary">
      {copied ? (
        <svg className="w-3 h-3 text-success-text" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  )
}

interface ToggleModel { id: string; owned_by: string; enabled: boolean; toggling?: boolean; context_length?: number | null }

type Category = 'apikey' | 'oauth' | 'custom_openai' | 'manual'
const catLabel = (cat: string): string => cat === 'apikey' ? "API Key" : cat === 'oauth' ? 'OAuth' : cat === 'manual' ? 'Manual' : 'Custom OpenAI'

interface Props {
  providers: ProviderMeta[] | null
  models: Record<string, ToggleModel[]>
  onToggleModel: (modelId: string, enabled: boolean) => void
}

export default function ModelsSection({ providers, models, onToggleModel }: Props) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all')

  // Inject combo as a pseudo-provider if combo models exist
  const comboModels = models['combo']
  const comboProvider: ProviderMeta | null = comboModels && comboModels.length > 0
    ? { id: 'combo', name: 'combo', display_name: 'Combos', type: 'apikey', color: '#a855f7', icon_name: '', total_keys: 1, active_keys: 1, locked_keys: 0, model_count: comboModels.length, oauth_flow: null }
    : null

  const allProviders = comboProvider ? [...(providers ?? []), comboProvider] : (providers ?? [])

  const grouped = allProviders?.reduce((acc, p) => {
    const cat = (p.type || 'apikey') as Category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<Category, ProviderMeta[]>) ?? {} as Record<Category, ProviderMeta[]>

  const filter = (list: ToggleModel[]) => {
    let out = list
    if (status === 'active') out = out.filter(m => m.enabled)
    else if (status === 'disabled') out = out.filter(m => !m.enabled)
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(m => m.id.toLowerCase().includes(q))
    }
    return out
  }

  const activeCount = Object.values(models).flat().filter(m => m.enabled).length
  const disabledCount = Object.values(models).flat().filter(m => !m.enabled).length

  const chip = (key: 'all' | 'active' | 'disabled', label: string, count?: number) => (
    <button key={key} onClick={() => setStatus(key)}
      className={`brutal-btn px-3 py-1 text-[10px] font-mono uppercase tracking-wider ${status === key ? 'bg-primary text-white' : 'bg-surface text-subtext hover:text-ink'}`}>
      {label}{count !== undefined ? ` ${count}` : ''}
    </button>
  )

  return (
    <div className="brutal-card overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-line">
        <h2 className="heading-brutal text-lg uppercase tracking-tight">MODELS</h2>
      </div>
      <div className="px-5 py-3 border-b-2 border-line space-y-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search models..."
          className="w-full px-4 py-2 border-2 border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
        <div className="flex items-center gap-2">
          {chip('all', 'All')}
          {chip('active', 'Active', activeCount)}
          {chip('disabled', 'Disabled', disabledCount)}
        </div>
      </div>
      <div className="p-5 space-y-6">
        {Object.entries(grouped).map(([cat, provs]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff3d81]" />
              <span className="text-[10px] font-mono font-semibold text-primary-text uppercase tracking-wider">{catLabel(cat)}</span>
              <div className="h-px flex-1 bg-muted" />
            </div>
            <div className="space-y-3">
              {provs.filter(p => p.id === 'combo' || p.total_keys > 0 || p.type === 'manual').map(p => {
                const pm = models[p.id]
                const filtered = pm ? filter(pm) : null
                // Hide provider entirely when a filter is active and nothing matches.
                const filtering = !!search || status !== 'all'
                if (filtering && filtered !== null && filtered.length === 0) return null
                if (filtering && filtered === null && search) return null
                return (
                  <div key={p.id} className="brutal-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-2 border-line"
                          style={{ background: `${p.color}20` }}>
                          {p.id === 'combo' ? (
                            <span className="text-[10px] font-bold text-accent-text">⚡</span>
                          ) : p.icon_name ? <img src={iconUrl(p.icon_name)} alt="" className="w-4 h-4 object-contain" /> : <span className="text-[9px] font-bold" style={{ color: p.color }}>{p.id.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-ink truncate">{p.display_name}</div>
                          <div className="text-[9px] font-mono text-subtext">{p.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.total_keys > 0 && <span className="text-[9px] font-mono text-success-text">{p.total_keys} keys</span>}
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.active_keys > 0 ? '#3ddc97' : 'var(--muted)' }} />
                      </div>
                    </div>
                    {filtered ? (
                      <div className="px-4 py-2 space-y-0.5">
                        {filtered.map(m => (
                          <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-all">
                            <div className="flex items-center gap-2 min-w-0 mr-3">
                              <span className={`text-[11px] font-mono truncate max-w-[220px] ${m.enabled ? 'text-ink/80' : 'text-danger-text/50 line-through'}`}>{m.id}</span>
                              <span className="text-[9px] font-mono text-subtext bg-muted px-1.5 py-0.5 rounded shrink-0">{m.context_length?.toLocaleString() || '?'}</span>
                              <CopyButton text={m.id} />
                            </div>
                            <button onClick={() => onToggleModel(m.id, !m.enabled)} disabled={m.toggling}
                              className={`relative w-9 h-5 rounded-full transition-all border-2 border-line ${m.enabled ? 'bg-[#3ddc97]' : 'bg-muted'} ${m.toggling ? 'opacity-50' : ''}`}>
                              <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-surface border border-line transition-all ${m.enabled ? 'left-[16px]' : 'left-[2px]'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : <div className="px-4 py-3 text-[10px] font-mono text-subtext animate-pulse">Loading models...</div>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
