import { getTranslations } from 'next-intl/server'
import { AppHeader } from '@/components/shared/app-header'
import { UploadZone } from '@/components/upload/upload-zone'

export default async function UploadPage() {
  const t = await getTranslations('upload')

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader
        variant="app"
        showBack
        backHref="/"
        title={t('title')}
        rightSlot={<span className="text-[13px] text-text-muted">{t('step')}</span>}
      />
      <UploadZone />
    </div>
  )
}
