import mongoose from 'mongoose';
import moment from 'moment';

const ChatSchema = new mongoose.Schema({
    createdAt: {
        type: String,
        default: moment().format("DD-MM-YYYY"),
    },
    messages: [{
        type: mongoose.Schema.Types.Mixed
    }],
});

ChatSchema.pre('save', function (next) {
    if (!this.messages) {
        this.messages = [];
    }
    next();
});

export default mongoose.model('Chat', ChatSchema);