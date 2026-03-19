'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Company, CompanyFeature, Competitor } from '@/lib/types'
import { RATING_LABELS, RATING_COLORS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2, Plus, RefreshCw, GitCompare, Loader2, Check, X,
  Trash2, History, ExternalLink, ChevronDown, ChevronUp, Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  company: Company
  initialFeatures: CompanyFeature[]
  initialCompetitors: Competitor[]
  snapshots: { id: string; snapshot_date: string; triggered_by: string }[]
}

const RATINGS = ['best_at', 'good_at', 'okay_at', 'mediocre_at', 'bad_at'] as const

export function CompanyDetail({ company, initialFeatures, initialCompetitors, snapshots }: Props) {
  const router = useRouter()
  const [features, setFeatures] = useState(initialFeatures)
  const [competitors, setCompetitors] = useState(initialCompetitors)
  const [refreshing, setRefreshing] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [addingFeature, setAddingFeature] = useState(false)
  const [addingCompetitor, setAddingCompetitor] = useState(false)
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeatureRating, setNewFeatureRating] = useState<typeof RATINGS[number]>('okay_at')
  const [newCompetitorName, setNewCompetitorName] = useState('')
  const [analyzingCompetitors, setAnalyzingCompetitors] = useState<Set<string>>(new Set())
  const [showHistory, setShowHistory] = useState(false)

  const selectedCompetitors = competitors.filter(c => c.is_selected)

  async function handleRefresh() {
    setRefreshing(true)
    const res = await fetch(`/api/companies/${company.id}/refresh`, { method: 'POST' })
    if (res.ok) router.refresh()
    setRefreshing(false)
  }

  async function handleToggleCompetitor(competitor: Competitor) {
    const res = await fetch('/api/competitors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: competitor.id, is_selected: !competitor.is_selected }),
    })
    if (res.ok) {
      setCompetitors(prev =>
        prev.map(c => c.id === competitor.id ? { ...c, is_selected: !c.is_selected } : c)
      )
    }
  }

  async function handleDeleteCompany() {
    if (!confirm(`Delete ${company.name}? This will also remove all its features, competitors, and comparisons.`)) return
    const res = await fetch(`/api/companies/${company.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard')
  }

  async function handleAnalyzeCompetitor(competitor: Competitor, website?: string) {
    setAnalyzingCompetitors(prev => new Set([...prev, competitor.id]))
    const res = await fetch(`/api/companies/${company.id}/analyze-competitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitor_name: competitor.competitor_name, competitor_website: website }),
    })
    if (res.ok) {
      const data = await res.json()
      setCompetitors(prev =>
        prev.map(c => c.id === competitor.id
          ? { ...c, competitor_company_id: data.company_id, is_selected: true }
          : c
        )
      )
    }
    setAnalyzingCompetitors(prev => {
      const next = new Set(prev)
      next.delete(competitor.id)
      return next
    })
  }

  async function handleAddCompetitor() {
    if (!newCompetitorName.trim()) return
    const res = await fetch('/api/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: company.id, competitor_name: newCompetitorName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setCompetitors(prev => [...prev, data])
      setNewCompetitorName('')
      setAddingCompetitor(false)
    }
  }

  async function handleDeleteCompetitor(id: string) {
    const res = await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' })
    if (res.ok) setCompetitors(prev => prev.filter(c => c.id !== id))
  }

  async function handleAddFeature() {
    if (!newFeatureName.trim()) return
    const res = await fetch('/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: company.id,
        feature_name: newFeatureName.trim(),
        rating: newFeatureRating,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setFeatures(prev => [...prev, data])
      setNewFeatureName('')
      setNewFeatureRating('okay_at')
      setAddingFeature(false)
    }
  }

  async function handleDeleteFeature(id: string) {
    const res = await fetch(`/api/features?id=${id}`, { method: 'DELETE' })
    if (res.ok) setFeatures(prev => prev.filter(f => f.id !== id))
  }

  async function handleCompare() {
    if (selectedCompetitors.length === 0) return

    // Ensure all selected competitors have been analyzed (have company IDs)
    const unanalyzed = selectedCompetitors.filter(c => !c.competitor_company_id)
    if (unanalyzed.length > 0) {
      alert(`Please click "Analyze" on each selected competitor first to load their data.`)
      return
    }

    setComparing(true)
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primary_company_id: company.id,
        competitor_ids: selectedCompetitors.map(c => c.competitor_company_id).filter(Boolean),
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/compare/${data.comparison_id}`)
    } else {
      setComparing(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-slate-400" />
            {company.name}
          </h1>
          {company.industry && <p className="text-slate-500 text-sm mt-1">{company.industry}</p>}
          {company.description && (
            <p className="text-slate-600 text-sm mt-2 max-w-2xl">{company.description}</p>
          )}
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 text-xs mt-2 hover:underline">
              {company.website} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDeleteCompany}
            className="text-red-500 hover:text-red-600 hover:border-red-300">
            <Trash2 className="h-4 w-4" />
            <span className="ml-1.5">Delete</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1.5">Refresh</span>
          </Button>
          {selectedCompetitors.length > 0 && (
            <Button variant="primary" size="sm" onClick={handleCompare} disabled={comparing}
              className="flex items-center gap-1.5">
              {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
              Compare ({selectedCompetitors.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Features panel (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Features & Capabilities</CardTitle>
                  <CardDescription className="mt-1">
                    AI-rated from client-facing content. You can add your own.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAddingFeature(true)} className="flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {addingFeature && (
                <div className="mb-4 p-3 rounded-lg border border-indigo-200 bg-indigo-50 space-y-3">
                  <Input
                    placeholder="Feature name"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    {RATINGS.map(r => (
                      <button
                        key={r}
                        onClick={() => setNewFeatureRating(r)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                          newFeatureRating === r
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        {RATING_LABELS[r]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={handleAddFeature}>Add Feature</Button>
                    <Button size="sm" variant="outline" onClick={() => setAddingFeature(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {features.map(feature => (
                  <FeatureRow key={feature.id} feature={feature} onDelete={handleDeleteFeature} />
                ))}
                {features.length === 0 && (
                  <p className="text-slate-400 text-sm py-6 text-center">No features yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Snapshot history */}
          {snapshots.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-slate-400" />
                    Historical Snapshots ({snapshots.length})
                  </CardTitle>
                  {showHistory ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
              </CardHeader>
              {showHistory && (
                <CardContent>
                  <ul className="space-y-1">
                    {snapshots.map(snap => (
                      <li key={snap.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-slate-700">{new Date(snap.snapshot_date).toLocaleDateString()}</span>
                        <Badge variant={snap.triggered_by === 'scheduled' ? 'secondary' : 'outline'} className="text-xs">
                          {snap.triggered_by}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Competitors panel (1/3 width) */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Competitors</CardTitle>
                  <CardDescription className="mt-1">
                    Select competitors to include in a comparison
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAddingCompetitor(true)} className="flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {addingCompetitor && (
                <div className="mb-4 p-3 rounded-lg border border-indigo-200 bg-indigo-50 space-y-2">
                  <Input
                    placeholder="Competitor name"
                    value={newCompetitorName}
                    onChange={(e) => setNewCompetitorName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={handleAddCompetitor}>Add</Button>
                    <Button size="sm" variant="outline" onClick={() => setAddingCompetitor(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {competitors.map(competitor => (
                  <CompetitorRow
                    key={competitor.id}
                    competitor={competitor}
                    isAnalyzing={analyzingCompetitors.has(competitor.id)}
                    onToggle={handleToggleCompetitor}
                    onAnalyze={handleAnalyzeCompetitor}
                    onDelete={handleDeleteCompetitor}
                  />
                ))}
                {competitors.length === 0 && (
                  <p className="text-slate-400 text-sm py-4 text-center">No competitors found</p>
                )}
              </div>

              {selectedCompetitors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Button
                    variant="primary"
                    className="w-full flex items-center gap-2"
                    onClick={handleCompare}
                    disabled={comparing}
                  >
                    {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
                    Run Comparison ({selectedCompetitors.length} selected)
                  </Button>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Unanalyzed competitors will be loaded first
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

function FeatureRow({ feature, onDelete }: { feature: CompanyFeature; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
      <button
        className="flex items-center justify-between w-full p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: RATING_COLORS[feature.rating] }}
          />
          <span className="font-medium text-slate-800 text-sm truncate">{feature.feature_name}</span>
          {feature.is_user_added && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 flex-shrink-0">You</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={feature.rating as any} className="text-xs">
            {RATING_LABELS[feature.rating]}
          </Badge>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(feature.id) }}
            className="text-slate-300 hover:text-red-400 transition-colors p-0.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>
      {expanded && (feature.description || feature.rating_rationale) && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-slate-50 pt-2">
          {feature.description && (
            <p className="text-xs text-slate-600">{feature.description}</p>
          )}
          {feature.rating_rationale && (
            <p className="text-xs text-slate-400 italic">Rating: {feature.rating_rationale}</p>
          )}
        </div>
      )}
    </div>
  )
}

function CompetitorRow({
  competitor, isAnalyzing, onToggle, onAnalyze, onDelete
}: {
  competitor: Competitor
  isAnalyzing: boolean
  onToggle: (c: Competitor) => void
  onAnalyze: (c: Competitor, website?: string) => void
  onDelete: (id: string) => void
}) {
  const [showWebsiteInput, setShowWebsiteInput] = useState(false)
  const [website, setWebsite] = useState('')

  function handleAnalyzeClick() {
    setShowWebsiteInput(true)
  }

  function handleConfirmAnalyze() {
    setShowWebsiteInput(false)
    onAnalyze(competitor, website.trim() || undefined)
  }

  return (
    <div className={cn(
      'rounded-lg border transition-all',
      competitor.is_selected ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100'
    )}>
      <div className="flex items-center gap-2 p-2.5">
        <button
          onClick={() => onToggle(competitor)}
          className={cn(
            'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
            competitor.is_selected
              ? 'border-indigo-500 bg-indigo-500'
              : 'border-slate-300 bg-white'
          )}
        >
          {competitor.is_selected && <Check className="h-3 w-3 text-white" />}
        </button>

        <span className="text-sm text-slate-800 flex-1 truncate">{competitor.competitor_name}</span>

        {competitor.is_selected && !competitor.competitor_company_id && !showWebsiteInput && (
          <button
            onClick={handleAnalyzeClick}
            disabled={isAnalyzing}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex-shrink-0 flex items-center gap-1"
          >
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {isAnalyzing ? 'Loading...' : 'Analyze'}
          </button>
        )}

        {competitor.competitor_company_id && (
          <span className="text-xs text-emerald-600 flex items-center gap-0.5 flex-shrink-0">
            <Check className="h-3 w-3" /> Ready
          </span>
        )}

        <button
          onClick={() => onDelete(competitor.id)}
          className="text-slate-300 hover:text-red-400 transition-colors p-0.5 flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showWebsiteInput && (
        <div className="px-2.5 pb-2.5 space-y-2">
          <div className="relative">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Website (optional, improves accuracy)"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmAnalyze()}
              className="pl-8 text-xs h-8"
              autoFocus
            />
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="primary" onClick={handleConfirmAnalyze} className="text-xs h-7 px-2.5">
              Analyze
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowWebsiteInput(false)} className="text-xs h-7 px-2.5">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
