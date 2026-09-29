import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'ScreenPulse',
    description: 'Private, scheduled screenshots of the active Chrome webpage.',
    permissions: ['alarms', 'storage'],
    // Chrome requires <all_urls> for automatic captureVisibleTab access. Runtime
    // eligibility remains restricted to normal HTTP/HTTPS pages in src/capture.ts.
    optional_host_permissions: ['<all_urls>'],
    action: {
      default_title: 'ScreenPulse',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
  },
});
