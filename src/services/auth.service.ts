import bcrypt from 'bcrypt';
import { z } from 'zod';
import { createUser } from "./user.repo.ts";

export async function registerNewUser(email: string, password: string) {
    const registerSchema = z.object(
        {
            email: z.email(),
            password: z.string().min(8)
        }
    );
    const validated = registerSchema.safeParse({email, password});

    if (!validated.success) { 
        throw new Error(
            validated.error.issues
                .map( i => i.message)
                .join(", ")
        );
    }

    const { email: validEmail, password: validPassword } = validated.data;
    
    // hash password
    const hashedPassword = await bcrypt.hash(validPassword, 10);
    await createUser(validEmail, hashedPassword);
}