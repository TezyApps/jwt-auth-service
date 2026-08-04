declare global { 
    namespace NodeJS { 
        interface ProcessEnv { 
            NODE_ENV: 'local' | 'development';
            DYNAMODB_ENDPOINT: string;
            PORT: string;
            JWT_SECRET: string;
        }
    }
}

export {};