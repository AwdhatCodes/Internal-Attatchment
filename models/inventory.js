const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
   itemName: String,
   type: String,
   quantity: Number,
   description: String,
   userId: mongoose.Schema.Types.ObjectId, // Link to User
   timestamp: Date
});

module.exports = mongoose.model('Inventory', inventorySchema);
