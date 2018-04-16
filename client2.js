// eslint-disable-next-line no-console

const EventEmitter = require('events');
const assert = require('assert');

/* 
Find how efficiently manage Mongo connections.
Node thread pool is 4 threads.Whats Mongo default connection pool size is 5.
To change node process thread pool size: 
process.env.UV_THREADPOOL_SIZE = 10;
*/
class Client extends EventEmitter {
  constructor(name, db) {
    super();
    this.collectionName = name;
    this.db = db;
    this.createdIndexes(this.db).then(() => {
      console.log('Created indexes');
    });
  }
  createdIndexes() {
    return this.db
      .collection('wait')
      .createIndex({
        createdOn: 1
      })
      .then(
        this.db.collection('active').createIndex({
          startTime: 1
        })
      )
      .then(
        this.db.collection('completed').createIndex({
          completeTime: 1
        })
      )
      .catch(err => {
        console.log(err);
      });
  }

  add(job) {
    const collection = this.db.collection('wait');
    return collection.insertOne({
      name: job.name,
      startTime: null,
      completeTime: null,
      failTime: null,
      createdOn: new Date(),
      result: null,
      status: {
        wait: true,
        active: null,
        completed: null,
        failed: null
      },
      data: {
        size: job.data.dataSize
      }
    });
  }

  moveToActive() {
    const collection = this.db.collection('wait');
    return collection
      .findOneAndDelete(
        {
          startTime: null
        },
        { createdOn: 1 }
      )
      .then(doc => {
        // console.log('moveToActive', doc);
        if (doc.value == null) return doc;
        return this.db.collection('active').insertOne({
          name: doc.value.name,
          startTime: new Date(),
          completeTime: null,
          failedlTime: null,
          createdOn: doc.value.createdOn,
          result: null,
          status: {
            wait: null,
            active: true,
            completed: null,
            failed: null
          },
          data: {
            size: doc.value.data.size
          }
        });
      });
  }

  moveToCompleted(job) {
    // console.log('moveToCompleted', job._id);
    const collection = this.db.collection('active');
    return collection.findOneAndDelete({ _id: job._id }).then(doc =>
      this.db.collection('completed').insertOne({
        name: doc.value.name,
        startTime: doc.value.startTime,
        completeTime: new Date(),
        failedlTime: null,
        createdOn: doc.value.createdOn,
        result: null,
        status: {
          wait: null,
          active: null,
          completed: true,
          failed: null
        },
        data: {
          size: doc.value.data.size
        }
      })
    );
  }
}

module.exports = Client;
