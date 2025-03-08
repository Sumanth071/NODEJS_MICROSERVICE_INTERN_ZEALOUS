const mongoose = require('mongoose');

// Define schema
const transactionSchema = new mongoose.Schema({
  username: { type: String },
  transactionId: { type: String, required: true, unique: true },
  transactionDate: { type: Date, required: true },
  transactionFrom: { type: String, required: true },
  transactionTo: { type: String, required: true },
});

// Export model
module.exports = mongoose.model('Transaction', transactionSchema);
