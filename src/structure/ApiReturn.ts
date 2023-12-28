export default class ApiReturn {
    //
    private returnMessage: string = '';
    private returnErrorMessage: string = '';
    private returnErrorCode: string = '';
    private tableData: ObjArr = {};

    put(key: string, value: Array<ObjAny>) {
        this.tableData[key] = value;
    }

    getTableData() {
        return this.tableData;
    }

    getReturnMessage() {
        return this.returnMessage;
    }

    setReturnMessage(returnMessage: string) {
        this.returnMessage = returnMessage;
    }
}
