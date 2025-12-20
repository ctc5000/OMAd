// auth.middleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

const verifyJWT = (req, res, next) => {
    // More robust token extraction
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : null;

    if (!token) {
        console.error('❌ Token Validation Failed', {
            message: 'No token provided',
            path: req.path,
            method: req.method,
            headers: Object.keys(req.headers),
            authHeader: authHeader
        });

        return res.status(401).json({ 
            error: 'No token provided',
            details: {
                message: 'Authorization header is missing or invalid',
                path: req.path
            }
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Additional token validation
        if (!decoded.user_id || !decoded.role) {
            console.error('❌ Invalid Token Payload', {
                message: 'Token missing required fields',
                decoded: Object.keys(decoded)
            });
            
            return res.status(401).json({ 
                error: 'Invalid token payload',
                details: 'Token is malformed or missing key information'
            });
        }

        req.user = {
            id: decoded.user_id,
            role: decoded.role,
            advertiserId: decoded.advertiser_id
        };

        console.log('✅ Token Validated Successfully', {
            userId: req.user.id,
            role: req.user.role,
            path: req.path
        });

        next();
    } catch (error) {
        console.error('❌ Token Verification Failed', {
            message: error.message,
            name: error.name,
            path: req.path,
            method: req.method
        });

        let errorMessage = 'Invalid token';
        switch (error.name) {
            case 'TokenExpiredError':
                errorMessage = 'Token has expired';
                break;
            case 'JsonWebTokenError':
                errorMessage = 'Invalid token signature';
                break;
            default:
                errorMessage = 'Authentication failed';
        }

        return res.status(401).json({ 
            error: errorMessage,
            details: {
                message: error.message,
                type: error.name,
                path: req.path
            }
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