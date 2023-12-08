//import {Request, Response, NextFunction} from 'express';
import {schemas} from '../schemas/schemaMap.js';

/* params: {
'dbName': 'holi',
    type: 'CRUD',
    data : {
    tableData: [],
    stringData: {}
    },
} */

/* returnType: "S"
errorMessage: ""

message: ""
tableData
stringData */

interface Test {
    returnType: string;
    message: string;
    tableData: any[];
    stringData: any;
}

const service = {
    call: async (params: DBParamsType) => {
        let data: Test = {
            returnType: '',
            message: '',
            tableData: [],
            stringData: {}
        };
        try {
            checkData(params);
            const schema = schemas[params.name];

            switch (params.type) {
                case 'C':
                    schema.insert(params.data.stringData);
                    break;
                case 'R':
                    data.tableData = await schema.findAll();
                    break;
                case 'U':
                    data.stringData = await schema.update(params.data.stringData);
                    break;
                case 'D':
                    await schema.delete(params.data.stringData.id);
                    break;
                default:
                    break;
            }

            data.returnType = 'S';
            data.message = '성공';
        } catch (err: any) {
            data.returnType = 'E';
            data.message = err;
        }
        return data;
    }
};

function checkData(params: DBParamsType) {
    if (!params) throw '';
}

/* function aaaa(name: string) {
    const schema = schemas[name];
} */

/* router.get('/holiday', async (req, res) => {
    const data = await holiday.find({});
    res.json(data);
});

router.post('/holiday', (req, res) => {
    // create
    // req.body.title
    // req.body.start
    // req.body.end
    // type
    console.log(req.body);
    holiday.create(req.body);
    res.json({});
});
router.put('/holiday/:id', (req, res) => {
    //holiday.findById('');
    // update
});
router.delete('/holiday/:id', async (req, res) => {
    console.log(req.params);
    console.log(req.body);
    console.log(await holiday.findById(req.params.id));

    holiday
        .findByIdAndDelete(req.params.id)
        .then(() => {
            console.log('성공');
        })
        .catch((err: Error) => {
            console.log('실패', err);
        });
    res.json({});
}); */

export default service;
