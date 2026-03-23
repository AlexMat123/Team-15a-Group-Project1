const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const User = require('../models/User');

const generateTemporaryPassword = () => {
    return crypto.randomBytes(6).toString('base64').slice(0, 10) + '!';
};

const createPasswordResetRequest = async (req, res) => {
    try{
        const existingRequest = await PasswordResetRequest.findOne({
            user:req.user._id,
            status: 'pending',
        });

        if (existingRequest) {
            return res.status(400).json({
                message: 'You already have a pending password reset request'
            });
        }

        const request = await PasswordResetRequest.create({
            user: req.user._id,
            status: 'pending',
        });

        res.status(201).json({
            message: 'Password reset request successfully',
            request,
        });
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
};

const getPasswordResetRequests = async (req, res) => {
    try {
        const query = {};

        if (req.query.status) {
            query.status = req.query.status;
        }

        const requests = await PasswordResetRequest.find(query)
            .populate('user','name email role status')
            .populate('resolvedBy', 'name email')
            .sort({ requestedAt: -1});

        res.json(requests);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

const completePasswordResetRequest = async (req, res) => {
    try {
        const request = await PasswordResetRequest.findById(req.params.id).populate('user');
        
        if (!request) {
            return res.status(404).json({ message: 'Password reset not found'});
        }

        if(request.status !== 'pending') {
            return res.status(400).json({message: 'This request has already been handled'});
        }

        const user = await User.findById(request.user._id);

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        const tempPassword = generateTemporaryPassword();
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(tempPassword, salt);
        user.mustChangePassword = true;
        await user.save();

        const loginUrl = `${process.env.FRONTEND_URL}/login`;
        let emailSent = true;

        try {
            await sendPasswordResetEmail({
                to: user.email,
                tempPassword,
                loginUrl,
                adminEmail: req.user.email,
            });
        } catch (emailError) {
            emailSent = false;
            console.error('Failed to send password reset email:', emailError.message);
        }

        request.status = 'completed';
        request.resolvedAt = new Date();
        request.resolvedBy = req.user._id;
        await request.save();

        res.json({ 
            message: emailSent
                ? 'Password reset completed and reset email sent'
                : 'Password reset completed but reset email could not be sent',
            request,
            emailSent,
        });
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

const rejectPasswordResetRequest = async (req, res) => {
    try{
        const request = await PasswordResetRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Password reset request not found'})
        }

        if(request.status !== 'pending') {
            return res.status(400).json({message: 'This request has already been handled'});
        }

        request.status = 'rejected';
        request.resolvedAt = new Date();
        request.resolvedBy = req.user._id;
        request.notes = req.body.notes || '';
        await request.save();

        res.json({
            message: 'Password reset request rejected',
            request,
        });
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

module.exports = {
    createPasswordResetRequest,
    getPasswordResetRequests,
    completePasswordResetRequest,
    rejectPasswordResetRequest,
};
