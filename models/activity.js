const mongoose = require('mongoose');

// Define the schema for the Activity model
const activitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    }
    // Add other fields as necessary
});

// Create the Activity model from the schema
const Activity = mongoose.model('Activity', activitySchema);

// Export the Activity model
module.exports = Activity;