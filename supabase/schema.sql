-- Signal Scout Periscope - Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  description TEXT,
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own companies"
  ON companies FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- COMPANY FEATURES
-- ============================================================
CREATE TABLE company_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  rating TEXT CHECK (rating IN ('best_at', 'good_at', 'okay_at', 'mediocre_at', 'bad_at')) NOT NULL,
  rating_rationale TEXT,
  source TEXT CHECK (source IN ('ai', 'user')) DEFAULT 'ai',
  is_user_added BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage features for their companies"
  ON company_features FOR ALL
  USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = company_features.company_id AND companies.user_id = auth.uid()
  ));

-- ============================================================
-- FEATURE SNAPSHOTS (weekly historical tracking)
-- ============================================================
CREATE TABLE feature_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  features JSONB NOT NULL,
  triggered_by TEXT CHECK (triggered_by IN ('manual', 'scheduled')) DEFAULT 'scheduled'
);

ALTER TABLE feature_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view snapshots for their companies"
  ON feature_snapshots FOR ALL
  USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = feature_snapshots.company_id AND companies.user_id = auth.uid()
  ));

-- ============================================================
-- COMPETITORS
-- ============================================================
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_user_added BOOLEAN DEFAULT FALSE,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage competitors for their companies"
  ON competitors FOR ALL
  USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = competitors.company_id AND companies.user_id = auth.uid()
  ));

-- ============================================================
-- COMPARISONS (saved reports)
-- ============================================================
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  primary_company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  competitor_company_ids UUID[] NOT NULL DEFAULT '{}',
  report_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own comparisons"
  ON comparisons FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_company_features_company_id ON company_features(company_id);
CREATE INDEX idx_feature_snapshots_company_id ON feature_snapshots(company_id);
CREATE INDEX idx_feature_snapshots_date ON feature_snapshots(snapshot_date);
CREATE INDEX idx_competitors_company_id ON competitors(company_id);
CREATE INDEX idx_comparisons_user_id ON comparisons(user_id);
CREATE INDEX idx_comparisons_primary_company ON comparisons(primary_company_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER company_features_updated_at BEFORE UPDATE ON company_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comparisons_updated_at BEFORE UPDATE ON comparisons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
