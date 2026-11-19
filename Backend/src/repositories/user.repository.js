/* 
Un repository es donde manejamos la comunicacion con nuestros datos (Generalmente la DB)
*/

import { pool } from "../config/mysql.config.js"
import UserDTO from "../dto/user.dto.js"
import User from "../models/user.model.js"

class UserRepository {

    async create(nombre, email, password) {
        await User.create({ nombre: nombre, email: email, password: password })
    }
    //MONGO DB
    async get() {
        const result = await User.find()
        return result
    }

    async getByCreationDate(min_date, max_date){
        const result = await User.find({
            fecha_creacion: {
                $gte: new Date(min_date), //Establece una fecha minima
                $lt: new Date(max_date) //Establece una fecha maxima
            }
        })
        return result
    }

    async getByName(name){
        const result = await User.find({
            nombre: name, 
            activo: true
        })

        return result
    }

    async getBySearchTerm(term){
        const result = await User.find({
            nombre: {
                $regex: term,
                $options: 'i' //Permite buscar de forma 'no case sensitive' (Sin diferenciar entre mayus y minus)
            }, 
            activo: true
        })
        .limit(5)

        return user
    }

    
    //MongoDB
   async getById (user_id){
        const result = await User.findById(user_id)
    
        return result
    }

    async softDeleteById(user_id){
        await User.findByIdAndUpdate(user_id, {activo: false})
    }

    async deleteById (user_id){
        await User.findByIdAndDelete(user_id)
    }
    
    async  getByEmail (email){
    
        //Te devuelve null (si no encuentra) o un objeto con el resultado
        const result = await User.findOne({email: email})
        return result
    } 

    async updateById (user_id, update_data) {
        return await User.findByIdAndUpdate(
            user_id,
            update_data
        )
    }
    
}

//El UserRepostory es un sigleton, solo tiene una instancia
const user_repository = new UserRepository()

export default user_repository