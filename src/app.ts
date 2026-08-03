import express from 'express';
import { type Express, type Request, type Response } from 'express';

import dotenv from 'dotenv';
dotenv.config();

const app: Express = express();

app.get(
    '/health', 
    (req: Request, res: Response) => { 
        res.send(
            { 'status': 'ok' }
        );
    }
);

app.listen(
    process.env.PORT,
    () => { 
        console.log('Server listening on PORT ' + process.env.PORT);
    }
);