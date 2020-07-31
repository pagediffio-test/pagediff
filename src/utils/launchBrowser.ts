import { Browser, launch, LaunchOptions } from "puppeteer";
import { DEFAULT_VIEWPORT } from "./setViewport";
import Debug from "./Debug";

const debug = Debug("launchBrowser");

export default async function launchBrowser(
  retries: number = 1
): Promise<Browser> {
  const launchArgs: LaunchOptions = {
    headless: true,
    // executablePath:
    //   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    defaultViewport: {
      width: DEFAULT_VIEWPORT,
      height: 1024,
    },
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  };

  try {
    return await launch(launchArgs);
  } catch (err) {
    console.error(err);

    if (retries > 0) {
      debug(`Issue launching Chrome, retrying ${retries} times.`);
      return await launchBrowser(retries - 1);
    }

    debug(`Issue launching Chrome, retries exhausted.`);
    throw err;
  }
}
