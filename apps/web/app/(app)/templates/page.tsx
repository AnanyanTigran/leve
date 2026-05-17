import { AppHeader } from '@/components/shared/app-header'
import { TemplateGrid } from '@/components/templates/template-grid'

export default function TemplatesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <AppHeader
        variant="app"
        showBack
        backHref="/upload"
        title="Choose template"
        rightSlot={<span className="text-[13px] text-text-muted">2 of 3</span>}
      />
      <TemplateGrid />
    </div>
  )
}
