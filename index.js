const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors'); 
require('dotenv').config();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/users', require('./router/userAuth')); 
app.use('/api/videos', require('./router/videoUploadAndRetrieval'));

mongoose.connect(process.env.MONGO_URI, 
{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected');
    app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch(err => console.log(err));
