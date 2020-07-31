import generateAssets from "./generateAssets";

generateAssets(process.argv[2], process.argv[3]).catch((err) => {
  console.error(err);
  process.exit(1);
});
