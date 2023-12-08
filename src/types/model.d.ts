import mongoose, {Model, Document} from 'mongoose';

interface IDocument extends Document {}

interface IModel extends Model<T> {
    createTest(data: any);
    deleteTest(data: any);
    updateTest(data: any);
    findAll(): Promise<Model<T>[]>;
}
