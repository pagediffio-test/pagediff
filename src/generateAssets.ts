import { writeFileSync } from "fs";
import { IStoryVariant } from "./types";
import { createExecutionService } from "./utils/asyncUtils";
import Debug from "./utils/Debug";
import getScreenshot from "./utils/getScreenshot";
import getStories from "./utils/getStories";
import getVariants from "./utils/getVariants";
import setCurrentStory from "./utils/setCurrentStory";
import setViewport from "./utils/setViewport";
import StaticServer from "./utils/StaticServer";
import StoryBrowser from "./utils/StoryBrowser";

const debug = Debug("generateAssets");

const POOL_SIZE = 3;
let count = 0;

export default async function generateAssets(builtPath: string) {
  const server = new StaticServer(builtPath);
  const address = await server.start();
  const stories = await getStories(address);

  const variants = stories.flatMap(getVariants);
  const map = {};
  setInterval(() => {
    if (Object.keys(map).length < 8) {
      console.dir(map, { depth: 20 });
    }
  }, 15000);
  variants.forEach((variant) => {
    map[variant.story.id + "/" + variant.name] = {
      browser: true,
      page: true,
      viewport: true,
      currentStory: true,
      screenshot: true,
      release: true,
    };
  });

  const workers = await Promise.all(
    new Array(POOL_SIZE).fill(0).map((i) => new StoryBrowser(address).init())
  );

  const start = Date.now();
  await runTasks(workers, variants);
  await Promise.all(workers.map((worker) => worker.destroy()));
  server.close();
  console.log(Date.now() - start);
  process.exit(0);
}

async function runTasks(
  workers: StoryBrowser[],
  variants: IStoryVariant[],
  maxRetries = 3
) {
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

        await setViewport(page, variant.options.viewport);

        worker.resourceWatcher?.clear();
        await setCurrentStory(page, variant.story);
        debug(
          "Wait for requested resources resolved",
          worker.resourceWatcher?.getRequestedUrls()
        );
        await worker.waitBrowserMetricsStable("preEmit");
        await worker.resourceWatcher?.waitForRequestsComplete();

        await worker.waitBrowserMetricsStable("postEmit");
        const buffer = await getScreenshot(page, variant.story);
        writeFileSync(`ret/${variant.story.id}-${variant.name}.png`, buffer);
        console.log(`Captured ${variant.story.id}(${variant.name})`);
        console.log(++count);
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
}
