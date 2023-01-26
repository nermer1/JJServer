import env from 'dotenv';

env.config();

/* const ServerProperty = function() {
    let instance: ServerProperty;

    function init(): ServerProperty {
        return {
            getString: function(key) {
                let value = process.env[key];
                return (!value)? '' : value;
            },
            getServerPort: function() {
                return this.getString('PROD_PORT');
            },
            getDBHost: function() {
                return this.getString('PROD_DB_HOST');
            }
        }
    }

    return {
        getInstance: function() {
            if(!instance) instance = init();
            return instance;
        }
    }
}

export default ServerProperty().getInstance(); */

class ServerProperty implements IProperty {
    private static instance: ServerProperty;

    private constructor() {}

    public getString(key: string): string {
        let value = process.env[key];
        return (!value)? '' : value;
    }

    public getServerPort(): string {
        return this.getString('PROD_PORT');
    }

    public getDBHost(): string {
        return this.getString('PROD_DB_HOST');
    }

    public static getInstance() {
        if(!this.instance) {
            this.instance = new this();
        }

        return this.instance;
    }
}

export default ServerProperty.getInstance();