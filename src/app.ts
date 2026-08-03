import express from 'express';
import { type Express, type Request, type Response } from 'express';

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
    3000,
    () => { 
        console.log('Server listening on PORT 3000');
    }
);