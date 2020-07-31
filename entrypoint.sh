#!/bin/bash

cd $GITHUB_WORKSPACE
echo "Running `npm install`..."
npm install

mkdir $GITHUB_WORKSPACE/storybook-output
cd $GITHUB_WORKSPACE/storybook-output

STORY_OUTPUT=$GITHUB_WORKSPACE/__pagediff__githubactions__/storybook-output
SCREENSHOT_OUTPUT_RELATIVE=__pagediff__githubactions__/screenshot-output
SCREENSHOT_OUTPUT=$GITHUB_WORKSPACE/$SCREENSHOT_OUTPUT_RELATIVE

echo `mkdir -p $STORY_OUTPUT`
mkdir -p $STORY_OUTPUT

echo "Running `npm run build-storybook -- --quiet -o $STORY_OUTPUT`..."
npm run build-storybook -- --quiet warn -o $STORY_OUTPUT

echo `mkdir -p $SCREENSHOT_OUTPUT`
mkdir -p $SCREENSHOT_OUTPUT

echo "Generating screenshots from $STORY_OUTPUT to $SCREENSHOT_OUTPUT"
node /pagediff/dist/index.js $STORY_OUTPUT $SCREENSHOT_OUTPUT

echo "::set-output name=screenshot-path::$SCREENSHOT_OUTPUT_RELATIVE"
