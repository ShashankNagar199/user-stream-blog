const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 30 },
    videoUrl: { type: String, required: true },
    description: { type: String, maxlength: 500 },
    filename: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Video', videoSchema);