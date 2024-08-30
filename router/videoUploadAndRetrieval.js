const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Video = require('../models/videoSchema');
const authMiddleware = require('../middleware/authMiddleware'); 
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const User = require('../models/userSchema');
const getGridFSBucket = require('../config/gridfsStorage'); 

// Set up GridFS storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', authMiddleware, upload.single('video'), async (req, res) => {
    const { title, description } = req.body;
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    if (title.length > 30) {
        return res.status(400).json({ message: 'Title must be 30 characters max' });
    }
    if (description && description.length > 500) {
        return res.status(400).json({ message: 'Description must be 500 characters max' });
    }

    const bucket = getGridFSBucket();
    const filename = `${crypto.randomBytes(16).toString('hex')}${path.extname(req.file.originalname)}`;

    const uploadStream = bucket.openUploadStream(filename);
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async () => {
        const videoUrl = `/videos/${filename}`;
        const video = new Video({
            userId: req.user.id,
            title,
            videoUrl,
            description,
            filename
        });

        try {
            await video.save();
            res.json({ message: 'Video uploaded successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    uploadStream.on('error', (err) => {
        res.status(500).json({ error: err.message });
    });
});

// In your video routes file
router.get('/video/:filename', authMiddleware, async (req, res) => {
    const { filename } = req.params;
    const bucket = getGridFSBucket();

    try {
        const downloadStream = bucket.openDownloadStreamByName(filename);

        downloadStream.on('data', (chunk) => {
            res.write(chunk);
        });

        downloadStream.on('end', () => {
            res.end();
        });

        downloadStream.on('error', (err) => {
            res.status(404).json({ message: 'Video not found' });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get('/videos', authMiddleware, async (req, res) => {
    try {
        const videos = await Video.find({ userId: req.user.id });
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/videos-by-users', authMiddleware, async (req, res) => {
    try {
        // Aggregation pipeline to group videos by users
        const usersWithVideos = await User.aggregate([
            {
                $lookup: {
                    from: 'videos',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'videos'
                }
            },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    profilePicture: 1,
                    videos: 1
                }
            },
            {
                $sort: { "firstName": 1 }
            }
        ]);

        res.json(usersWithVideos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/user/:userId/videos', authMiddleware, async (req, res) => {
    const { userId } = req.params;

    try {
        const videos = await Video.find({ userId: userId });
        if (!videos.length) {
            return res.status(404).json({ message: 'No videos found for this user' });
        }

        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;