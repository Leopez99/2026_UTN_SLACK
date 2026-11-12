/*
Los controllers son la capa HTTP de la API:
- Reciben la request, delegan la logica de negocio en la capa de repositorios (repositories/)
- Y arman la response con el formato que devuelve la API
*/

export async function getChannels(request, response) {

    return response.status(200).send({
        ok: true,
        status: 200,
        message: 'Channel'
    })
}
