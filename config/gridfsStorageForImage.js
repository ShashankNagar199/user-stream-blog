const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const conn = mongoose.createConnection(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let gridFSBucket;
conn.once('open', () => {
    const db = conn.db;
    gridFSBucket = new GridFSBucket(db, { bucketName: 'uploads' });
});

const getGridFSBucketForImage = () => gridFSBucket;

module.exports = getGridFSBucketForImage;
