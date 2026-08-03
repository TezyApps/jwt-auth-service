import { DynamoDBClient, type DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import dotenv from 'dotenv';
dotenv.config();

let config: DynamoDBClientConfig = {};

if (process.env.NODE_ENV === 'local') {
    config = {
        'region': 'local',
        'endpoint': process.env.DYNAMODB_ENDPOINT,
        'credentials': {
            'accessKeyId': 'local-access',
            'secretAccessKey': 'local-secret-access'
        }
    };
}

export const client = new DynamoDBClient(config);
export const docClient = DynamoDBDocumentClient.from(client);