import run1 from '../selenium/sel_test1.js';
import run2 from '../selenium/sel_test2.js';
import run3 from '../selenium/sel_test3.js';

const service = {
    run1: () => {
        run1();
    },
    run2: () => {
        run2();
    },
    run3: () => {
        run3();
    }
};

export default service;
