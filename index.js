const { MongoClient } = require('mongodb');
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
    queue.process(1, './branch-prediction');

    const jobData = {
      dataSize: 1000
    };

    for (let i = 0; i < 10; i++) {
      queue.add(jobData.dataSize + i);
      // queue2.add(jobData);
    }

    // /queue2.process(1, './branch-prediction');

    // queue.on('error');
    queue.on('completed', (job, record) => {
      console.log('COMPLETED: ', null, record.value.result);
    });
  });
};

init();
