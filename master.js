let status;
let processor;
let processPID;

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

function wrapJob(job) {
  job.progress = progress => {
    process.send({
      cmd: 'progress',
      value: progress
    });
  };
  return job;
}

process.on('message', msg => {
  switch (msg.cmd) {
    case 'init':
      processor = require(msg.value);
      processPID = msg.processPID;
      if (processor.default) {
        // support es2015 module.
        processor = processor.default;
      }
      if (processor.length > 1) {
        processor = Promise.promisify(processor);
      } else {
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
            process.send({
              cmd: 'completed',
              value: result,
              childProcessPID: processPID
            });
          },
          err => {
            process.send({
              cmd: 'failed',
              value: err,
              childProcessPID: processPID
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
