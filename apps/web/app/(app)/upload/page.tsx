import { AppHeader } from '@/components/shared/app-header'
import { UploadZone } from '@/components/upload/upload-zone'

export default function UploadPage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <AppHeader
        variant="app"
        showBack
        backHref="/"
        title="Upload photo"
        rightSlot={<span className="text-[13px] text-text-muted">1 of 3</span>}
      />
      <UploadZone />
    </div>
  )
}
