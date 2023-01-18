import env from 'dotenv';

env.config();

const ServerProperty = function() {
    let instance;

    function init() {
        return {
            getString: function(key) {
                return process.env[key];
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

export default ServerProperty();