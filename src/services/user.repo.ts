
import { ScanCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db/client.ts";
import { type User, Tables } from "../models/types.ts";

export async function listUsers(): Promise<User[]> {
    const command = new ScanCommand(
        { TableName: Tables.users }
    );

    try { 
        const response = await docClient.send(command);
        console.log(response);
        return (response.Items as User[]) || [];
    } catch(error) { 
        console.error("Error fetching Users table", error);
        throw error;
    }
}

export async function createUser(email: string, hashedPassword: string) { 
    const user: User = { 
        email: email,
        hashedPassword: hashedPassword
    };
    const command = new PutCommand(
        {
            TableName: Tables.users,
            Item: user,
            ConditionExpression: "attribute_not_exists(email)"
        }
    );

    try { 
        const response = await docClient.send(command);
        console.log('User added sucessfully', email, response);
    } catch(error) { 
        console.error('Error inserting record', email);
        throw error;
    }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
    const command = new GetCommand(
        {
            TableName: Tables.users,
            Key: {
                email: email
            }
        }
    );

    try { 
        const res = await docClient.send(command);
        console.log('Fetched user by email :', email);
        return res.Item as User;
    } catch (error) {
        console.error(`Error fetching user by email: ${email}`, error);
        throw error
    }
}