'use strict';


const puppeteer = require('puppeteer');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');


function compareImages(expectedScreenshotImagePath, actualScreenshotImagePath, diffScreenshotImagePath, options = {}) {
  options.threshold = typeof options.threshold !== 'undefined' ? options.threshold : 0.1;

  return new Promise(async (resolve, reject) => {
    const expectedScreenshotImage = PNG.sync.read(fs.readFileSync(expectedScreenshotImagePath));
    const actualScreenshotImage = PNG.sync.read(fs.readFileSync(actualScreenshotImagePath));
    const { width, height } = expectedScreenshotImage;
    const diff = new PNG({ width, height });

    const pixelMatchResult = pixelmatch(expectedScreenshotImage.data, actualScreenshotImage.data, diff.data, expectedScreenshotImage.width, expectedScreenshotImage.height, {
      threshold: options.threshold,
      alpha: 0,
    });

    fs.writeFileSync(diffScreenshotImagePath, PNG.sync.write(diff));

    resolve({
      numberOfDifferentPixels: pixelMatchResult,
      width: expectedScreenshotImage.width,
      height: expectedScreenshotImage.height,
    });
  });
}


function test(url, expectedScreenshotImagePath, options = {}) {
  options.width = options.width || 1280;
  const randomHeightForInitialPageLoad = 600;

  return new Promise(async (resolve, reject) => {
    const actualScreenshotImagePathBase = 'test/' + encodeURIComponent(url);
    const actualScreenshotImagePath = actualScreenshotImagePathBase + '-output.png';
    const diffScreenshotImagePath = actualScreenshotImagePathBase + '-diff.png';

    const browser = await puppeteer.launch({
      args: [
        '--disable-infobars',
      ],
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: options.width,
      height: randomHeightForInitialPageLoad,
      deviceScaleFactor: 1,
    });

    await page.goto(url);

    const bodyScrollHeightAfterPageLoad = await page.evaluate(() => document.body.scrollHeight);

    options.height = options.height || bodyScrollHeightAfterPageLoad;

    await page.setViewport({
      width: options.width,
      height: options.height,
      deviceScaleFactor: 1,
    });

    await page.screenshot({ path: actualScreenshotImagePath });

    await browser.close();

    compareImages(expectedScreenshotImagePath, actualScreenshotImagePath, diffScreenshotImagePath)
      .then((result) => {
        result.url = url;
        resolve(result);
      });
  });
}


function createBaselineScreenshot(url, options = {}) {
  options.width = options.width || 1280;
  const randomHeightForInitialPageLoad = 600;

  return new Promise(async (resolve, reject) => {
    const imagePath = 'test/' + encodeURIComponent(url);

    const browser = await puppeteer.launch({
      args: [
        '--disable-infobars',
      ],
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: options.width,
      height: randomHeightForInitialPageLoad,
      deviceScaleFactor: 1,
    });

    await page.goto(url);

    const bodyScrollHeightAfterPageLoad = await page.evaluate(() => document.body.scrollHeight);

    options.height = options.height || bodyScrollHeightAfterPageLoad;

    await page.setViewport({
      width: options.width,
      height: options.height,
      deviceScaleFactor: 1,
    });

    await page.screenshot({ path: imagePath });

    await browser.close();

    resolve(url, imagePath);
  });
}


function logResult(result) {
  console.log(result.url + ':');
  console.log('error as px:', result.numberOfDifferentPixels);
  console.log(' error as %:', (Math.round(100 * 100 * result.numberOfDifferentPixels / (result.width * result.height)) / 100) + '%');
}
