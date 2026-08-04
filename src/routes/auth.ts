import { registerNewUser } from "../services/auth.service.ts";
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
            if (error instanceof Error && error.name == "ConditionalCheckFailedException") { 
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

export default authRouter;