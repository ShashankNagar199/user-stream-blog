const express = require('express');
const bcrypt = require('bcryptjs');
const app=express();
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/userSchema');
const authMiddleware = require('../middleware/authMiddleware'); 
const { Mandrill } = require('mandrill-api/mandrill');
const router = express.Router();
const fs=require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const getGridFSBucket = require('../config/gridfsStorageForImage');

app.use(express.static('public'));

// Password generation algorithm
const generatePassword = (firstName, lastName, phone) => {
    return `${firstName.slice(0, 2)}${lastName.slice(-2)}${phone.slice(-4)}`;
};

const sendEmail = async (email, password) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS 
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Account Password',
        text: `Your password is ${password}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};
const storage = multer.memoryStorage();
const uploadProfilePicture = multer({ storage }).single('profilePicture');
const upload = multer({ storage });


router.post('/uploadProfilePicture', authMiddleware, (req, res) => {
    console.log('Request received');

    uploadProfilePicture(req, res, async (err) => {
        console.log('uploading');
        if (err) {
            console.error('File upload error:', err);
            return res.status(400).json({ message: err });
        }

        const bucket = getGridFSBucket();
        console.log(bucket);
        if (!bucket) {
            console.error('GridFS bucket not initialized');
            return res.status(500).json({ error: 'Internal server error' });
        }

        const filename = `${crypto.randomBytes(16).toString('hex')}${path.extname(req.file.originalname)}`;
        const uploadStream = bucket.openUploadStream(filename);
        console.log('Buffer:', req.file.buffer);
        console.log('Generated filename:', filename);


        // Handle stream events
        uploadStream.on('error', (error) => {
            console.error('Stream error:', error);
            res.status(500).json({ error: 'Error during file upload' });
        });
        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', async () => {
            console.log('Upload stream finished');
            try {
                const user = await User.findById(req.user.id);
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                user.profilePicture = filename;
                await user.save();
                res.json({ message: 'Profile picture uploaded successfully', profilePictureUrl: `/api/users/profilePicture/${filename}` });
                console.log(user);
            } catch (err) {
                console.error('Error saving user profile picture:', err);
                res.status(500).json({ error: 'Error saving user profile picture' });
            }
        });
    });
});

router.get('/profilePicture/:filename', async (req, res) => {
    const { filename } = req.params;
    const bucket = getGridFSBucket();

    if (!bucket) {
        return res.status(500).json({ error: 'GridFS bucket not initialized' });
    }

    try {
        const downloadStream = bucket.openDownloadStreamByName(filename);

        if (!downloadStream) {
            return res.status(404).json({ message: 'Profile picture not found' });
        }

        // Determine the file extension from the filename
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream'; // Default content type

        // Set the appropriate content type based on the file extension
        if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        } else if (ext === '.png') {
            contentType = 'image/png';
        }

        res.setHeader('Content-Type', contentType);

        downloadStream.on('data', (chunk) => {
            res.write(chunk);
        });

        downloadStream.on('end', () => {
            res.end();
        });

        downloadStream.on('error', (err) => {
            res.status(404).json({ message: 'Profile picture not found' });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/register', async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;
     const password = generatePassword(firstName, lastName, phone);
    //const password="shashi12345"
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = new User({ firstName, lastName, email, phone, password: hashedPassword });
        await user.save();
        await sendEmail(email, password);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/user', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/user/bio', authMiddleware, async (req, res) => {
    const { bio } = req.body;

    if (bio.length > 500) {
        return res.status(400).json({ message: 'Bio must be 500 words max' });
    }

    try {
        const user = await User.findById(req.user.id);
        user.bio = bio;
        await user.save();
        res.json({ message: 'Bio updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { firstName, password } = req.body;

    try {
        const user = await User.findOne({ firstName });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '2d' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
