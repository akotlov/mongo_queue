// eslint-disable-next-line no-console

const EventEmitter = require('events');
const assert = require('assert');

/*
should I create one connection to DB per one queue or all queues should 
share one connection? 
*/
class Client extends EventEmitter {
  constructor(name, db) {
    super();
    this.collectionName = name;
    this.db = db;
    this.indexCollection(this.db, (err, results) => {
      if (!err) console.log(results);
    });
  }
  indexCollection(db, callback) {
    this.db
      .collection(this.collectionName)
      .createIndex(
        { createdOn: 1, startTime: 1, completeTime: 1, failTime: 1 },
        null,
        (err, results) => {
          if (err) return callback(err);
          return callback(null, results);
        }
      );
  }

  add(job) {
    const collection = this.db.collection(this.collectionName);
    return collection.insertOne({
      name: job.name,
      startedTime: null,
      completedTime: null,
      failedlTime: null,
      createdOn: new Date(),
      result: null,
      status: {
        wait: true,
        active: null,
        completed: null,
        failed: null
      },
      data: {
        size: job.data.dataSize,
        source: '/images/image.png',
        output: '/images/image.jpg'
      }
    });
  }

  moveToActive() {
    const collection = this.db.collection(this.collectionName);
    return collection.findAndModify(
      { startedTime: null },
      [['createdOn', 'asc']],
      { $set: { startedTime: new Date(), 'status.wait': false, 'status.active': true } },
      { new: true }
    );
  }

  moveToCompleted(job) {
    const collection = this.db.collection(this.collectionName);
    const query = {
      _id: job._id
    };
    const update = {
      $set: {
        completedTime: new Date(),
        'status.active': false,
        'status.completed': true,
        result: job.result
      }
    };
    return collection.findOneAndUpdate(query, update, { returnOriginal: false });
  }

  remove(id) {
    this.emit('job-removed', id);
  }
}

module.exports = Client;
