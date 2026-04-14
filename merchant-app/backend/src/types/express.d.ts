export {}

declare module 'express-serve-static-core' {
    interface Request {
        userId?: string
        time?: number
        exp?: number
        url?:string
        merchantId?:any
    }
}
