import { writeFileSync } from "fs";
import { IStoryVariant } from "./types";
import { createExecutionService } from "./utils/asyncUtils";
import Debug from "./utils/Debug";
import getScreenshot from "./utils/getScreenshot";
import getStories from "./utils/getStories";
import getVariants from "./utils/getVariants";
import setCurrentStory from "./utils/setCurrentStory";
import setViewport, { DEFAULT_VIEWPORT } from "./utils/setViewport";
import StaticServer from "./utils/StaticServer";
import StoryBrowser from "./utils/StoryBrowser";
import { v4 } from "uuid";
import { join } from "path";

const getGitHubEnv = () => {
  const keys = Object.keys(process.env).filter((key) =>
    key.startsWith("GITHUB_")
  );
  const env = {};
  keys.forEach((key) => {
    env[key] = process.env[key];
  });
  return env;
};

const keyForVariant = (variant: IStoryVariant) =>
  `${variant.story.id}|${variant.name}`;

const debug = Debug("generateAssets");

const POOL_SIZE = 3;

export default async function generateAssets(
  builtPath: string,
  outputPath: string
) {
  const server = new StaticServer(builtPath);
  const address = await server.start();
  const stories = await getStories(address);

  const variants = stories.flatMap(getVariants);

  const workers = await Promise.all(
    new Array(POOL_SIZE).fill(0).map((i) => new StoryBrowser(address).init())
  );

  const data = await runTasks(workers, variants, outputPath);
  const pages = variants.map((variant) => {
    const key = keyForVariant(variant);
    const { html, screenshot, viewport } = data[key];
    return {
      story: { ...variant.story, version: "5" },
      viewport,
      screenshot,
      html,
    };
  });

  const metadata = {
    env: getGitHubEnv(),
    pages,
  };

  console.log(JSON.stringify(metadata));
  await Promise.all(workers.map((worker) => worker.destroy()));
  server.close();
  process.exit(0);
}

async function runTasks(
  workers: StoryBrowser[],
  variants: IStoryVariant[],
  outputPath: string,
  maxRetries = 3
) {
  const data: {
    [key: string]: { html: string; viewport: number; screenshot: string };
  } = {};

  const tasks = variants.map((variant) => ({ retries: 0, variant }));
  const service = createExecutionService(
    workers,
    tasks,
    ({ retries, variant }, { push }) => async (worker) => {
      try {
        const { page } = worker;
        if (!page) {
          throw new Error("Page is not present.");
        }

        const viewport = variant.options.viewport || DEFAULT_VIEWPORT;
        await setViewport(page, viewport);

        worker.resourceWatcher?.clear();
        await setCurrentStory(page, variant.story);
        debug(
          "Wait for requested resources resolved",
          worker.resourceWatcher?.getRequestedUrls()
        );
        await worker.waitBrowserMetricsStable("preEmit");
        await worker.resourceWatcher?.waitForRequestsComplete();

        await worker.waitBrowserMetricsStable("postEmit");
        const html = await worker.page!.content();

        const buffer = await getScreenshot(page, variant.story);
        const filename = `${v4()}-${Date.now()}.png`;
        const targetPath = join(outputPath, filename);
        writeFileSync(targetPath, buffer);
        data[keyForVariant(variant)] = { html, viewport, screenshot: filename };
        console.log(`Captured ${filename}`);
      } catch (err) {
        console.error(
          `Failed to capture story ${variant.story.id}(${variant.name}): ${err.message}`
        );
        if (retries < maxRetries) {
          push({ retries: retries + 1, variant });
        } else {
          throw err;
        }
      }
    }
  );

  try {
    await service.execute();
  } finally {
    service.close();
  }

  return data;
}
