import * as _debug from "debug";

export default function Debug(namespace) {
  return _debug(`storyqa:${namespace}`);
}
