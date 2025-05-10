import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';

const adminAuth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return next(new AppError('No authentication token found', 401));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // No need to check if decoded exists as verify will throw an error if token is invalid
        
        // Add user data to request
        req.user = decoded;
        req.token = token;
        
        next();
    } catch (error) {
        return next(new AppError('Authentication failed: ' + error.message, 401));
    }
};

export default adminAuth;
