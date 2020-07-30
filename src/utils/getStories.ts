import { resolve } from "url";
import { IStory } from "../types";
import launchBrowser from "./launchBrowser";

const storybookClientAPIKey = "__STORYBOOK_CLIENT_API__";

const fetchStoriesFromWindow = `(async () => {
  return await new Promise((resolve, reject) => {
    const storybookClientAPIKey = '${storybookClientAPIKey}';
    // Check if the window has stories every 100ms for up to 10 seconds.
    // This allows 10 seconds for any async pre-tasks (like fetch) to complete.
    // Usually stories will be found on the first loop.
    var checkStories = function(timesCalled) {
      const api = window[storybookClientAPIKey];
      if (api) {
        if (!api.raw) {
          reject(new Error('Storybook v3/v4 is not supported'));
          return;
        }
        const stories = api
          .raw()
          .map(_ => ({ id: _.id, kind: _.kind, name: _.name, parameters: _.parameters }));
        resolve(stories);
      } else if (timesCalled < 100) {
        // Stories not found yet, try again 100ms from now
        setTimeout(() => {
          checkStories(timesCalled + 1);
        }, 100);
      } else {
        reject(new Error(
          'Storybook object not found on window. ' +
          'Open your storybook and check the console for errors.'
        ));
      }
    };
    checkStories(0);
  });
})()`;

export default async function getStories(address: string): Promise<IStory[]> {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto(resolve(address, "iframe.html"));

  let stories: null | IStory[] = null;

  try {
    stories = (await page.evaluate(fetchStoriesFromWindow)) as any[];
  } finally {
    await browser.close();
  }

  if (!stories) {
    const message =
      "Storybook object not found on window. Open your storybook and check the console for errors.";
    throw new Error(message);
  }

  console.dir(stories, { depth: 1000 });
  return (stories as IStory[]).filter(
    ({ id }) => id === "adminintegrationview--startup-plan" || true
  );
}
