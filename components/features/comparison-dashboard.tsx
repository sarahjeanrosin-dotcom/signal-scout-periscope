'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { Comparison, ComparisonReport, CompletedReport, FeatureMatrixRow, GapItem, Rating } from '@/lib/types'
import { RATING_LABELS, RATING_SCORES, RATING_COLORS } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell
} from 'recharts'
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// Loaded only in the browser — jsPDF can't run on the server
const PdfDownloadButton = dynamic(
  () => import('@/components/features/pdf-download-button').then(m => ({ default: m.PdfDownloadButton })),
  { ssr: false, loading: () => <Button variant="outline" disabled>Loading PDF...</Button> }
)

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

// Column header colors for the positioning matrix (primary first, then competitors)
const MATRIX_COL_COLORS = ['#4a90d9', '#d94a4a', '#2aa198', '#8e44ad', '#27ae60', '#e67e22', '#c0392b']

interface Props {
  comparison: Comparison
}

export function ComparisonDashboard({ comparison }: Props) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'matrix'>('analysis')
  const report = comparison.report_data as CompletedReport
  const allCompanies = [report.primary_company, ...report.competitors]
  // Build radar chart data (top 8 features for readability)
  const topFeatures = report.feature_matrix.slice(0, 8)
  const radarData = topFeatures.map(row => {
    const point: Record<string, any> = { feature: row.feature_name }
    allCompanies.forEach(company => {
      point[company] = row.scores[company] ?? 0
    })
    return point
  })

  // Build gap analysis bar chart data
  const gapData = report.gap_analysis.slice(0, 6).map(gap => ({
    feature: gap.feature_name.length > 20 ? gap.feature_name.slice(0, 20) + '…' : gap.feature_name,
    fullName: gap.feature_name,
    primary: RATING_SCORES[gap.primary_rating],
    best: RATING_SCORES[gap.best_competitor_rating],
    gap: gap.gap_score,
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{comparison.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Generated {new Date(report.generated_at).toLocaleDateString()} ·{' '}
            {allCompanies.length} companies compared
          </p>
        </div>
        <PdfDownloadButton comparison={comparison} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'analysis'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'matrix'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Positioning Matrix
        </button>
      </div>

      {activeTab === 'matrix' && (
        <PositioningMatrix report={report} allCompanies={allCompanies} />
      )}

      {activeTab === 'analysis' && (<>

      {/* Executive Summary */}
      <Card className="mb-6 border-l-4 border-l-indigo-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 text-sm leading-relaxed">{report.summary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Strengths
              </p>
              <ul className="space-y-1">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-500 font-bold text-xs mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" /> Weaknesses
              </p>
              <ul className="space-y-1">
                {report.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-red-500 font-bold text-xs mt-0.5">✗</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Radar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capability Overview</CardTitle>
            <CardDescription>Across top features (scale 1–5)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="feature" tick={{ fontSize: 10, fill: '#64748b' }} />
                {allCompanies.map((company, i) => (
                  <Radar
                    key={company}
                    name={company}
                    dataKey={company}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={i === 0 ? 0.3 : 0.1}
                    strokeWidth={i === 0 ? 2.5 : 1.5}
                  />
                ))}
                <Legend
                  iconSize={8}
                  formatter={(value) => (
                    <span className={value === report.primary_company ? 'font-bold' : ''}>{value}</span>
                  )}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gap analysis bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Largest Gaps
            </CardTitle>
            <CardDescription>Where {report.primary_company} lags behind competitors</CardDescription>
          </CardHeader>
          <CardContent>
            {gapData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-slate-400 text-sm">No significant gaps found</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gapData} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} ticks={[1, 2, 3, 4, 5]} />
                  <YAxis type="category" dataKey="feature" width={100} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                  />
                  <Legend iconSize={8} />
                  <Bar dataKey="primary" name={report.primary_company} fill="#6366f1" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="best" name="Best Competitor" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Matrix */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Full Feature Matrix</CardTitle>
          <CardDescription>
            Gap flags (<AlertTriangle className="h-3.5 w-3.5 text-amber-500 inline" />) indicate where {report.primary_company} is lagging
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 font-semibold text-slate-700 w-48">Feature</th>
                {allCompanies.map((company, i) => (
                  <th key={company} className={`text-center px-4 py-3 font-semibold ${i === 0 ? 'text-indigo-700' : 'text-slate-600'}`}>
                    {company}
                    {i === 0 && <span className="ml-1 text-xs font-normal text-indigo-400">(primary)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.feature_matrix.map((row, idx) => (
                <tr key={idx} className={`border-b border-slate-50 ${row.gap_flag ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-1.5">
                      {row.gap_flag && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                      {row.feature_name}
                    </div>
                  </td>
                  {allCompanies.map((company, i) => {
                    const rating = row.ratings[company] as Rating | null
                    return (
                      <td key={company} className="px-4 py-3 text-center">
                        {rating ? (
                          <RatingBadgeWithTooltip
                            rating={rating}
                            sources={row.sources?.[company]}
                            rationale={row.rationale?.[company]}
                          />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Gap Analysis Details */}
      {report.gap_analysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Gap Analysis & Recommendations
            </CardTitle>
            <CardDescription>
              Prioritized opportunities where {report.primary_company} can improve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.gap_analysis.map((gap, i) => (
                <GapCard key={i} gap={gap} index={i} primaryCompany={report.primary_company} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>)}
    </main>
  )
}

function RatingBadgeWithTooltip({
  rating,
  sources,
  rationale,
}: {
  rating: Rating
  sources?: string[]
  rationale?: string | null
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSources = sources && sources.length > 0
  const hasContent = hasSources || !!rationale

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }
  function cancelClose() {
    clearTimeout(closeTimer.current)
  }

  if (!hasContent) {
    return (
      <Badge variant={rating as any} className="text-xs">
        {RATING_LABELS[rating]}
      </Badge>
    )
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => { cancelClose(); setOpen(true) }}
      onMouseLeave={scheduleClose}
    >
      <Badge variant={rating as any} className="text-xs cursor-help">
        {RATING_LABELS[rating]}
      </Badge>
      {open && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-72 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-left"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {/* small arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-200" />
          {rationale && (
            <p className="text-xs text-slate-700 leading-relaxed mb-2">{rationale}</p>
          )}
          {hasSources && (
            <>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Sources
              </p>
              <ul className="space-y-1">
                {sources.map((url, i) => {
                  const display = url
                    .replace(/^https?:\/\/(www\.)?/, '')
                    .replace(/\/$/, '')
                    .split('/')
                    .slice(0, 3)
                    .join('/')
                  return (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline block truncate"
                      >
                        {display}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MatrixIcon({ rating }: { rating: Rating | null }) {
  if (!rating) return <span className="text-slate-300 text-lg">—</span>
  if (rating === 'best_at' || rating === 'good_at') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 mx-auto" fill="none" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (rating === 'bad_at' || rating === 'mediocre_at') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 mx-auto" fill="none" stroke="#e74c3c" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }
  // okay_at — half-filled circle
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 mx-auto">
      <path d="M12 3 A9 9 0 0 1 12 21 Z" fill="#c0780a" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="#c0780a" strokeWidth="2" />
    </svg>
  )
}

function PositioningMatrix({ report, allCompanies }: { report: ComparisonReport; allCompanies: string[] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Banner header */}
      <div className="bg-[#1a2e4a] px-8 py-5 flex items-center justify-between">
        <h2 className="text-white text-xl font-bold tracking-tight">
          Competitive Positioning — {report.primary_company} vs. The Market
        </h2>
        <span className="text-slate-400 text-sm">{new Date(report.generated_at).toLocaleDateString()}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="w-52 min-w-[180px]" />
              {allCompanies.map((company, i) => (
                <th key={company} className="min-w-[120px] px-2 py-3 text-center">
                  <span
                    className="inline-block px-4 py-1.5 rounded-md text-white text-sm font-semibold w-full"
                    style={{ backgroundColor: MATRIX_COL_COLORS[i % MATRIX_COL_COLORS.length] }}
                  >
                    {company}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.feature_matrix.map((row, idx) => {
              const primaryRating = row.ratings[report.primary_company] as Rating | null
              const primaryScore = primaryRating ? RATING_SCORES[primaryRating] : 0
              const isGap = row.gap_flag
              return (
                <tr
                  key={idx}
                  className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                >
                  <td className="px-6 py-3 font-medium text-slate-800 text-sm">{row.feature_name}</td>
                  {allCompanies.map((company, i) => {
                    const rating = row.ratings[company] as Rating | null
                    const score = rating ? RATING_SCORES[rating] : 0
                    const isPrimary = i === 0
                    const cellBg = isPrimary
                      ? isGap ? 'bg-amber-50' : 'bg-green-50/60'
                      : score > primaryScore ? 'bg-red-50/50' : ''
                    return (
                      <td key={company} className={`px-2 py-3 text-center ${cellBg}`}>
                        <MatrixIcon rating={rating} />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center gap-6">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Legend</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <MatrixIcon rating="good_at" /> Strong
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <MatrixIcon rating="okay_at" /> Partial
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <MatrixIcon rating="bad_at" /> Weak / Missing
        </span>
      </div>
    </div>
  )
}

function GapCard({ gap, index, primaryCompany }: { gap: GapItem; index: number; primaryCompany: string }) {
  const gapSeverity = gap.gap_score >= 3 ? 'high' : gap.gap_score >= 2 ? 'medium' : 'low'
  const severityConfig = {
    high: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', label: 'High Gap' },
    medium: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Medium Gap' },
    low: { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', label: 'Low Gap' },
  }
  const config = severityConfig[gapSeverity]

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
          <h4 className="font-semibold text-slate-900">{gap.feature_name}</h4>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm flex-shrink-0">
          <div className="text-center">
            <p className="text-xs text-slate-500">{primaryCompany}</p>
            <Badge variant={gap.primary_rating as any} className="text-xs mt-0.5">
              {RATING_LABELS[gap.primary_rating]}
            </Badge>
          </div>
          <Minus className="h-4 w-4 text-slate-400" />
          <div className="text-center">
            <p className="text-xs text-slate-500">{gap.best_competitor}</p>
            <Badge variant={gap.best_competitor_rating as any} className="text-xs mt-0.5">
              {RATING_LABELS[gap.best_competitor_rating]}
            </Badge>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{gap.recommendation}</p>
    </div>
  )
}
