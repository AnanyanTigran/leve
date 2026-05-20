import { getTranslations } from 'next-intl/server'
import { AppHeader } from '@/components/shared/app-header'
import { TemplateGrid } from '@/components/templates/template-grid'

export default async function TemplatesPage() {
  const t = await getTranslations('templates')

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader
        variant="app"
        showBack
        backHref="/upload"
        title={t('title')}
        rightSlot={<span className="text-[13px] text-text-muted">{t('step')}</span>}
      />
      <TemplateGrid />
    </div>
  )
}
