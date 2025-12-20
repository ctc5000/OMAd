// auth.middleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

const verifyJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: 'No token provided' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.user_id,
            role: decoded.role,
            advertiserId: decoded.advertiser_id
        };
        next();
    } catch (error) {
        return res.status(401).json({ 
            error: 'Invalid or expired token' 
        });
    }
};

const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required' 
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions' 
            });
        }

        next();
    };
};

const requireAdvertiserAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required' 
        });
    }

    // ADMIN видит все
    if (req.user.role === 'ADMIN') {
        return next();
    }

    // ADVERTISER имеет доступ только к своим данным
    if (req.user.role === 'ADVERTISER') {
        if (!req.user.advertiserId) {
            return res.status(403).json({ 
                error: 'Advertiser account not properly configured' 
            });
        }
        return next();
    }

    return res.status(403).json({ 
        error: 'Insufficient permissions' 
    });
};

module.exports = {
    verifyJWT,
    requireRole,
    requireAdvertiserAccess
};