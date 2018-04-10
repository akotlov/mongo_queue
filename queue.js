// eslint-disable-next-line no-console

const EventEmitter = require('events');
const shortid = require('shortid');
const Client = require('./client');
const Job = require('./job');

class Queue extends EventEmitter {
  constructor(name, db) {
    super();
    this.name = name;
    this.db = db;
    this.handlers = {};
    this.processing = [];
    this.retrieving = 0;
    this.client = new Client(name, db); // TODO move to init()
  }

  process(name, concurrency, handler) {
    switch (arguments.length) {
      case 1:
        handler = name;
        concurrency = 1;
        name = '__default__';
        break;
      case 2: // (string, function) or (string, string) or (number, function) or (number, string)
        handler = concurrency;
        if (typeof name === 'string') {
          concurrency = 1;
        } else {
          concurrency = name;
          name = '__default__';
        }
        break;
      default:
        console.log('Switch statement fell to default');
    }

    this.setHandler(name, handler);

    this.start(concurrency);
  }

  add(data, opts) {
    const _this = this;
    opts = opts || {};
    const jobId = shortid.generate();
    const job = new Job(_this, jobId, data, opts);
    job.add();
  }

  /**
  Returns a promise that resolves to the next job in queue.
*/
  getNextJob() {
    const _this = this;
    this.client
      .moveToActive()
      .then(result => {
        if (result.value) {
          this.drained = false;
          return this.processJob(result.value);
        }
        this.drained = true;
        this.emit('drained', result.value);
        return null;
      })
      .catch(err => {
        console.log(err);
      });
  }

  start(concurrency) {
    const _this = this;

    return this.run(concurrency).catch(err => {
      _this.emit('error', err, 'error running queue');
      throw err;
    });
  }

  setHandler(name, handler) {
    if (!handler) {
      throw new Error('Cannot set an undefined handler');
    }
    if (this.handlers[name]) {
      throw new Error(`Cannot define the same handler twice ${name}`);
    }

    if (typeof handler === 'string') {
      this.childPool = this.childPool || require('./child-pool')();
      const sandbox = require('./sandbox');
      this.handlers[name] = sandbox(handler, this.childPool).bind(this);
    } else {
      handler = handler.bind(this);

      if (handler.length > 1) {
        this.handlers[name] = Promise.promisify(handler);
      } else {
        this.handlers[name] = Promise.method(handler);
      }
    }
  }

  run(concurrency) {
    const _this = this;
    const promises = [];
    while (concurrency--) {
      promises.push(
        new Promise(resolve => {
          _this.processJobs(concurrency, resolve);
        })
      );
    }
    return Promise.all(promises);
  }

  processJobs(index, resolve) {
    this.getNextJob();
  }

  processJob(job) {
    const _this = this;

    if (!job) {
      return Promise.resolve();
    }

    function handleCompleted(result) {
      job.result = result.value;
      return _this.client
        .moveToCompleted(job)
        .then(record => {
          _this.emit('completed', job, record, result.childProcessPID, 'active');
          // TODO deal with 'job' reference, clean up
        })
        .catch(err => {
          console.log(err);
        });
    }
    // return jobData ? _this.nextJobFromJobData(jobData[0], jobData[1]) : null;

    function handleFailed(err) {
      const error = err.cause || err; // Handle explicit rejection
      /* return job.moveToFailed(err).then(jobData => {
        _this.emit('failed', job, error, 'active');
        return jobData ? _this.nextJobFromJobData(jobData[0], jobData[1]) : null;
      }); */
    }

    const handler = this.handlers[job.name];

    if (!handler) {
      return handleFailed(Error(`Missing process handler for job type ${job.name}`));
    }
    const jobPromise = handler(job.data);

    _this.emit('active', job, jobPromise, 'waiting');

    return jobPromise
      .then(handleCompleted)
      .catch(handleFailed)
      .finally(() => {
        this.processJobs();
      });
  }
}

module.exports = Queue;
