import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'compound-time-machine',
  brand: {
    // 자체 브랜드 색 — src/styles/tokens.css의 --brand-primary와 같은 값
    primaryColor: '#4F46E5',
  },
  permissions: [],
  webBundleDir: 'dist',
});
