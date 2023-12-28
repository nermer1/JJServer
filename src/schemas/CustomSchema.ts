import mongoose, {Schema} from 'mongoose';
import ApiReturn from '../structure/ApiReturn';

export class CustomSchema {
    private schema: Schema;
    model;

    constructor(schemaName: string, options: {}) {
        this.schema = new Schema(options);
        this.model = mongoose.model(schemaName, this.schema, schemaName);
    }

    insert(data: any): any {
        return this.model.create(data);
    }

    delete(id: string) {
        return this.model.findByIdAndDelete(id);
    }

    update(data: any) {
        return this.model.findOneAndUpdate({_id: data.id}, data, {new: true});
    }

    async findAll() {
        return await this.model.find({});
    }

    async getApiReturn(params: DBParamsType): Promise<ApiReturn> {
        throw new Error('Abstract method must be implemented');
    }
}
