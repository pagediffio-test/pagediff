export interface IStory {
  id: string;
  name: string;
  kind: string;
  parameters: { [key: string]: any };
}

export interface IStoryVariant {
  name: string;
  story: IStory;
  options: { [key: string]: any };
}
