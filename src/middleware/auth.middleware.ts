import { type Request, type Response, type NextFunction } from "express";
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) { 
    const bearerToken = req.headers.authorization;
    
    const missingBearerToken = (!bearerToken || !bearerToken.startsWith('Bearer '));
    if (missingBearerToken) {
        console.error('Token Expired');
        res.status(401).json({'message': 'Missing Bearer token'});
        return;
    };
    
    const token = bearerToken?.split(' ')[1];
    if (!token) { 
        console.error('Token Expired');
        res.status(401).json({'message': 'Invalid token!'});
        return;
    }
    try { 
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { email: string };
        req.user = decoded.email;
        next();
    } catch (error) { 
        if (error instanceof jwt.TokenExpiredError) { 
            console.error('Token Expired');
            res.status(401).json({'message': 'Token expired!'});
            return;
        } else if (error instanceof jwt.JsonWebTokenError) { 
            console.error('JWT error');
            res.status(401).json({'message': 'Invalid token'});
            return;
        } else { 
            console.error('Unauthorized: ', error);
            res.status(500).json({'message': 'Internal server error'});
            return;
        }
    }
}