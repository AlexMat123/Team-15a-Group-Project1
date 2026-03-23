const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: 'true',
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'rejected'],
            default: 'pending',
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema)