// eslint-disable-next-line no-console
const Promise = require('bluebird');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = job => {
  console.log(job);
  const data = new Array(3276); // 32768);
  const dataSize = data.length;

  for (let c = 0; c < dataSize; c++) data[c] = getRandomInt(0, 256);

  data.sort((a, b) => a - b);

  const start = new Date();
  let sum = 0;

  for (let i = 0; i < 100000; i++) {
    // Primary loop
    for (let c = 0; c < dataSize; c++) {
      if (data[c] <= 128) {
        sum += data[c];
      }
    }
  }
  const end = new Date();
  const testRunTime = end.getTime() - start.getTime();
  // console.log('info', `Operation took ${testRunTime} msec`);

  return Promise.resolve(testRunTime);
  // return testRunTime;
};
