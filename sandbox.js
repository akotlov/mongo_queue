// eslint-disable-next-line no-console
const Promise = require('bluebird');

module.exports = (processFile, childPool) => {
  return function process(job) {
    // retain returns forked 'master' process
    return childPool.retain(processFile).then(child => {
      child.send({
        cmd: 'start',
        job
      });

      const done = new Promise((resolve, reject) => {
        function handler(msg) {
          // console.log("sandbox line 15: ", msg)
          switch (msg.cmd) {
            case 'completed':
              child.removeListener('message', handler);
              resolve(msg.value);
              break;
            case 'failed':
            case 'error':
              child.removeListener('message', handler);
              reject(msg.value);
              break;
            case 'progress':
              job.progress(msg.value);
              break;
            default:
              console.log('Switch statement fell to default');
          }
        }

        child.on('message', handler);
      });

      return done.finally(() => {
        childPool.release(child);
      });
    });
  };
};
