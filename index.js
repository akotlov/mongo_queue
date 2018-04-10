const { MongoClient } = require('mongodb');
const Benchmark = require('benchmark');
const Queue = require('./queue');

const url = 'mongodb://localhost:27017';
const dbName = 'mongodb-queue';
let db = null;

const init = () => {
  MongoClient.connect(url, (err, client) => {
    if (err) {
      console.log('Unable to connect MongoDB');
      process.exit(1);
    }
    console.log('Connected successfully to mongodb server');
    db = client.db(dbName);

    const queue = new Queue('test1', db);
    // const queue2 = new Queue('test2', db);
    setTimeout(() => {
      queue.process(2, './branch-prediction');
    }, 3000);
    // queue2.process(1, './branch-prediction');

    const jobData = {
      dataSize: 1000
    };

    const start = new Date();

    for (let i = 0; i < 10; i++) {
      queue.add(jobData.dataSize + i);
      // queue2.add(jobData);
    }

    // queue.on('error');
    queue.on('completed', (job, record, childProcessPID) => {
      console.log('COMPLETED: ', null, record.value.result, childProcessPID);
    });
    queue.on('drained', result => {
      const end = new Date();
      const testRunTime = end.getTime() - start.getTime();
      console.log(`DRAINED: Operation took ${testRunTime} msec`, result);
    });
  });
};

init();
