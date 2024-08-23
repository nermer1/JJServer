export default class ApiReturn {
    //
    private returnMessage: string = '';
    private returnErrorMessage: string = '';
    private returnErrorCode: string = '';
    private data: ObjArr = {};

    put(key: string, value: any) {
        this.data[key] = value;
    }

    getTableData() {
        return this.data['tableData'];
    }

    setTableData(value: any) {
        this.data['tableData'] = value;
    }

    getReturnData() {
        return this.data;
    }

    getReturnMessage() {
        return this.returnMessage;
    }

    setReturnMessage(returnMessage: string) {
        this.returnMessage = returnMessage;
    }

    getReturnErrorMessage() {
        return this.returnErrorMessage;
    }

    setReturnErrorMessage(returnErrorMessage: string) {
        this.returnErrorMessage = returnErrorMessage;
    }
}
