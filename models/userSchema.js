const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    bio: { type: String, maxlength: 500 },
    profilePicture: { type: String } 
});

module.exports = mongoose.model('User', userSchema);
