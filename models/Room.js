const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: String,
    temperature: String,
    humidity: String,
    lightIntensity: String
});

module.exports = mongoose.model('Room', roomSchema);