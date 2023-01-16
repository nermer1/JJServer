const express = require('express');
const res = require('express/lib/response');
const cors = require('cors');
const app = express();
const rootRouter = express.Router();
const testRouter = express.Router();

app.use(cors());
app.use(express.json());
/* app.use('/', rootRouter);
app.use('/type', testRouter); */
app.use('/', testRouter);

/* rootRouter.get('/a', (req, res) => {
    console.log("params: ", req.params);
    console.log("query: ", req.query);
    console.log("body: ", req.body);
    res.send(req.query);
});

rootRouter.get('/b', (req, res) => {
    console.log("params: ", req.params);
    console.log("query: ", req.query);
    console.log("body: ", req.body);
    res.send(req.query);
}); */

testRouter.post('/type/:id', (req, res) => {
    console.log("params2: ", req.params);
    console.log("query2: ", req.query);
    console.log("body2: ", req.body);
    res.send(req.query);
});


/* router.post('test/:id', (req, res) => {
    console.log("params: ", req.params);
    console.log("query: ", req.query);
    console.log("body: ", req.body);
    res.send(req.query);
}); */

/* app.get('/test', (req, res) => {
    console.log("params: ", req.params);
    console.log("query: ", req.query);
    console.log("body: ", req.body);
    res.send(req.query);
});

app.post('/test', (req, res) => {
    console.log("params: ", req.params);
    console.log("query: ", req.query);
    console.log("body: ", req.body);
    res.send(req.query);
}); */
app.listen(4000, () => console.log('Listening on port 4000'));