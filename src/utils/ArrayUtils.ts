export default class ArrayUtils {
    public static chunkArray<T>(array: T[], size: number): T[][] {
        const chunked: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunked.push(array.slice(i, i + size));
        }
        return chunked;
    }

    public static async processInChunks<T, R>(items: T[], chunkSize: number, iterator: (item: T) => Promise<R>, delayMs: number = 0): Promise<R[]> {
        const results: R[] = [];

        const chunks = this.chunkArray(items, chunkSize);

        for (const [index, chunk] of chunks.entries()) {
            const chunkPromises = chunk.map(async (item) => await iterator(item));
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);

            if (index < chunks.length - 1 && delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        return results;
    }
}
