import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Building2, GitCompare, Plus, RefreshCw } from 'lucide-react'
import type { Company, Comparison } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: companies }, { data: comparisons }] = await Promise.all([
    supabase
      .from('companies')
      .select('*')
      .order('updated_at', { ascending: false }),
    supabase
      .from('comparisons')
      .select('*, companies!comparisons_primary_company_id_fkey(name)')
      .order('updated_at', { ascending: false })
      .limit(5),
  ])

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              Track and compare your competitive landscape
            </p>
          </div>
          <Link href="/company/new">
            <Button variant="primary" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Company
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{companies?.length ?? 0}</p>
                  <p className="text-sm text-slate-500">Companies tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <GitCompare className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{comparisons?.length ?? 0}</p>
                  <p className="text-sm text-slate-500">Comparisons saved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">Weekly</p>
                  <p className="text-sm text-slate-500">Auto-refresh cadence</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Companies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-400" />
                Companies
              </CardTitle>
              <CardDescription>Click a company to view features and competitors</CardDescription>
            </CardHeader>
            <CardContent>
              {!companies || companies.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm mb-4">No companies yet</p>
                  <Link href="/company/new">
                    <Button variant="primary" size="sm">Add your first company</Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(companies as Company[]).map((company) => (
                    <li key={company.id}>
                      <Link
                        href={`/company/${company.id}`}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors group"
                      >
                        <div>
                          <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {company.name}
                          </p>
                          {company.industry && (
                            <p className="text-xs text-slate-400 mt-0.5">{company.industry}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">
                            Updated {new Date(company.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent comparisons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-slate-400" />
                Recent Comparisons
              </CardTitle>
              <CardDescription>Your saved competitive analysis reports</CardDescription>
            </CardHeader>
            <CardContent>
              {!comparisons || comparisons.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm">
                    No comparisons yet. Add a company and select competitors to get started.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {comparisons.map((comparison: Comparison & { companies: { name: string } }) => (
                    <li key={comparison.id}>
                      <Link
                        href={`/compare/${comparison.id}`}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors group"
                      >
                        <div>
                          <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {comparison.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {comparison.competitor_company_ids.length} competitors
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {new Date(comparison.updated_at).toLocaleDateString()}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
