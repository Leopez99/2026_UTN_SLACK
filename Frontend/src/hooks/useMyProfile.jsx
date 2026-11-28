import { useEffect, useState } from 'react'
import { getMe } from '../services/userService'

/*
Trae el perfil completo del usuario de la sesion via GET /api/users/me al montar.

La foto de perfil y la descripcion NO viajan dentro del JWT (el payload queda
acotado a id, name y email), por lo que esta es la unica forma de tenerlas en
la UI. Al volver de /settings la screen vuelve a montarse y este hook refresca
los datos: la foto nueva aparece sin re-login.

Si la peticion falla la screen sigue usable con los datos del token.
*/

function useMyProfile() {

    const [profile, setProfile] = useState({ foto_perfil: null, descripcion: '' })
    const [loading, setLoading] = useState(true)

    useEffect(
        () => {
            let ignore = false

            async function loadProfile() {
                try {
                    const response = await getMe()
                    const user = response.data?.user

                    if (!ignore) {
                        setProfile({
                            foto_perfil: user?.foto_perfil ?? null,
                            descripcion: user?.descripcion ?? ''
                        })
                    }
                }
                catch {
                    /* Sin perfil cargado la UI muestra iniciales y sigue funcionando */
                }
                finally {
                    if (!ignore) {
                        setLoading(false)
                    }
                }
            }

            loadProfile()

            return () => {
                ignore = true
            }
        },
        []
    )

    return {
        profile: profile,
        loading: loading
    }
}

export default useMyProfile
