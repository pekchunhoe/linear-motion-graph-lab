import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:'*.spec.js',fullyParallel:false,workers:1,
  timeout:30000,reporter:[['list'],['json',{outputFile:'test-results/results.json'}]],
  use:{baseURL:'http://127.0.0.1:8000',channel:process.env.BROWSER_CHANNEL || 'msedge',headless:true,deviceScaleFactor:2,hasTouch:true},
  globalSetup:'./tests/browser-setup.js'
});
