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

// Global is used here to maintain a cached connection across hot reloads
// in serverless environments. This prevents connections from growing exponentially.
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!process.env.MONGODB_URI) {
        console.error("Missing MONGODB_URI in environment variables.");
        return;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI).then((mongoose) => {
            console.log("Connected to MongoDB successfully!");
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        console.error("MongoDB Connection Error:", error);
    }
    
    return cached.conn;
};

module.exports = { User, connectDB };
