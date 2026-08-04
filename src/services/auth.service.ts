import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { createUser, getUserByEmail } from "./user.repo.ts";
import { ErrorCode } from "../models/types.js";

export async function registerNewUser(email: string, password: string) {
    const { email: validEmail, password: validPassword } = validateSchema(email, password);
    
    // hash password
    const hashedPassword = await bcrypt.hash(validPassword, 10);
    await createUser(validEmail, hashedPassword);
}

export async function login(email: string, password: string): Promise<string> { 
    
    const { email: validEmail, password: validPassword } = validateSchema(email, password);
    const user = await getUserByEmail(validEmail);
    if (!user) { 
        throw new Error(ErrorCode.loginInvalidCredentials);
    }
    const canLogin = await bcrypt.compare(validPassword, user.hashedPassword);
    if (!canLogin) { 
        throw new Error(ErrorCode.loginInvalidCredentials);
    }

    const token = jwt.sign(
        { validEmail },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    )

    return token;
}

function validateSchema(email: string, password: string): {email: string, password: string} { 
    const schema = z.object(
        {
            email: z.email(),
            password: z.string().min(8)
        }
    );
    const validated = schema.safeParse({email, password});

    if (!validated.success) { 
        throw new Error(
            validated.error.issues
                .map( i => i.message)
                .join(", ")
        );
    }
    return {
        email: validated.data.email, 
        password: validated.data.password
    };
}