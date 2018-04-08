let status;
let processor;
const Promise = require('bluebird');

// https://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
if (!('toJSON' in Error.prototype)) {
  Object.defineProperty(Error.prototype, 'toJSON', {
    value() {
      const alt = {};

      Object.getOwnPropertyNames(this).forEach(function(key) {
        alt[key] = this[key];
      }, this);

      return alt;
    },
    configurable: true,
    writable: true
  });
}

process.on('message', msg => {
  switch (msg.cmd) {
    case 'init':
      processor = require(msg.value);
      if (processor.default) {
        // support es2015 module.
        processor = processor.default;
      }
      if (processor.length > 1) {
        // console.log("processor.length > 1")
        processor = Promise.promisify(processor);
      } else {
        // console.log("processor.length 1")
        processor = Promise.method(processor);
      }
      status = 'IDLE';
      break;

    case 'start':
      if (status !== 'IDLE') {
        return process.send({
          cmd: 'error',
          err: new Error('cannot start a not idling child process')
        });
      }
      status = 'STARTED';
      Promise.resolve(processor(wrapJob(msg.job)) || {})
        .then(
          result => {
            // console.log("master line 53: ", result)
            process.send({
              cmd: 'completed',
              value: result
            });
          },
          err => {
            process.send({
              cmd: 'failed',
              value: err
            });
          }
        )
        .finally(() => {
          status = 'IDLE';
        });
      break;
    case 'stop':
      break;
    default:
      console.log('Switch statement fell to default');
  }
});

function wrapJob(job) {
  job.progress = progress => {
    process.send({
      cmd: 'progress',
      value: progress
    });
  };
  return job;
}
