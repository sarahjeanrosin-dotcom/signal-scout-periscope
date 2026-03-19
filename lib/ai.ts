import Anthropic from '@anthropic-ai/sdk'
import type { Rating, CompanyFeature, ComparisonReport, FeatureMatrixRow, GapItem } from './types'
import { RATING_SCORES } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Feature Extraction ──────────────────────────────────────────────────────

export interface ExtractedFeature {
  feature_name: string
  description: string
  rating: Rating
  rating_rationale: string
}

export async function extractCompanyFeatures(
  companyName: string,
  website?: string
): Promise<{ features: ExtractedFeature[]; industry: string; description: string }> {
  const prompt = `You are a competitive intelligence analyst. Analyze the company "${companyName}"${website ? ` (${website})` : ''} based on publicly available, client-facing information.

Return a JSON object with this exact structure:
{
  "industry": "brief industry label",
  "description": "1-2 sentence company description",
  "features": [
    {
      "feature_name": "Feature or capability name",
      "description": "What this feature/capability does and how it manifests for clients",
      "rating": "best_at" | "good_at" | "okay_at" | "mediocre_at" | "bad_at",
      "rating_rationale": "Why this rating based on client-facing evidence (reviews, marketing, product pages, case studies)"
    }
  ]
}

Rating definitions:
- best_at: Industry-leading, widely recognized as the gold standard in this area
- good_at: Solid capability, above average for the industry
- okay_at: Meets basic expectations, average for the industry
- mediocre_at: Below average, noticeable gaps compared to competitors
- bad_at: Significant weakness, frequently cited as a pain point

Extract 8-15 features. Focus on capabilities visible to clients: product features, UX, pricing model, integrations, support quality, onboarding, documentation, mobile experience, API quality, reporting/analytics, etc.

Return ONLY the JSON object, no markdown, no extra text.`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(text)
  return parsed
}

// ─── Competitor Discovery ─────────────────────────────────────────────────────

export interface DiscoveredCompetitor {
  name: string
  reason: string
}

export async function discoverCompetitors(
  companyName: string,
  industry: string
): Promise<DiscoveredCompetitor[]> {
  const prompt = `You are a competitive intelligence analyst.

List the top 8-10 direct competitors of "${companyName}" in the ${industry} industry. Focus on companies that compete for the same clients.

Return a JSON array with this exact structure:
[
  {
    "name": "Competitor Company Name",
    "reason": "One sentence on why they directly compete"
  }
]

Return ONLY the JSON array, no markdown, no extra text.`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text)
}

// ─── Comparison Report ────────────────────────────────────────────────────────

export async function generateComparisonReport(
  primaryCompany: { name: string; features: CompanyFeature[] },
  competitors: { name: string; features: CompanyFeature[] }[]
): Promise<ComparisonReport> {
  // Build feature matrix from DB data
  const allFeatureNames = new Set<string>()
  primaryCompany.features.forEach(f => allFeatureNames.add(f.feature_name))
  competitors.forEach(c => c.features.forEach(f => allFeatureNames.add(f.feature_name)))

  // For features a company doesn't have, we'll ask AI to infer them
  const companiesForPrompt = [
    { name: primaryCompany.name, features: primaryCompany.features },
    ...competitors,
  ]

  const prompt = `You are a competitive intelligence analyst. Based on the feature data below, generate a comprehensive competitive comparison report.

Companies and their known features:
${JSON.stringify(companiesForPrompt.map(c => ({
  name: c.name,
  features: c.features.map(f => ({
    name: f.feature_name,
    rating: f.rating,
    rationale: f.rating_rationale,
  })),
})), null, 2)}

Primary company being analyzed: ${primaryCompany.name}
Competitors: ${competitors.map(c => c.name).join(', ')}

Return a JSON object with this exact structure:
{
  "feature_matrix": [
    {
      "feature_name": "Feature name",
      "ratings": { "${primaryCompany.name}": "good_at", "CompetitorA": "best_at" },
      "scores": { "${primaryCompany.name}": 4, "CompetitorA": 5 },
      "gap_flag": true
    }
  ],
  "gap_analysis": [
    {
      "feature_name": "Feature where primary company lags",
      "primary_rating": "okay_at",
      "best_competitor": "CompetitorA",
      "best_competitor_rating": "best_at",
      "gap_score": 2,
      "recommendation": "Specific, actionable recommendation for the primary company"
    }
  ],
  "summary": "2-3 sentence executive summary of where ${primaryCompany.name} stands vs competitors",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"]
}

Rules:
- Include ALL feature areas across all companies in feature_matrix
- If a company doesn't have data for a feature, infer a likely rating based on industry knowledge
- gap_flag = true when primary company scores at least 1 point below the best competitor
- gap_analysis should only include features where primary company is lagging
- Sort gap_analysis by gap_score descending (biggest gaps first)
- Scores: best_at=5, good_at=4, okay_at=3, mediocre_at=2, bad_at=1

Return ONLY the JSON object, no markdown, no extra text.`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const aiReport = JSON.parse(text)

  return {
    primary_company: primaryCompany.name,
    competitors: competitors.map(c => c.name),
    generated_at: new Date().toISOString(),
    ...aiReport,
  }
}
