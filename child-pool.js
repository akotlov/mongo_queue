// eslint-disable-next-line no-console
const { fork } = require('child_process');
const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const shortid = require('shortid');

module.exports = function ChildPool() {
  if (!(this instanceof ChildPool)) {
    return new ChildPool();
  }

  this.childPool = {};
  this.free = {};
  this.retained = {};
  this.id = shortid();
  console.log(this.id);

  this.retain = Promise.method(processFile => {
    let child = this.getFree(processFile).pop();
    // console.log('free: ', this.free, child);

    if (child) {
      return child;
    }

    child = fork(path.join(__dirname, './master.js'));
    child.processFile = processFile;

    this.retained[child.pid] = child;
    // console.log('this.retained ', this.retained);

    child.on('exit', this.remove.bind(this, child));

    const send = msg =>
      new Promise(resolve => {
        child.send(msg, resolve);
      });

    return send({ cmd: 'init', value: processFile, processPID: child.pid }).return(child);
  });

  this.release = child => {
    delete this.retained[child.pid];
    this.getFree(child.processFile).push(child);
  };

  this.remove = child => {
    delete this.retained[child.pid];

    const free = this.getFree(child.processFile);

    const childIndex = free.indexOf(child);
    if (childIndex > -1) {
      free.splice(childIndex, 1);
    }
  };

  this.kill = (child, signal) => {
    child.kill(signal);
    this.remove(child);
  };

  this.clean = () => {
    const children = _.values(this.retained).concat(this.getAllFree());
    const _this = this;
    children.forEach(child => {
      // TODO: We may want to use SIGKILL if the process does not die after some time.
      _this.kill(child, 'SIGTERM');
    });

    this.retained = {};
    this.free = {};
  };

  this.getFree = id =>
    // console.log("return value ", (this.free[id] = this.free[id] || []))
    (this.free[id] = this.free[id] || []);

  this.getAllFree = () => _.flatten(_.values(this.free));
};
