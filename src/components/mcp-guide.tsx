'use client';

import { useState } from 'react';

type Client = 'codex' | 'claude';
type Surface = 'desktop' | 'cli';

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return <button className="copy-button" type="button" onClick={() => void copy()}>{copied ? 'Copied' : label}</button>;
}

function Command({ value }: { value: string }) {
  return <div className="command"><code>{value}</code><CopyButton value={value} /></div>;
}

export function McpGuide({ endpoint, isProduction }: { endpoint: string; isProduction: boolean }) {
  const [client, setClient] = useState<Client>('codex');
  const [surface, setSurface] = useState<Surface>('desktop');
  const visibleEndpoint = isProduction ? endpoint : 'https://your-screenpulse-domain.com/mcp';
  const command = client === 'codex' ? `codex mcp add screenpulse --url ${visibleEndpoint}` : `claude mcp add --transport http --scope user screenpulse ${visibleEndpoint}`;
  const verifyCommand = client === 'codex' ? 'codex mcp list' : 'claude mcp list';
  const clientName = client === 'codex' ? 'Codex' : 'Claude';
  const docsUrl = client === 'codex' ? 'https://developers.openai.com/codex/mcp' : surface === 'desktop' ? 'https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities' : 'https://code.claude.com/docs/en/mcp';

  return <div className="mcp-guide-modern">
    <header className="mcp-modern-hero"><p className="mcp-kicker">ScreenPulse / MCP</p><h1>Connect your private timeline to the AI tools you already use.</h1><p className="mcp-intro">Let Codex or Claude inspect your ScreenPulse screenshots in context, then save precise descriptions back to your timeline when you ask.</p></header>

    <section className="mcp-endpoint-panel" aria-labelledby="mcp-endpoint-title"><div className="mcp-endpoint-heading"><div><span className="mcp-live-dot" aria-hidden="true" /> <span>Remote MCP server</span></div><span className="mcp-protocol">Streamable HTTP</span></div><h2 id="mcp-endpoint-title">Your connection endpoint</h2><div className="mcp-endpoint-value"><code>{visibleEndpoint}</code><CopyButton value={visibleEndpoint} label="Copy endpoint" /></div>{!isProduction && <p className="mcp-endpoint-preview">Preview URL only. Deploy ScreenPulse and set NEXT_PUBLIC_APP_URL to your public HTTPS domain before connecting.</p>}<div className="mcp-capabilities"><span>✓ Read private screenshots</span><span>✓ Save factual descriptions</span><span>OAuth protected</span></div></section>

    <section className="mcp-setup-flow" aria-labelledby="mcp-setup-title">
      <div className="mcp-flow-heading"><div><p className="mcp-kicker">Setup</p><h2 id="mcp-setup-title">Choose your workspace.</h2></div></div>
      <div className="mcp-client-tabs" aria-label="Choose an AI client"><button className={client === 'codex' ? 'active' : ''} type="button" aria-pressed={client === 'codex'} onClick={() => setClient('codex')}>Codex</button><button className={client === 'claude' ? 'active' : ''} type="button" aria-pressed={client === 'claude'} onClick={() => setClient('claude')}>Claude</button></div>
      <div className="mcp-surface-row"><div className="mcp-surface-switch" aria-label="Choose desktop or command line"><button className={surface === 'desktop' ? 'selected' : ''} type="button" aria-pressed={surface === 'desktop'} onClick={() => setSurface('desktop')}>Desktop app</button><button className={surface === 'cli' ? 'selected' : ''} type="button" aria-pressed={surface === 'cli'} onClick={() => setSurface('cli')}>CLI</button></div></div>
      <p className="mcp-surface-note">{surface === 'desktop' ? client === 'codex' ? 'Use the MCP server settings in the Codex desktop app. No terminal command is needed.' : 'Use a custom remote connector in Claude Desktop. This is separate from Claude Code CLI configuration.' : 'Run these commands in your preferred terminal.'}</p>
      <div className="mcp-workflow" aria-label={`${clientName} ${surface} setup`}>
        {surface === 'desktop' ? client === 'codex' ? <>
          <article><span className="step-number">01</span><h3>Add a server</h3><p>In the Codex desktop app, open <strong>Settings → MCP servers → Add server</strong>.</p></article>
          <article><span className="step-number">02</span><h3>Enter the endpoint</h3><p>Name it <strong>screenpulse</strong>, select <strong>Streamable HTTP</strong>, paste the endpoint above, then <strong>Save</strong> and <strong>Restart</strong>.</p></article>
          <article><span className="step-number">03</span><h3>Authenticate</h3><p>Select <strong>Authenticate</strong> for ScreenPulse. Sign in in the browser, review access, and select <strong>Allow</strong>. Type <code>/mcp</code> in the composer to check the connection.</p></article>
        </> : <>
          <article><span className="step-number">01</span><h3>Open connectors</h3><p>In Claude Desktop, go to <strong>Customize → Connectors</strong>. Select <strong>+</strong>, then <strong>Add custom connector</strong>.</p></article>
          <article><span className="step-number">02</span><h3>Enter the endpoint</h3><p>Name it <strong>ScreenPulse</strong>, paste the endpoint above, and select <strong>Add</strong>. Leave optional OAuth client credentials blank; ScreenPulse registers clients automatically.</p></article>
          <article><span className="step-number">03</span><h3>Connect your account</h3><p>Follow Claude’s connection prompt. Sign in to ScreenPulse, review access, and select <strong>Allow</strong>. Enable the connector for your conversation and try a prompt below.</p></article>
        </> : <>
          <article><span className="step-number">01</span><h3>Add the server</h3><p>Run:</p><Command value={command} /></article>
          <article><span className="step-number">02</span><h3>Check configuration</h3><p>List your MCP servers. Being listed does not mean OAuth is complete.</p><Command value={verifyCommand} /></article>
          <article><span className="step-number">03</span><h3>Sign in and verify</h3><p>{client === 'codex' ? 'Run the OAuth login command, then sign in to ScreenPulse and select Allow. Inside Codex, use /mcp to confirm the server is active.' : 'Start Claude Code and use /mcp to connect ScreenPulse, or run the login command below. Sign in to ScreenPulse and select Allow.'}</p><Command value={client === 'codex' ? 'codex mcp login screenpulse' : 'claude mcp login screenpulse'} /></article>
        </>}
      </div>
      <a className="mcp-doc-link mcp-flow-doc" href={docsUrl} target="_blank" rel="noreferrer">Official {clientName} {surface === 'desktop' ? 'desktop' : 'CLI'} setup guide <span aria-hidden="true">↗</span></a>
    </section>

    <section className="mcp-after-connect" aria-labelledby="mcp-after-connect-title"><div><p className="mcp-kicker">After you connect</p><h2 id="mcp-after-connect-title">Start with a real question.</h2></div><div className="mcp-prompt-grid"><Command value="List my five newest ScreenPulse screenshots." /><Command value="Inspect my latest ScreenPulse screenshot and describe what is visibly happening." /><Command value="Describe my latest five screenshots factually and save the descriptions to ScreenPulse." /></div></section>

    <section className="mcp-faq" aria-labelledby="mcp-faq-title"><p className="mcp-kicker">Need help?</p><h2 id="mcp-faq-title">Connection FAQ</h2><details><summary>Why is a public HTTPS URL required?</summary><p>Deploy ScreenPulse first, then set <code>NEXT_PUBLIC_APP_URL</code> to its HTTPS URL. Claude Desktop connects from Anthropic’s cloud, so localhost and private-network URLs will not work. The endpoint above updates when your deployment is configured.</p></details><details><summary>The authorization page did not open. What now?</summary><p>On Codex Desktop select <strong>Authenticate</strong>; in Codex CLI run <code>codex mcp login screenpulse</code>. On Claude Desktop reconnect the custom connector; in Claude Code use <code>/mcp</code> or <code>claude mcp login screenpulse</code>. Complete ScreenPulse sign-in and consent in the browser.</p></details><details><summary>The server is disconnected or I need to revoke it.</summary><p>Check the endpoint and reconnect in that client’s MCP or connector settings. Remove the server or disconnect the connector to stop using it; each client connection is personal.</p></details></section>
  </div>;
}
