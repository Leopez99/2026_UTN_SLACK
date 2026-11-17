import RequestLog from '../models/request-log.model.js'

class RequestLogRepository {

    async create(log_data) {
        return await RequestLog.create(log_data)
    }
}

//Singleton: solo existe una instancia del repositorio
const request_log_repository = new RequestLogRepository()

export default request_log_repository
