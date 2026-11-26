import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconArrowDown,
  IconBrowser,
  IconCheck,
  IconCloudUpload,
  IconDeviceMobile,
  IconEye,
  IconFolder,
  IconMenu2,
  IconUpload,
} from '@tabler/icons-react';
import { LandingReveal } from '@/src/components/landing-reveal';
import { createClient } from '@/src/lib/supabase/server';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'ScreenPulse | Your screenshot library',
  description: 'Upload screenshots, organize them into folders, add notes, and explore them with your AI assistant.',
};

const workflow = [
  {
    icon: IconUpload,
    title: 'Upload your screenshots',
    text: 'Choose a folder and upload up to 50 images in batches of five. Retry any failed images without repeating successful uploads.',
  },
  {
    icon: IconFolder,
    title: 'Arrange your collection',
    text: 'Give your folders and screenshots useful names, arrange images in order, and save your own notes.',
  },
  {
    icon: IconEye,
    title: 'Review and ask questions',
    text: 'Swipe through images, listen to your notes, or connect your AI assistant to explain a screenshot when you ask.',
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
            <p className={styles.eyebrow}>Your screenshots, organized</p>
            <h1 id="hero-heading">Keep your screenshots useful.</h1>
            <p className={styles.heroText}>Upload screenshots, organize them into folders, and add the context you want to remember. Review on any device or ask your connected AI assistant about a saved image.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#how-it-works">Explore the workflow <IconArrowDown aria-hidden="true" size={18} stroke={2} /></a>
              <Link className={styles.secondaryButton} href={accountHref}>{accountLabel}</Link>
            </div>
          </LandingReveal>
          <LandingReveal className={styles.heroArt} delay={0.1}>
            <Image className={styles.heroImage} src="/images/screenpulse-hero.png" alt="A laptop displaying a visual collection with an image floating in front of it." width={1584} height={990} priority sizes="(max-width: 780px) 100vw, 56vw" />
          </LandingReveal>
        </section>

        <section id="how-it-works" className={styles.section} aria-labelledby="workflow-heading">
          <LandingReveal className={styles.sectionHeading}>
            <h2 id="workflow-heading">From saved images to a useful collection.</h2>
            <p>Choose what to upload, arrange it in your own order, and return to it whenever you need.</p>
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
            <p>Add images from your computer or phone, then put each one where it belongs.</p>
          </LandingReveal>
          <div className={styles.methodsGrid}>
            <LandingReveal className={styles.method}>
              <span className={styles.stepIcon}><IconCloudUpload aria-hidden="true" size={23} stroke={1.8} /></span>
              <div><h3>Batch uploads</h3><p>Choose up to 50 JPEG, PNG, or WebP images, up to 5 MB each. Review duplicates before uploading and retry failed batches.</p></div>
            </LandingReveal>
            <LandingReveal className={styles.method} delay={0.08}>
              <span className={styles.stepIcon}><IconUpload aria-hidden="true" size={23} stroke={1.8} /></span>
              <div><h3>Add an image in the right place</h3><p>Use a screenshot’s menu to upload another image immediately before or after it in your folder.</p></div>
            </LandingReveal>
          </div>
        </section>

        <section id="privacy" className={styles.privacyBand} aria-labelledby="privacy-heading">
          <div className={`${styles.section} ${styles.privacyLayout}`}>
            <LandingReveal className={styles.privacyArt}>
              <Image className={styles.privacyImage} src="/images/screenpulse-private-library.png" alt="An archive box representing a private image library." width={1254} height={1254} sizes="(max-width: 780px) 100vw, 40vw" />
            </LandingReveal>
            <LandingReveal className={styles.privacyContent} delay={0.08}>
              <p className={styles.eyebrow}>Built to stay in your hands</p>
              <h2 id="privacy-heading">Your images, your account.</h2>
              <p>Your screenshots stay in private storage. You decide when to include notes, request analysis, or create a viewing link.</p>
              <ul className={styles.privacyList}>
                <li><IconEye aria-hidden="true" size={21} stroke={1.8} />Sign in to access your screenshot library.</li>
                <li><IconFolder aria-hidden="true" size={21} stroke={1.8} />Keep your images and notes together in folders you control.</li>
                <li><IconCheck aria-hidden="true" size={21} stroke={1.8} />Anyone with a public viewing link can open its image until the link expires or is revoked.</li>
              </ul>
            </LandingReveal>
          </div>
        </section>

        <section id="use-cases" className={styles.section} aria-labelledby="use-cases-heading">
          <LandingReveal className={styles.sectionHeading}>
            <h2 id="use-cases-heading">Make a visual record useful.</h2>
            <p>Keep references, ideas, learning materials, and work notes together so you can find and understand them later.</p>
          </LandingReveal>
          <div className={styles.useCaseGrid}>
            <LandingReveal className={styles.useCase}><IconBrowser aria-hidden="true" size={25} stroke={1.7} /><div><h3>Pick up where you left off</h3><p>Review a saved reference, event detail, document, or idea without searching through scattered images.</p></div></LandingReveal>
            <LandingReveal className={styles.useCase} delay={0.08}><IconFolder aria-hidden="true" size={25} stroke={1.7} /><div><h3>Keep research in view</h3><p>Group related images in a folder and arrange them in the order that makes sense to you.</p></div></LandingReveal>
            <LandingReveal className={styles.useCase} delay={0.16}><IconDeviceMobile aria-hidden="true" size={25} stroke={1.7} /><div><h3>Review away from your desk</h3><p>Open your screenshot library on your phone, swipe between images, and read your saved notes.</p></div></LandingReveal>
          </div>
        </section>

        <section id="context" className={`${styles.section} ${styles.contextSection}`} aria-labelledby="context-heading">
          <div className={styles.contextLayout}>
            <LandingReveal className={styles.contextContent}>
              <p className={styles.eyebrow}>Optional AI analysis</p>
              <h2 id="context-heading">Turn a screenshot into useful context.</h2>
              <p>Connect ScreenPulse through MCP to let your AI assistant inspect a screenshot and save a factual description to your private gallery when you ask.</p>
              <div className={styles.contextList}>
                <div className={styles.contextItem}><IconFolder aria-hidden="true" size={23} stroke={1.8} /><div><strong>Connect your private account</strong><span>Review the access requested by your assistant through ScreenPulse MCP.</span></div></div>
                <div className={styles.contextItem}><IconEye aria-hidden="true" size={23} stroke={1.8} /><div><strong>Ask about a screenshot</strong><span>Your assistant can explain the visible details and save a description to that screenshot when you request it.</span></div></div>
              </div>
            </LandingReveal>
            <LandingReveal className={styles.contextArt} delay={0.1}>
              <Image className={styles.contextImage} src="/images/screenpulse-mobile-timeline.png" alt="A phone displaying saved images with a contextual note." width={1125} height={1407} sizes="(max-width: 780px) 100vw, 36vw" />
            </LandingReveal>
          </div>
        </section>

        <section className={`${styles.section} ${styles.notSection}`} aria-labelledby="boundaries-heading">
          <LandingReveal>
            <h2 id="boundaries-heading">Keep the details that matter.</h2>
          </LandingReveal>
          <LandingReveal delay={0.08}>
            <ul className={styles.notList}>
              <li><IconCheck aria-hidden="true" size={20} stroke={2} />Add paragraph notes to record what an image means to you.</li>
              <li><IconCheck aria-hidden="true" size={20} stroke={2} />Use image-only view when you want to focus on the screenshot.</li>
              <li><IconCheck aria-hidden="true" size={20} stroke={2} />Ask your connected assistant for an explanation and save it for later.</li>
            </ul>
          </LandingReveal>
        </section>

        <section className={`${styles.section} ${styles.finalCta}`} aria-labelledby="cta-heading">
          <LandingReveal>
            <h2 id="cta-heading">{user ? 'Your screenshot library is ready when you are.' : 'Start with the work you choose to keep.'}</h2>
            <p>{user ? 'Open your dashboard to upload screenshots, organize your folders, and review your notes.' : 'Create an account, upload your first screenshots, and organize them in a folder.'}</p>
          </LandingReveal>
          <LandingReveal delay={0.08}><Link className={styles.primaryButton} href={accountHref}>{accountLabel}</Link></LandingReveal>
        </section>
      </div>

    </main>
  );
}
