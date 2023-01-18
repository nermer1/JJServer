/* const express = require('express');
const res = require('express/lib/response');
const cors = require('cors');
const app = express(); */

import express from 'express';
import cors from 'cors';
import ServerProperty from './src/test.js';

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use('/', router);

router.get('/type/:id', (req, res) => {
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
});

const serverProperty = ServerProperty.getInstance();

console.log(serverProperty.getServerPort());

const port = ServerProperty.getInstance().getString('PROD_PORT') || 4000;
//app.listen(port, () => console.log(`Listening on port ${port}`));