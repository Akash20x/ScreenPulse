'use client';

import { useState } from 'react';

type Client = 'codex' | 'claude';
type Surface = 'desktop' | 'cli';

function CopyButton({
  value,
  label = 'Copy'
}: {
  value: string;
  label?: string;
}) {
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
  return (
    <button className="copy-button" type="button" onClick={() => void copy()}>
      {copied ? 'Copied' : label}
    </button>
  );
}

function Command({ value }: { value: string }) {
  return (
    <div className="command">
      <code>{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

export function McpGuide({
  endpoint,
  isProduction
}: {
  endpoint: string;
  isProduction: boolean;
}) {
  const [client, setClient] = useState<Client>('codex');
  const [surface, setSurface] = useState<Surface>('desktop');
  const visibleEndpoint = isProduction
    ? endpoint
    : 'https://your-screenpulse-domain.com/mcp';
  const command =
    client === 'codex'
      ? `codex mcp add screenpulse --url ${visibleEndpoint}`
      : `claude mcp add --transport http --scope user screenpulse ${visibleEndpoint}`;
  const verifyCommand =
    client === 'codex' ? 'codex mcp list' : 'claude mcp list';
  const clientName = client === 'codex' ? 'Codex' : 'Claude';
  const docsUrl =
    client === 'codex'
      ? 'https://learn.chatgpt.com/docs/extend/mcp'
      : surface === 'desktop'
        ? 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp'
        : 'https://code.claude.com/docs/en/mcp';

  return (
    <div className="mcp-guide-modern">
      <header className="mcp-modern-hero">
        <p className="mcp-kicker">ScreenPulse / MCP</p>
        <h1>Get more from your saved screenshots.</h1>
        <p className="mcp-intro">
          Connect ScreenPulse to find your folders, understand an image, and
          save an explanation for later. You choose which screenshots to discuss
          and whether to include your personal notes.
        </p>
      </header>

      <section
        className="mcp-endpoint-panel"
        aria-labelledby="mcp-endpoint-title"
      >
        <div className="mcp-endpoint-heading">
          <div>
            <span className="mcp-live-dot" aria-hidden="true" />{' '}
            <span>Connect ScreenPulse</span>
          </div>
          <span className="mcp-protocol">MCP connection</span>
        </div>
        <h2 id="mcp-endpoint-title">Your connection address</h2>
        <div className="mcp-endpoint-value">
          <code>{visibleEndpoint}</code>
          <CopyButton value={visibleEndpoint} label="Copy address" />
        </div>
        {!isProduction && (
          <p className="mcp-endpoint-preview">
            This is an example address. The person hosting ScreenPulse needs to
            publish the app and configure its public address before you can
            connect.
          </p>
        )}
        <div className="mcp-capabilities">
          <span>✓ View your screenshots</span>
          <span>✓ Save explanations</span>
          <span>✓ ScreenPulse sign-in required</span>
        </div>
      </section>

      <section className="mcp-setup-flow" aria-labelledby="mcp-setup-title">
        <div className="mcp-flow-heading">
          <div>
            <p className="mcp-kicker">Setup</p>
            <h2 id="mcp-setup-title">Choose the app you use.</h2>
          </div>
        </div>
        <div className="mcp-client-tabs" aria-label="Choose an AI client">
          <button
            className={client === 'codex' ? 'active' : ''}
            type="button"
            aria-pressed={client === 'codex'}
            onClick={() => setClient('codex')}
          >
            Codex
          </button>
          <button
            className={client === 'claude' ? 'active' : ''}
            type="button"
            aria-pressed={client === 'claude'}
            onClick={() => setClient('claude')}
          >
            Claude
          </button>
        </div>
        <div className="mcp-surface-row">
          <div
            className="mcp-surface-switch"
            aria-label="Choose desktop or command line"
          >
            <button
              className={surface === 'desktop' ? 'selected' : ''}
              type="button"
              aria-pressed={surface === 'desktop'}
              onClick={() => setSurface('desktop')}
            >
              {client === 'codex' ? 'ChatGPT desktop app' : 'Desktop app'}
            </button>
            <button
              className={surface === 'cli' ? 'selected' : ''}
              type="button"
              aria-pressed={surface === 'cli'}
              onClick={() => setSurface('cli')}
            >
              Command line
            </button>
          </div>
        </div>
        <p className="mcp-surface-note">
          {surface === 'desktop'
            ? client === 'codex'
              ? 'For Codex in the ChatGPT desktop app, connect through ChatGPT’s settings. Follow the three steps below.'
              : 'Use a custom remote connector in Claude Desktop. Team and Enterprise users may need an owner or administrator to add it first. These setup steps follow Claude’s documentation; ScreenPulse’s image workflow has not yet been fully tested in Claude Desktop.'
            : `First install ${client === 'codex' ? 'Codex CLI' : 'Claude Code'} and complete its own sign-in. Run the commands below in a terminal. ${client === 'claude' ? 'The user scope makes this connection available across your projects.' : 'ScreenPulse sign-in is separate from your Codex sign-in.'}`}
        </p>
        <div
          className="mcp-workflow"
          aria-label={
            client === 'codex' && surface === 'desktop'
              ? 'Codex in the ChatGPT desktop app setup'
              : `${clientName} ${surface} setup`
          }
        >
          {surface === 'desktop' ? (
            client === 'codex' ? (
              <>
                <article>
                  <span className="step-number">01</span>
                  <h3>Add a server</h3>
                  <p>
                    In the <strong>ChatGPT desktop app</strong>, open{' '}
                    <strong>Settings → Plugins</strong>, select the{' '}
                    <strong>MCPs</strong> tab, then choose{' '}
                    <strong>Add → Add MCP server</strong>.
                  </p>
                </article>
                <article>
                  <span className="step-number">02</span>
                  <h3>Enter the connection details</h3>
                  <p>
                    Set <strong>Name</strong> to <strong>screenpulse</strong>{' '}
                    and <strong>Type</strong> to{' '}
                    <strong>Streamable HTTP</strong>. Paste the connection
                    address above into <strong>URL</strong>. Leave{' '}
                    <strong>Bearer token env var</strong>,{' '}
                    <strong>Headers</strong>, and{' '}
                    <strong>Headers from environment variables</strong> empty,
                    then select <strong>Save</strong>. Restart only if the app
                    asks you to.
                  </p>
                </article>
                <article>
                  <span className="step-number">03</span>
                  <h3>Sign in and try Codex</h3>
                  <p>
                    Return to <strong>Settings → Plugins → MCPs</strong> and
                    make sure ScreenPulse is switched on. If{' '}
                    <strong>Authenticate</strong> appears, select it, sign in to
                    ScreenPulse in the browser, review access, and select{' '}
                    <strong>Allow</strong>. If you already signed in, continue
                    to a new Codex chat in ChatGPT and ask “Use screenpulse mcp
                    and show my folders”.
                  </p>
                </article>
              </>
            ) : (
              <>
                <article>
                  <span className="step-number">01</span>
                  <h3>Open connectors</h3>
                  <p>
                    In Claude Desktop, open{' '}
                    <strong>Customize → Connectors</strong>. Choose{' '}
                    <strong>+ Add → Add custom connector</strong>. If your
                    organization already added ScreenPulse, select its{' '}
                    <strong>Connect</strong> option instead.
                  </p>
                </article>
                <article>
                  <span className="step-number">02</span>
                  <h3>Add ScreenPulse</h3>
                  <p>
                    Enter <strong>ScreenPulse</strong> and the full connection
                    address above, including <strong>/mcp</strong>. Select{' '}
                    <strong>Continue</strong>, review the detected settings,
                    then continue. Choose <strong>Sign in now</strong> and,
                    under <strong>OAuth client</strong>,{' '}
                    <strong>Register automatically</strong>. Leave request
                    headers empty, then select <strong>Add</strong>.
                  </p>
                </article>
                <article>
                  <span className="step-number">03</span>
                  <h3>Sign in and enable</h3>
                  <p>
                    Complete ScreenPulse sign-in in the browser, review access,
                    and select <strong>Allow</strong>. In a Claude chat, open{' '}
                    <strong>+ → Connectors</strong> and enable ScreenPulse. Ask
                    “Use screenpulse mcp and show my folders” to check access.
                  </p>
                </article>
              </>
            )
          ) : (
            <>
              <article>
                <span className="step-number">01</span>
                <h3>Add the server</h3>
                <p>Run this in your terminal:</p>
                <Command value={command} />
              </article>
              <article>
                <span className="step-number">02</span>
                <h3>Sign in to ScreenPulse</h3>
                {client === 'codex' ? (
                  <>
                    <p>
                      If adding the server did not already complete sign-in,
                      run:
                    </p>
                    <Command value="codex mcp login screenpulse" />
                    <p>
                      Sign in to ScreenPulse in the browser, review access, and
                      select <strong>Allow</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p>Start Claude Code:</p>
                    <Command value="claude" />
                    <p>
                      Inside its chat, enter <code>/mcp</code>, select{' '}
                      <strong>screenpulse</strong>, and follow the
                      authentication option. Complete ScreenPulse sign-in in the
                      browser and select <strong>Allow</strong>. This also works
                      on versions without a separate MCP login command.
                    </p>
                  </>
                )}
              </article>
              <article>
                <span className="step-number">03</span>
                <h3>Check the connection</h3>
                <p>In a separate terminal, check ScreenPulse’s status:</p>
                <Command value={verifyCommand} />
                <p>
                  Then{' '}
                  {client === 'codex' ? (
                    <>
                      run <code>codex</code>
                    </>
                  ) : (
                    'return to Claude Code'
                  )}{' '}
                  and enter <code>/mcp</code> to check available tools. Ask “Use
                  screenpulse mcp and show my folders”. A saved server entry
                  alone does not confirm access.
                </p>
              </article>
            </>
          )}
        </div>
        <a
          className="mcp-doc-link mcp-flow-doc"
          href={docsUrl}
          target="_blank"
          rel="noreferrer"
        >
          {client === 'codex' && surface === 'desktop'
            ? 'Official ChatGPT desktop MCP setup guide'
            : `Official ${clientName} ${surface === 'desktop' ? 'desktop' : 'command-line'} setup guide`}{' '}
          <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section
        className="mcp-after-connect"
        aria-labelledby="mcp-after-connect-title"
      >
        <div>
          <p className="mcp-kicker">After you connect</p>
          <h2 id="mcp-after-connect-title">
            Try a question about your images.
          </h2>
          <p className="muted">
            Here are examples for everyday use. Use your own folder and image
            names when trying them in Codex or Claude.
          </p>
        </div>
        <div className="mcp-prompt-grid">
          <Command value="Use screenpulse mcp and show my folders" />
          <Command value="Show the all screenshots in my Ideas folder with approved clickable links" />
          <Command value="Analyze the first three screenshots you just fetched and save a short explanation for each in ScreenPulse." />
          <Command value="Look at event-poster.jpg in my Events folder in ScreenPulse. What are the date, time, and location shown on the poster?" />
          <Command value="Summarize meeting-notes.jpg in my Work folder in ScreenPulse. Include my saved additional notes and highlight the main points." />
          <Command value="Look at the next three screenshots in my Ideas folder in ScreenPulse. Read each image separately and save a short explanation for each. Tell me if any could not be read or saved" />
        </div>
      </section>

      <section className="mcp-faq" aria-labelledby="mcp-workflow-help">
        <h2 id="mcp-workflow-help">Working with your screenshots</h2>
        <details>
          <summary>What can I ask about an image?</summary>
          <p>
            Ask for a summary, an explanation, or specific details shown in the
            image. Give the folder and full image name, including .jpg or .png,
            so the assistant can find the right screenshot. To explain an image,
            it needs to load the image itself; listing its filename or getting a
            link does not mean it has read it.
          </p>
        </details>
        <details>
          <summary>When are my additional notes included?</summary>
          <p>
            Ask the assistant to include your saved additional notes for the
            screenshot you choose. Your screenshot-read permission also covers
            these notes. They are requested separately for that screenshot;
            folder lists, screenshot lists, and batch viewing links do not
            include them.
          </p>
        </details>
        <details>
          <summary>Where do saved explanations go?</summary>
          <p>
            When you ask the assistant to save an explanation, it is stored as
            that screenshot’s analysis in ScreenPulse. Saving requires
            permission to write analysis. Existing saved analysis is skipped
            rather than overwritten, and your additional notes stay separate.
            Ask the assistant to report which explanations were saved, skipped,
            or could not be saved.
          </p>
        </details>
        <details>
          <summary>How do I work through a large folder?</summary>
          <p>
            Start with three screenshots at a time and ask the assistant to read
            each image separately. Folder listings follow your saved folder
            order. To avoid repeating completed work, ask for screenshots
            without saved analysis. If you ask for the “next three,” continue in
            the same chat so the assistant has the previous results for context.
          </p>
        </details>
        <details>
          <summary>What if an image cannot be read?</summary>
          <p>
            Ask which image could not be loaded or read, and let the assistant
            continue with the others. Retry a failed load, or upload a clearer
            version if the text is too small or blurry. Check important details
            against the original image.
          </p>
        </details>
      </section>

      <section className="mcp-faq" aria-labelledby="mcp-faq-title">
        <p className="mcp-kicker">Need help?</p>
        <h2 id="mcp-faq-title">Connection help</h2>
        <details>
          <summary>
            Where do I check the connection for Codex in ChatGPT?
          </summary>
          <p>
            In the ChatGPT desktop app, open{' '}
            <strong>Settings → Plugins → MCPs</strong> and find{' '}
            <strong>screenpulse</strong>. Make sure its switch is on. If{' '}
            <strong>Authenticate</strong> appears, select it and finish signing
            in and approving access in the browser. The switch shows that the
            server is enabled; confirm access by asking “Use screenpulse mcp and
            show my folders” in a Codex chat.
          </p>
        </details>
        <details>
          <summary>
            I already signed in, but the assistant cannot find ScreenPulse.
          </summary>
          <p>
            Start a new chat and try “Use screenpulse mcp and show my folders.”
            If the tools are still unavailable, restart the app, check that
            ScreenPulse is enabled, and verify its connection address against
            the one above. Sign in again only if prompted. In Claude, check that
            the ScreenPulse connector is connected and enabled for your
            conversation.
          </p>
        </details>
        <details>
          <summary>
            A new ScreenPulse feature is missing. What should I do?
          </summary>
          <p>
            Refresh or reconnect ScreenPulse using your app’s MCP or connector
            settings, then start a new chat. If it is still missing, restart the
            app and try again. If the assistant reports an error, keep the exact
            message so you can identify whether the problem is the connection,
            permission, or feature itself.
          </p>
        </details>
        <details>
          <summary>
            Why am I asked to approve an action after signing in?
          </summary>
          <p>
            Signing in connects your account; your AI app separately decides
            which actions need approval. Creating a clickable viewing link
            allows anyone holding that link to view the image for two hours,
            even though the screenshot belongs to you. Review the requested
            action in your app. Including “approved” in a prompt does not change
            its permission settings, and requests for five images or fewer are
            not automatically exempt.
          </p>
        </details>
        <details>
          <summary>
            Can I use an address that only works on my computer?
          </summary>
          <p>
            Use the published ScreenPulse address shown above. Claude’s remote
            connectors connect from Anthropic’s servers, so an address such as
            localhost cannot be used for this setup. If an example address is
            shown above, ask the person hosting ScreenPulse to finish
            configuring it.
          </p>
        </details>
        <details>
          <summary>How do I disconnect ScreenPulse?</summary>
          <p>
            In the ChatGPT desktop app, open{' '}
            <strong>Settings → Plugins → MCPs</strong> and turn off
            ScreenPulse’s switch. In Claude, disconnect or disable the
            ScreenPulse connector. This does not delete your screenshots or
            notes, or revoke temporary viewing links that have already been
            created; those links remain usable until they expire or their
            screenshot is deleted.
          </p>
        </details>
      </section>
    </div>
  );
}
