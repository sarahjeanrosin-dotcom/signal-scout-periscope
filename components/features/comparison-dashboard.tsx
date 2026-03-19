'use client'

import dynamic from 'next/dynamic'
import type { Comparison, ComparisonReport, FeatureMatrixRow, GapItem, Rating } from '@/lib/types'
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

interface Props {
  comparison: Comparison
}

export function ComparisonDashboard({ comparison }: Props) {
  const report = comparison.report_data as ComparisonReport
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
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{comparison.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Generated {new Date(report.generated_at).toLocaleDateString()} ·{' '}
            {allCompanies.length} companies compared
          </p>
        </div>
        <PdfDownloadButton comparison={comparison} />
      </div>

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
                          <Badge variant={rating as any} className="text-xs">
                            {RATING_LABELS[rating]}
                          </Badge>
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
    </main>
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
