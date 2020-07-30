import { Page } from "puppeteer";
import { URL } from "url";
import { IStory } from "../types";
import Debug from "./Debug";
import { sleep } from "./MetricsWatcher";

const dummyV5Story: IStory = {
  id: "__dummy__--__dummy__",
  kind: "__dummy__",
  name: "__dummy__",
  parameters: {},
};

const debug = Debug("setCurrentStory");

const storyIdMap = new WeakMap<Page, string>();

export default async function setCurrentStory(page: Page, story: IStory) {
  debug(story.id);

  if (storyIdMap.get(page) === story.id) {
    await page.evaluate(
      (d: any) => window.postMessage(JSON.stringify(d), "*"),
      createPostmessageData(dummyV5Story)
    );
    await sleep(100);
  }

  const data = createPostmessageData(story);

  let retries = 20;
  while (--retries) {
    // debug(`window.postMessage(JSON.stringify(${JSON.stringify(data)}), "*")`);
    try {
      await page.evaluate(
        (d) => window.postMessage(JSON.stringify(d), "*"),
        data
      );
    } catch (err) {}
    await sleep(100);

    const url = new URL(page.url());
    if (url.searchParams.get("id") === story.id) {
      storyIdMap.set(page, story.id);
      break;
    }
    await sleep(100);
  }
}

function createPostmessageData(story: IStory) {
  return {
    key: "storybook-channel",
    event: {
      type: "setCurrentStory",
      args: [
        {
          storyId: story.id,
        },
      ],
      from: "storyqa",
    },
  };
}
