const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: String,
    password: String
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;