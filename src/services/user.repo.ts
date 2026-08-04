
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ScanCommand } from "@aws-sdk/client-dynamodb";

import { docClient } from "../db/client.ts";

import { type User, Tables } from "../models/types.ts";

async function listUsers() {
    const command = new ScanCommand(
        { TableName: Tables.users }
    );

    try { 
        const response = await docClient.send(command);
        console.log(response);
    } catch(error) { 
        console.error("Error fetching Users table", error);
    }
}

async function createUser(email: string, hashedPassword: string) { 
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
    }
}

async function getUserByEmail(email: string) {
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
        console.log('Fetched user by email', res.Item);
    } catch (error) {
        console.error(`Error fetching user by email: ${email}`, error);
    }
}