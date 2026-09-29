import { AppNav } from '@/src/components/app-nav';
import { ScreenshotGallery } from '@/src/components/screenshot-gallery';
import { UploadScreenshotForm } from '@/src/components/upload-screenshot-form';
import { requireUser } from '@/src/lib/auth';
import { listUserScreenshots } from '@/src/lib/screenshots';

export default async function Dashboard() {
  const user = await requireUser();
  const screenshots = await listUserScreenshots(user.id);
  return <main className="shell"><AppNav email={user.email} /><header className="header"><div><p className="brand">PRIVATE TIMELINE</p><h1>Your screenshots</h1><p className="muted">Newest captures first. Images are served with short-lived private links.</p></div><UploadScreenshotForm /></header><div className="stack"><ScreenshotGallery screenshots={screenshots} /></div></main>;
}
