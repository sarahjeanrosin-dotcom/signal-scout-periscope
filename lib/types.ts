export type Rating = 'best_at' | 'good_at' | 'okay_at' | 'mediocre_at' | 'bad_at'

export const RATING_LABELS: Record<Rating, string> = {
  best_at: 'Best At',
  good_at: 'Good At',
  okay_at: 'Okay At',
  mediocre_at: 'Mediocre At',
  bad_at: 'Bad At',
}

export const RATING_SCORES: Record<Rating, number> = {
  best_at: 5,
  good_at: 4,
  okay_at: 3,
  mediocre_at: 2,
  bad_at: 1,
}

export const RATING_COLORS: Record<Rating, string> = {
  best_at: '#10b981',   // emerald
  good_at: '#3b82f6',   // blue
  okay_at: '#f59e0b',   // amber
  mediocre_at: '#f97316', // orange
  bad_at: '#ef4444',    // red
}

export interface Company {
  id: string
  user_id: string
  name: string
  website: string | null
  industry: string | null
  description: string | null
  last_refreshed_at: string
  created_at: string
  updated_at: string
}

export interface CompanyFeature {
  id: string
  company_id: string
  feature_name: string
  description: string | null
  rating: Rating
  rating_rationale: string | null
  source: 'ai' | 'user'
  is_user_added: boolean
  created_at: string
  updated_at: string
}

export interface Competitor {
  id: string
  company_id: string
  competitor_name: string
  competitor_company_id: string | null
  is_user_added: boolean
  is_selected: boolean
  created_at: string
}

export type PendingReport = { status: 'pending' }
export type ErrorReport  = { status: 'error'; error: string }
export type CompletedReport = ComparisonReport & { status: 'complete' }
export type ReportData = PendingReport | ErrorReport | CompletedReport

export interface Comparison {
  id: string
  user_id: string
  primary_company_id: string
  name: string
  competitor_company_ids: string[]
  report_data: ReportData
  created_at: string
  updated_at: string
}

export interface ComparisonReport {
  primary_company: string
  competitors: string[]
  generated_at: string
  feature_matrix: FeatureMatrixRow[]
  gap_analysis: GapItem[]
  summary: string
  strengths: string[]
  weaknesses: string[]
}

export interface FeatureMatrixRow {
  feature_name: string
  ratings: Record<string, Rating | null>
  scores: Record<string, number>
  gap_flag: boolean // true if primary company is lagging on this feature
}

export interface GapItem {
  feature_name: string
  primary_rating: Rating
  best_competitor: string
  best_competitor_rating: Rating
  gap_score: number
  recommendation: string
}
