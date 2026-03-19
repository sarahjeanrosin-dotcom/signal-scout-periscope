'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { Comparison } from '@/lib/types'

interface Props {
  comparison: Comparison
}

export function PdfDownloadButton({ comparison }: Props) {
  async function handleDownload() {
    const { generatePDF } = await import('@/lib/pdf')
    generatePDF(comparison)
  }

  return (
    <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
      <Download className="h-4 w-4" />
      Download PDF
    </Button>
  )
}
