const mongoose = require('mongoose');

// Define User Schema for our bot tracking
const userSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    firstName: String,
    username: String,
    status: { type: String, default: 'pending' }, // 'pending' or 'joined'
    startedAt: { type: Date, default: Date.now },
    followUpStep: { type: Number, default: 0 } // Tracks which message to send next
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const connectDB = async () => {
    // Return if already connected (useful for serverless environments like Vercel)
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    
    if (!process.env.MONGODB_URI) {
        console.error("Missing MONGODB_URI in environment variables.");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB successfully!");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

module.exports = { User, connectDB };
