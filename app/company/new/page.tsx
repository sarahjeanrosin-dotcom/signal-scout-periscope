'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Globe, Loader2, Sparkles } from 'lucide-react'

export default function NewCompanyPage() {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'analyzing'>('form')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep('analyzing')
    setLoading(true)

    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), website: website.trim() || undefined }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setStep('form')
      setLoading(false)
      return
    }

    router.push(`/company/${data.company.id}`)
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Add a Company</h1>
          <p className="text-slate-500 mt-1">
            AI will analyze its features, capabilities, and suggest competitors.
          </p>
        </div>

        {step === 'analyzing' ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-indigo-600 animate-pulse" />
                  </div>
                </div>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Analyzing {name}...</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Claude is researching client-facing features, rating capabilities, and identifying competitors.
                This takes about 15-30 seconds.
              </p>
              <div className="mt-6 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-400" />
                Company Details
              </CardTitle>
              <CardDescription>
                Provide a company name — optionally add their website for better accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700" htmlFor="name">
                    Company name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      placeholder="e.g. Salesforce, HubSpot, Notion..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700" htmlFor="website">
                    Website <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="website"
                      placeholder="https://example.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-3">
                  <Button variant="primary" type="submit" disabled={!name.trim() || loading} className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Analyze with AI
                  </Button>
                  <Button variant="outline" type="button" onClick={() => router.back()}>
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Analysis uses Claude to extract client-facing features and rate capabilities based on publicly available information.
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
