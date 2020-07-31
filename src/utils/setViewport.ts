import { Page } from "puppeteer";
import Debug from "./Debug";

const debug = Debug("setViewport");
export const DEFAULT_VIEWPORT = 960;

export default async function setViewport(page: Page, viewport: number) {
  if (typeof viewport !== "number") {
    return;
  }
  // Sometimes, `page.screenshot` is completed before applying viewport unfortunately.
  // So we compare the current viewport with the next viewport and wait for `opt.viewportDelay` time if they are different.
  const currentViewport = page.viewport();
  if (viewport !== currentViewport.width) {
    debug(currentViewport.width, "->", viewport);
    await page.setViewport({ ...currentViewport, width: viewport });
  }
}
