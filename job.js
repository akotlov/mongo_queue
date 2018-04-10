const Promise = require('bluebird');

/**
interface JobOptions
{
  priority: Priority;
  attempts: number;
}
*/

// queue: Queue, jobId: string, data: {}, opts: JobOptions
class Job {
  constructor(queue, jobId, data, opts) {
    this.queue = queue;
    this.jobId = jobId;
    this.data = data;
    this.opts = opts;
    this.name = '__default__';
    this.stacktrace = [];
    this.returnvalue = null;
    this.attemptsMade = 0;
  }
  add() {
    const job = { name: this.name, jobID: this.jobId, data: this.data };
    this.queue.client
      .add(job)
      .then(result => console.log(result.ops[0]._id))
      .catch(err => {
        console.log(err);
      });
  }
  completed(job) {}

  remove() {}
}
module.exports = Job;
