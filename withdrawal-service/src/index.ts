import './userWorker'
import './merchantWorker'
import http from 'http'

http.createServer((_req, res) => res.end('ok')).listen(process.env.PORT || 3000)
