const mongoose = require('mongoose');


mongoose
    .connect(
        'mongodb+srv://ksumanthyadav120:Sumanth-db@suman.1lwpnwk.mongodb.net/mec?retryWrites=true&w=majority',
        { useNewUrlParser: true, useUnifiedTopology: true }
    )
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.error('Connection error:', err));
