import { Page } from "puppeteer";
import { IStory } from "../types";

export default async function getScreenshot(page: Page, story: IStory) {
  await page.evaluate(
    () =>
      new Promise((res) =>
        (window as any).requestIdleCallback(() => res(), { timeout: 3000 })
      )
  );

  const buffer = await page.screenshot({ fullPage: true });
  return buffer;
}
