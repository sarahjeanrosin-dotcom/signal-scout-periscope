import type { Comparison, ComparisonReport, Rating } from './types'
import { RATING_LABELS, RATING_SCORES } from './types'

// Client-side PDF generation using jsPDF
export async function generatePDF(comparison: Comparison) {
  const { default: jsPDF } = await import('jspdf')
  const report = comparison.report_data as ComparisonReport
  const allCompanies = [report.primary_company, ...report.competitors]

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 16
  const contentW = pageW - margin * 2
  let y = margin

  const COLORS = {
    primary: [99, 102, 241] as [number, number, number],
    text: [30, 41, 59] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    border: [226, 232, 240] as [number, number, number],
    best_at: [16, 185, 129] as [number, number, number],
    good_at: [59, 130, 246] as [number, number, number],
    okay_at: [245, 158, 11] as [number, number, number],
    mediocre_at: [249, 115, 22] as [number, number, number],
    bad_at: [239, 68, 68] as [number, number, number],
    gap_bg: [255, 251, 235] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  }

  function checkPageBreak(needed = 20) {
    if (y + needed > 282) {
      doc.addPage()
      y = margin
    }
  }

  function heading1(text: string) {
    checkPageBreak(12)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.primary)
    doc.text(text, margin, y)
    y += 8
  }

  function heading2(text: string) {
    checkPageBreak(10)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text(text, margin, y)
    y += 6
  }

  function body(text: string, indent = 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.text)
    const lines = doc.splitTextToSize(text, contentW - indent)
    checkPageBreak(lines.length * 4 + 2)
    doc.text(lines, margin + indent, y)
    y += lines.length * 4 + 2
  }

  function muted(text: string, indent = 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...COLORS.muted)
    const lines = doc.splitTextToSize(text, contentW - indent)
    checkPageBreak(lines.length * 4)
    doc.text(lines, margin + indent, y)
    y += lines.length * 4
  }

  function divider() {
    checkPageBreak(4)
    doc.setDrawColor(...COLORS.border)
    doc.line(margin, y, margin + contentW, y)
    y += 4
  }

  function ratingBadge(rating: Rating, x: number, bY: number) {
    const color = COLORS[rating]
    const label = RATING_LABELS[rating]
    const w = label.length * 1.8 + 4
    doc.setFillColor(...color)
    doc.roundedRect(x, bY - 3.5, w, 5, 1, 1, 'F')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text(label, x + 2, bY)
    return w
  }

  // ─── Cover ────────────────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pageW, 50, 'F')
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Signal Scout', margin, 22)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text('Competitive Intelligence Report', margin, 31)
  doc.setFontSize(9)
  doc.text(comparison.name, margin, 40)
  doc.text(`Generated ${new Date(report.generated_at).toLocaleDateString()}`, margin, 46)
  y = 60

  // ─── Executive Summary ────────────────────────────────────────────────────────
  heading2('Executive Summary')
  body(report.summary)
  y += 2

  // Strengths & Weaknesses — render row-by-row so wrapped items don't overlap
  const colW = contentW / 2 - 3
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(16, 185, 129)
  doc.text('Strengths', margin, y)
  doc.setTextColor(239, 68, 68)
  doc.text('Weaknesses', margin + colW + 6, y)
  y += 5

  const maxItems = Math.max(report.strengths.length, report.weaknesses.length)
  for (let i = 0; i < maxItems; i++) {
    const s = report.strengths[i]
    const w = report.weaknesses[i]
    const sLines = s ? doc.splitTextToSize(`• ${s}`, colW) : []
    const wLines = w ? doc.splitTextToSize(`• ${w}`, colW) : []
    const rowH_sw = Math.max(sLines.length, wLines.length) * 4 + 2
    checkPageBreak(rowH_sw)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.text)
    if (sLines.length) doc.text(sLines, margin, y)
    if (wLines.length) doc.text(wLines, margin + colW + 6, y)
    y += rowH_sw
  }
  y += 2
  divider()

  // ─── Feature Matrix ───────────────────────────────────────────────────────────
  heading2('Feature Matrix')
  const colWidths = [60, ...allCompanies.map(() => (contentW - 60) / allCompanies.length)]
  const rowH = 8

  // Header row
  checkPageBreak(rowH + 2)
  doc.setFillColor(248, 250, 252)
  doc.rect(margin, y - 5, contentW, rowH, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text('Feature', margin + 2, y)
  let xOff = margin + colWidths[0]
  allCompanies.forEach((company, i) => {
    const text = company.length > 16 ? company.slice(0, 15) + '…' : company
    doc.setTextColor(i === 0 ? COLORS.primary[0] : COLORS.muted[0], i === 0 ? COLORS.primary[1] : COLORS.muted[1], i === 0 ? COLORS.primary[2] : COLORS.muted[2])
    doc.text(text, xOff + 2, y)
    xOff += colWidths[i + 1]
  })
  y += rowH - 2
  divider()

  report.feature_matrix.forEach((row, idx) => {
    doc.setFontSize(8)
    doc.setFont('helvetica', row.gap_flag ? 'bold' : 'normal')
    const indent = row.gap_flag ? 4 : 2
    const featureLines = doc.splitTextToSize(row.feature_name, colWidths[0] - indent - 2)
    const rowH_actual = Math.max(rowH - 1, featureLines.length * 4 + 2)
    checkPageBreak(rowH_actual + 1)

    if (row.gap_flag) {
      doc.setFillColor(...COLORS.gap_bg)
      doc.rect(margin, y - 4.5, contentW, rowH_actual, 'F')
    }
    doc.setTextColor(...COLORS.text)
    if (row.gap_flag) {
      doc.setFontSize(7)
      doc.text('▲', margin, y)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
    }
    doc.text(featureLines, margin + indent, y)

    // Vertically center badges relative to the row
    const badgeY = y + (featureLines.length - 1) * 2
    let xO = margin + colWidths[0]
    allCompanies.forEach((company, i) => {
      const rating = row.ratings[company] as Rating | null
      if (rating) ratingBadge(rating, xO + 2, badgeY)
      xO += colWidths[i + 1]
    })
    y += rowH_actual
    if (idx < report.feature_matrix.length - 1) {
      doc.setDrawColor(...COLORS.border)
      doc.line(margin, y - 1.5, margin + contentW, y - 1.5)
    }
  })
  y += 4
  divider()

  // ─── Gap Analysis ─────────────────────────────────────────────────────────────
  if (report.gap_analysis.length > 0) {
    checkPageBreak(20)
    heading2('Gap Analysis & Recommendations')

    report.gap_analysis.forEach((gap, i) => {
      checkPageBreak(22)
      const severity = gap.gap_score >= 3 ? 'High' : gap.gap_score >= 2 ? 'Medium' : 'Low'
      const severityColor: [number, number, number] = gap.gap_score >= 3 ? [239, 68, 68] : gap.gap_score >= 2 ? [245, 158, 11] : [59, 130, 246]

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text(`${i + 1}. ${gap.feature_name}`, margin, y)

      doc.setFontSize(7.5)
      doc.setFillColor(...severityColor)
      doc.roundedRect(margin + 2 + doc.getTextWidth(`${i + 1}. ${gap.feature_name}`), y - 3.5, 22, 5, 1, 1, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text(`${severity} Gap`, margin + 4 + doc.getTextWidth(`${i + 1}. ${gap.feature_name}`), y)
      y += 5

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.muted)
      doc.text(
        `${report.primary_company}: ${RATING_LABELS[gap.primary_rating]} → ${gap.best_competitor}: ${RATING_LABELS[gap.best_competitor_rating]}`,
        margin + 4, y
      )
      y += 4

      body(gap.recommendation, 4)
      y += 2
    })
  }

  // ─── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.muted)
    doc.text(`Signal Scout Periscope · Page ${p} of ${pageCount}`, margin, 290)
    doc.text(comparison.name, pageW - margin, 290, { align: 'right' })
  }

  doc.save(`${comparison.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
}
