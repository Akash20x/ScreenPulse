import { findPublicShare } from '@/src/lib/screenshot-shares';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Shared screenshot | ScreenPulse',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const
};

export default async function PublicScreenshot({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await findPublicShare(token);
  if (!share)
    return (
      <main className="shared-page">
        <section className="panel">
          <h1>Link unavailable</h1>
          <p>This link has expired, been revoked, or is no longer available.</p>
        </section>
      </main>
    );
  return (
    <main className="shared-page">
      <p className="brand">SCREENPULSE</p>
      <h1>Shared screenshot</h1>
      <img
        className="shared-image"
        src={`/share/${token}/image`}
        alt="Shared screenshot"
      />
      {share.analysis_snapshot && (
        <section className="panel shared-copy">
          <h2>AI analysis</h2>
          <p>{share.analysis_snapshot}</p>
        </section>
      )}
      {share.notes_snapshot && (
        <section className="panel shared-copy">
          <h2>Additional notes</h2>
          <p>{share.notes_snapshot}</p>
        </section>
      )}
    </main>
  );
}
