import { DynamoDBClient, type DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import dotenv from 'dotenv';
dotenv.config();
console.log('DEBUG', process.env.NODE_ENV, process.env.DYNAMODB_ENDPOINT);

let config: DynamoDBClientConfig = {};

if (process.env.NODE_ENV === 'local') {
    config = {
        'region': 'local',
        'endpoint': process.env.DYNAMODB_ENDPOINT,
        'credentials': {
            'accessKeyId': 'localaccesskeyid',
            'secretAccessKey': 'secretaccesskey'
        }
    };
}

export const dbClient = new DynamoDBClient(config);
export const docClient = DynamoDBDocumentClient.from(dbClient);