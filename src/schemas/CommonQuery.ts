import mongoose, {Schema} from 'mongoose';
import ApiReturn from '../structure/ApiReturn';

export default class CommonQuery {
    private schema: Schema;
    model;

    constructor(schemaName: string, options = {}) {
        this.schema = new Schema(options);
        this.model = mongoose.model(schemaName, this.schema, schemaName);
    }

    async insert(data: any) {
        return await this.model.create(data);
    }

    delete(id: string) {
        return this.model.findByIdAndDelete(id);
    }

    async update(data: any) {
        return await this.model.findOneAndUpdate({_id: data.id}, data, {new: true});
    }

    async findAll() {
        return await this.model.find({});
    }

    async getApiReturn(params: DBParamsType): Promise<ApiReturn> {
        throw new Error('Abstract method must be implemented');
    }
}
