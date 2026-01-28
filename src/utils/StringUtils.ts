import Fuse, {IFuseOptions} from 'fuse.js';

export default class StringUtils {
    public static format(str: string, obj: ObjType): string {
        return str.replace(/(\${([a-zA-Z0-9]+)})/gi, (a, b, c) => obj[c]);
    }

    //
    public static fuzzySearch<T>(list: T[], pattern: string, customOptions: IFuseOptions<T> = {}): T[] {
        if (!pattern || pattern.trim() === '') {
            return [];
        }

        const defaultOptions: IFuseOptions<T> = {
            threshold: 0.3,
            ignoreLocation: true,
            minMatchCharLength: 2
        };

        const finalOptions = {...defaultOptions, ...customOptions};
        const fuse = new Fuse(list, finalOptions);
        const result = fuse.search(pattern);

        return result.map((res) => res.item);
    }
}
