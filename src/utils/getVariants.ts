import { IStory, IStoryVariant } from "../types";

export default function getVariants(story: IStory): IStoryVariant[] {
  const { variants, ...options } = story.parameters?.storyqa || {};

  const results: IStoryVariant[] = [];
  if (variants && Object.keys(variants).length) {
    Object.keys(variants).forEach((name) => {
      results.push({ name, story, options: { ...options, ...variants[name] } });
    });
  } else {
    results.push({ name: "default", story, options });
  }

  return results;
}
