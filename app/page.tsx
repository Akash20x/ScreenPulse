import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconArrowDown,
  IconBrowser,
  IconCamera,
  IconCalendarClock,
  IconCheck,
  IconCloudUpload,
  IconDeviceMobile,
  IconEye,
  IconFolder,
  IconMenu2,
  IconPlayerPause,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { LandingReveal } from '@/src/components/landing-reveal';
import { createClient } from '@/src/lib/supabase/server';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'ScreenPulse | Your private screenshot timeline',
  description: 'Capture the browser work you choose, revisit it privately, and add context only when you want it.',
};

const workflow = [
  {
    icon: IconBrowser,
    title: 'Install the extension',
    text: 'Add ScreenPulse to Chrome and choose the start date, end date, and daily hours for capture.',
  },
  {
    icon: IconCalendarClock,
    title: 'Capture on your schedule',
    text: 'Every 30 minutes, ScreenPulse saves the Chrome webpage that is currently visible during your selected window.',
  },
  {
    icon: IconCloudUpload,
    title: 'Review from your gallery',
    text: 'Screenshots save locally first, then can upload to your private web gallery for review from another device.',
  },
];

export default async function Home() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const user = hasSupabaseConfig
    ? (await (await createClient()).auth.getUser()).data.user
    : null;
  const accountHref = user ? '/dashboard' : '/signup';
  const accountLabel = user ? 'Dashboard' : 'Create account';

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link className={styles.brand} href="/" aria-label="ScreenPulse home">
          <span className={styles.brandMark} aria-hidden="true" />
          SCREENPULSE
        </Link>
        <div className={styles.navLinks}>
          <a href="#how-it-works">How it works</a>
          <a href="#use-cases">Use cases</a>
          <a href="#privacy">Privacy</a>
          <Link className={styles.accountLink} href={accountHref}>{accountLabel}</Link>
        </div>
        <details className={styles.mobileNav}>
          <summary aria-label="Open navigation"><IconMenu2 aria-hidden="true" size={25} stroke={2} /></summary>
          <div className={styles.mobileNavLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#use-cases">Use cases</a>
            <a href="#privacy">Privacy</a>
            <Link href={accountHref}>{accountLabel}</Link>
          </div>
        </details>
      </nav>

      <div id="main-content">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <LandingReveal className={styles.heroCopy}>
            <p className={styles.eyebrow}>Chrome extension and private web gallery</p>
            <h1 id="hero-heading">Capture the browser work you choose.</h1>
            <p className={styles.heroText}>Set a date and daily time window. ScreenPulse captures your currently visible Chrome webpage every 30 minutes, or you can upload screenshots directly.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#how-it-works">Explore the workflow <IconArrowDown aria-hidden="true" size={18} stroke={2} /></a>
              <Link className={styles.secondaryButton} href={accountHref}>{accountLabel}</Link>
            </div>
          </LandingReveal>
          <LandingReveal className={styles.heroArt} delay={0.1}>
            <Image className={styles.heroImage} src="/images/screenpulse-hero.png" alt="A laptop with a visual browser workspace and one captured image floating in front of it." width={1584} height={990} priority sizes="(max-width: 780px) 100vw, 56vw" />
          </LandingReveal>
        </section>

        <section id="how-it-works" className={styles.section} aria-labelledby="workflow-heading">
          <LandingReveal className={styles.sectionHeading}>
            <h2 id="workflow-heading">From active Chrome page to private timeline.</h2>
            <p>Use the extension for automatic browser capture. The schedule is yours, and each screenshot starts on your device.</p>
          </LandingReveal>
          <div className={styles.workflowGrid}>
            {workflow.map(({ icon: Icon, title, text }, index) => (
              <LandingReveal className={styles.step} delay={index * 0.08} key={title}>
                <span className={styles.stepIcon}><Icon aria-hidden="true" size={22} stroke={1.8} /></span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </LandingReveal>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.methodsSection}`} aria-labelledby="methods-heading">
          <LandingReveal className={styles.sectionHeading}>
            <h2 id="methods-heading">Add screenshots your way.</h2>
            <p>ScreenPulse supports both automatic extension captures and direct uploads in the web app.</p>
          </LandingReveal>
          <div className={styles.methodsGrid}>
            <LandingReveal className={styles.method}>
              <span className={styles.stepIcon}><IconCamera aria-hidden="true" size={23} stroke={1.8} /></span>
              <div><h3>Automatic Chrome captures</h3><p>Within the date and time range you set, the extension captures only the active visible Chrome webpage every 30 minutes.</p></div>
            </LandingReveal>
            <LandingReveal className={styles.method} delay={0.08}>
              <span className={styles.stepIcon}><IconUpload aria-hidden="true" size={23} stroke={1.8} /></span>
              <div><h3>Direct web uploads</h3><p>Already have an image? Add it directly from the web gallery when a manual screenshot is the better fit.</p></div>
            </LandingReveal>
          </div>
        </section>

        <section id="privacy" className={styles.privacyBand} aria-labelledby="privacy-heading">
          <div className={`${styles.section} ${styles.privacyLayout}`}>
            <LandingReveal className={styles.privacyArt}>
              <Image className={styles.privacyImage} src="/images/screenpulse-private-library.png" alt="A physical archive box holding a small private image library with a pause control." width={1254} height={1254} sizes="(max-width: 780px) 100vw, 40vw" />
            </LandingReveal>
            <LandingReveal className={styles.privacyContent} delay={0.08}>
              <p className={styles.eyebrow}>Built to stay in your hands</p>
              <h2 id="privacy-heading">Capture context, not everything.</h2>
              <p>ScreenPulse is designed around boundaries that are easy to understand and easy to change.</p>
              <ul className={styles.privacyList}>
                <li><IconEye aria-hidden="true" size={21} stroke={1.8} />Only the active, visible HTTP or HTTPS browser tab can be captured.</li>
                <li><IconPlayerPause aria-hidden="true" size={21} stroke={1.8} />Pause tracking whenever you need to. Your existing schedule remains available.</li>
                <li><IconCheck aria-hidden="true" size={21} stroke={1.8} />Incognito windows and browser internal pages are never captured.</li>
              </ul>
            </LandingReveal>
          </div>
        </section>

        <section id="use-cases" className={styles.section} aria-labelledby="use-cases-heading">
          <LandingReveal className={styles.sectionHeading}>
            <h2 id="use-cases-heading">Make a visual record useful.</h2>
            <p>ScreenPulse helps you revisit browser work without relying on memory, tabs, or a perfect note-taking habit.</p>
          </LandingReveal>
          <div className={styles.useCaseGrid}>
            <LandingReveal className={styles.useCase}><IconBrowser aria-hidden="true" size={25} stroke={1.7} /><div><h3>Pick up where you left off</h3><p>Return to a browser page, pull request, document, or research thread you saw earlier.</p></div></LandingReveal>
            <LandingReveal className={styles.useCase} delay={0.08}><IconFolder aria-hidden="true" size={25} stroke={1.7} /><div><h3>Keep research in view</h3><p>Build a chronological visual trail while you compare sources, references, and browser-based work.</p></div></LandingReveal>
            <LandingReveal className={styles.useCase} delay={0.16}><IconDeviceMobile aria-hidden="true" size={25} stroke={1.7} /><div><h3>Review away from your desk</h3><p>Open your private web timeline from another device when you need a quick visual reminder.</p></div></LandingReveal>
          </div>
        </section>

        <section id="context" className={`${styles.section} ${styles.contextSection}`} aria-labelledby="context-heading">
          <div className={styles.contextLayout}>
            <LandingReveal className={styles.contextContent}>
              <p className={styles.eyebrow}>Optional Codex analysis</p>
              <h2 id="context-heading">Turn a screenshot into useful context.</h2>
              <p>After you connect ScreenPulse to Codex through MCP, Codex can retrieve an authorized screenshot, inspect it, write a factual description, and save that description back to the same screenshot in your private gallery.</p>
              <div className={styles.contextList}>
                <div className={styles.contextItem}><IconFolder aria-hidden="true" size={23} stroke={1.8} /><div><strong>Connect your private account</strong><span>Authorize Codex to access only the screenshots you permit through ScreenPulse MCP.</span></div></div>
                <div className={styles.contextItem}><IconEye aria-hidden="true" size={23} stroke={1.8} /><div><strong>Ask Codex to inspect a screenshot</strong><span>Codex receives the image, explains the visible details, then saves that description to the matching timeline item.</span></div></div>
              </div>
            </LandingReveal>
            <LandingReveal className={styles.contextArt} delay={0.1}>
              <Image className={styles.contextImage} src="/images/screenpulse-mobile-timeline.png" alt="A phone displaying a visual timeline with captured images and a contextual note." width={1125} height={1407} sizes="(max-width: 780px) 100vw, 36vw" />
            </LandingReveal>
          </div>
        </section>

        <section className={`${styles.section} ${styles.notSection}`} aria-labelledby="boundaries-heading">
          <LandingReveal>
            <h2 id="boundaries-heading">What ScreenPulse is not.</h2>
          </LandingReveal>
          <LandingReveal delay={0.08}>
            <ul className={styles.notList}>
              <li><IconX aria-hidden="true" size={20} stroke={2} />It is not desktop-wide monitoring or a record of every app you use.</li>
              <li><IconX aria-hidden="true" size={20} stroke={2} />It does not capture Incognito windows, Chrome internal pages, or full-page scrolls.</li>
              <li><IconX aria-hidden="true" size={20} stroke={2} />It does not send every screenshot to an AI service or make AI processing a requirement.</li>
            </ul>
          </LandingReveal>
        </section>

        <section className={`${styles.section} ${styles.finalCta}`} aria-labelledby="cta-heading">
          <LandingReveal>
            <h2 id="cta-heading">{user ? 'Your private timeline is ready when you are.' : 'Start with the work you choose to keep.'}</h2>
            <p>{user ? 'Open your dashboard to review screenshots, upload an image, or manage the devices connected to your account.' : 'Create a private account, connect your extension when ready, and build a visual history on your terms.'}</p>
          </LandingReveal>
          <LandingReveal delay={0.08}><Link className={styles.primaryButton} href={accountHref}>{accountLabel}</Link></LandingReveal>
        </section>
      </div>

    </main>
  );
}
