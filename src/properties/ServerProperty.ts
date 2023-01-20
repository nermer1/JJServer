import env from 'dotenv';

env.config();

const ServerProperty = function() {
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

export default ServerProperty().getInstance();