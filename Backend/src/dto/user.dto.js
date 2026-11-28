
/*
Data transfer Object
Unificar a lo largo de nuestra aplicacion ciertos formatos de datos, ejemplo un usuario siempre debe ser:
{
    "_id": "6aabff9a190ff6061955c889",
    "nombre": "maria",
    "email": "maria@mail.com",
    "password": "pepe123",
    "foto_perfil": "data:image/png;base64,...",
    "descripcion": "Hola, soy maria",
    "activo": false,
    "fecha_creacion": "2026-09-17T14:56:26.249Z",
}
*/
class UserDTO {
    constructor (id, nombre, email, password, foto_perfil, descripcion, activo, fecha_creacion){
        this._id = id
        this.nombre = nombre
        this.email = email
        this.password = password
        this.foto_perfil = foto_perfil
        this.descripcion = descripcion
        this.activo = activo
        this.fecha_creacion = fecha_creacion
    }
}


export default UserDTO