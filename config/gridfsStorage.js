const mongoose = require('mongoose');
const { MongoClient, GridFSBucket } = require('mongodb');

// Connect to MongoDB and set up GridFS bucket
const conn = mongoose.createConnection(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let gridFSBucket;
conn.once('open', () => {
    const db = conn.db;
    gridFSBucket = new GridFSBucket(db, { bucketName: 'videos' });
});

const getGridFSBucket = () => gridFSBucket;

module.exports = getGridFSBucket;
