import { ErrorCode } from "../models/types.ts";
import { registerNewUser, login } from "../services/auth.service.ts";
import { Router, type Request, type Response } from "express";

const authRouter: Router = Router();

authRouter.post(
    '/register', 
    async (req: Request, res: Response) => { 
        const { email, password } = req.body;
        try { 
            await registerNewUser(email, password);
            res
                .status(201)
                .json(
                    { 'userId': email }
                );
        } catch (error) { 
            if (error instanceof Error && error.name == ErrorCode.awsDBConditionalCheckFailedException) { 
                console.error(`409 => Register new user failed : User with ${email} already exists`);
                res
                    .status(409)
                    .json(
                        {'error': 'User already exists'}
                    );
            } else { 
                console.error('500 => Register new user failed :', error);
                res
                    .status(500)
                    .json(
                        {'error': 'Internal server error'}
                    );
            }
        }
    }
)

authRouter.post(
    '/login',
    async (req: Request, res: Response) => { 
        const { email, password } = req.body;
        try { 
            const jwt = await login(email, password);
            res.status(200).json(
                { 'token': jwt }
            );
        } catch (error) { 
            if (error instanceof Error && error.message === ErrorCode.loginInvalidCredentials) { 
                console.error(`401 => Invalid credentials for user: ${email}`);
                res.status(401).json({'error': 'Invalid credentials'});
            } else { 
                console.error('500 => Register new user failed :', error);
                res.status(500).json({'error': 'Internal server error'});
            }
        }
    }
);

export default authRouter;