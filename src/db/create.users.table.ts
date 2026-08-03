import { CreateTableCommand, type CreateTableCommandInput } from '@aws-sdk/client-dynamodb'
import { dbClient } from './client.ts';

// Users table
const input: CreateTableCommandInput = { 
    AttributeDefinitions: [
        {
            AttributeName: "email",
            AttributeType: "S"
        },
    ],
    TableName: "Users",
    KeySchema: [
        {
            AttributeName: "email",
            KeyType: "HASH"
        }
    ],
    BillingMode: "PAY_PER_REQUEST"
};
const command = new CreateTableCommand(input);
const response = await dbClient.send(command);
console.log('Creating Users table…', response);