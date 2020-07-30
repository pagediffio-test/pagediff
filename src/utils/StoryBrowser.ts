import { Browser, Page } from "puppeteer";
import { resolve } from "url";
import launchBrowser from "./launchBrowser";
import MetricsWatcher, { sleep } from "./MetricsWatcher";
import ResourceWatcher from "./ResourceWatcher";
import Debug from "./Debug";

const debug = Debug("StoryBrowser");

class StoryBrowser {
  browser: Browser | null = null;
  page: Page | null = null;
  resourceWatcher: ResourceWatcher | null = null;

  constructor(private address: string) {}

  async init() {
    this.browser = await launchBrowser();
    this.page = await this.browser.newPage();
    await this.page.goto(resolve(this.address, "iframe.html"));
    this.resourceWatcher = new ResourceWatcher(this.page).init();

    return this;
  }

  async waitBrowserMetricsStable(phase: "preEmit" | "postEmit") {
    if (!this.page) return;

    const metricsWatchRetryCount = 1000;
    const mw = new MetricsWatcher(this.page, metricsWatchRetryCount);
    const checkCountUntillStable = await mw.waitForStable();
    debug(
      `[${phase}] Browser metrics got stable in ${checkCountUntillStable} times checks.`
    );
    if (checkCountUntillStable >= metricsWatchRetryCount) {
      console.warn(
        `Metrics is not stable while ${metricsWatchRetryCount} times`
      );
    }
  }

  async destroy() {
    try {
      await this.page?.close();
      await sleep(50);
      await this.browser?.close();
    } catch (e) {}
  }
}

export default StoryBrowser;
