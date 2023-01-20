import express from 'express';
import cors from 'cors';
import ServerProperty from './src/properties/ServerProperty.js';
import db from './src/db.js';

const app = express();
const router = express.Router();

db.connect();

app.use(cors());
app.use(express.json());
app.use('/', router);

/* router.get('/type/:id', (req, res) => {
    console.log("params2: ", req.params);
    console.log("query2: ", req.query);
    console.log("body2: ", req.body);
    res.send(req.query);
});

router.post('/type/:id', (req, res) => {
    console.log("params2: ", req.params);
    console.log("query2: ", req.query);
    console.log("body2: ", req.body);
    res.send(req.query);
}); */

const port = ServerProperty.getServerPort();
app.listen(port, () => console.log(`Listening on port ${port}`));
