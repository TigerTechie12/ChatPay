export declare function rateLimit(key: string, limit: number, windowinSec: number): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
} | {
    allowed: boolean;
    remaining: number;
    retryAfter?: never;
}>;
//# sourceMappingURL=rateLimit.d.ts.map