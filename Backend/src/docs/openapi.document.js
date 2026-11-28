import ENVIRONMENT from '../config/environment.config.js'

/*
Documento OpenAPI 3.0.3 que describe la API de 2026_UTN_SLACK.

La idea de este archivo es tener en un solo lugar:
- Que recibe cada endpoint (params, query, body y headers).
- Todas las respuestas posibles de cada endpoint, con sus codigos HTTP,
  mensajes y ejemplos, incluyendo los errores genericos (500 y 503).

Se sirve como JSON en GET /api-docs.json y se consume desde Swagger UI en /api-docs.
*/

const SERVER_URL = ENVIRONMENT.URL_BACKEND || `http://localhost:${ENVIRONMENT.PORT || 8080}`

/* ------------------------------------------------------------------ */
/* Helpers para no repetir la estructura de las respuestas             */
/* ------------------------------------------------------------------ */

const json_content = (schema, extra = {}) => ({
    'application/json': {
        schema,
        ...extra
    }
})

const error_examples = (entries) => Object.fromEntries(
    entries.map(([key, status, message]) => [
        key,
        {
            summary: `${status} · ${message}`,
            value: {
                ok: false,
                status,
                message
            }
        }
    ])
)

const error_response = (description, entries = []) => ({
    description,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            ...(entries.length > 0 ? { examples: error_examples(entries) } : {})
        }
    }
})

const success_response = (description, schema, example) => ({
    description,
    content: json_content(
        schema,
        example ? { example } : {}
    )
})

/* Errores comunes de los endpoints protegidos con authMiddleware */
const AUTH_ERRORS = {
    400: error_response(
        'El header `Authorization` no fue enviado o no tiene el formato `Bearer <token>`.',
        [
            ['header_ausente', 400, 'Auth header is requered'],
            ['header_malformado', 400, 'Auth header is malformed']
        ]
    ),
    401: error_response(
        'El token JWT es inválido, fue alterado, está vencido o tiene una fecha de validez futura.',
        [
            ['token_invalido', 401, 'Auth token is invalid!']
        ]
    )
}

/* Error inesperado: el middleware central de errores responde siempre igual */
const INTERNAL_ERROR = {
    500: error_response(
        'Error inesperado no contemplado por la API (por ejemplo un `CastError` de Mongoose al recibir un id con formato inválido o un `ValidationError` de un schema).',
        [
            ['error_interno', 500, 'Internal server error']
        ]
    )
}

/* Se ejecuta antes que cualquier ruta: si Mongo no responde, no llega al controller */
const DATABASE_ERROR = {
    503: {
        description: 'No se pudo establecer conexión con MongoDB. Esta respuesta se produce en el middleware de conexión, antes de llegar al endpoint.',
        content: json_content(
            { $ref: '#/components/schemas/ServiceUnavailableResponse' },
            {
                example: {
                    message: 'No se pudo conectar a la base de datos'
                }
            }
        )
    }
}

/* ------------------------------------------------------------------ */
/* Documento                                                           */
/* ------------------------------------------------------------------ */

const openapi_document = {
    openapi: '3.0.3',

    info: {
        title: '2026 UTN Slack API',
        version: '1.0.0',
        description: [
            'API REST de la plataforma tipo Slack (usuarios, espacios de trabajo, membresías y canales).',
            '',
            '## Formato de las respuestas',
            'Todas las respuestas (salvo el `503` del middleware de conexión) comparten la misma envoltura:',
            '',
            '```json',
            '{ "ok": true, "status": 200, "message": "texto", "data": { } }',
            '```',
            '',
            '- `ok`: indica si la operación fue exitosa.',
            '- `status`: repite el código HTTP de la respuesta.',
            '- `message`: mensaje legible para el cliente.',
            '- `data`: presente solo en las respuestas que devuelven información.',
            '',
            'Los errores usan la misma envoltura con `ok: false` y sin `data`.',
            '',
            '## Autenticación',
            'Los endpoints protegidos esperan el header:',
            '',
            '```',
            'Authorization: Bearer <auth_token>',
            '```',
            '',
            'El `auth_token` se obtiene en `POST /api/auth/login` y se envía también al botón **Authorize** de Swagger UI.'
        ].join('\n')
    },

    servers: [
        {
            url: SERVER_URL,
            description: 'Servidor configurado con URL_BACKEND (por defecto el local)'
        }
    ],

    tags: [
        {
            name: 'Auth',
            description: 'Registro, inicio de sesión, verificación de email y recuperación de contraseña.'
        },
        {
            name: 'Users',
            description: 'Consulta de usuarios registrados.'
        },
        {
            name: 'Workspaces',
            description: 'Espacios de trabajo y sus membresías. Requieren autenticación.'
        },
        {
            name: 'Channels',
            description: 'Canales de un espacio de trabajo. Requieren autenticación.'
        }
    ],

    paths: {

        /* ------------------------------------------------------------ */
        /* AUTH                                                          */
        /* ------------------------------------------------------------ */

        '/api/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Registrar un usuario',
                operationId: 'register',
                description: [
                    'Crea un usuario con la contraseña encriptada (bcrypt) y envía un email de verificación con un token válido por 7 días.',
                    '',
                    'Acepta además una `descripcion` (bio, máx. 160 caracteres) y una `foto_perfil` (data URL base64, máx. ~200 KB), ambas opcionales.',
                    '',
                    'El usuario queda con `email_verificado: false` hasta que use el enlace del mail, por lo que todavía no puede iniciar sesión.'
                ].join('\n'),
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/RegisterRequest' },
                        {
                            example: {
                                username: 'maria',
                                email: 'maria@mail.com',
                                password: 'pepe123',
                                descripcion: 'Backend developer en formación',
                                foto_perfil: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
                            }
                        }
                    )
                },
                responses: {
                    201: success_response(
                        'Usuario creado. Se envió el email de verificación.',
                        { $ref: '#/components/schemas/SuccessfulMessageResponse' },
                        {
                            ok: true,
                            status: 201,
                            message: 'User registered successfully'
                        }
                    ),
                    400: error_response(
                        'Datos inválidos. La respuesta para un email ya registrado es idéntica a cualquier otro error de registro (no se revela si el email existe).',
                        [
                            ['campos_faltantes', 400, 'Email, password and username is required'],
                            ['email_invalido', 400, 'Email is incorrect'],
                            ['generico_registro', 400, 'Sucedio un error al tratar de crear su cuenta'],
                            ['descripcion_larga', 400, 'descripcion no puede superar los 160 caracteres'],
                            ['foto_invalida', 400, 'foto_perfil debe ser una imagen en formato data URL base64 (PNG, JPG o WebP)'],
                            ['foto_grande', 400, 'foto_perfil no puede superar los 200 KB']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Iniciar sesión',
                operationId: 'login',
                description: [
                    'Valida las credenciales y devuelve un JWT (`auth_token`) que debe enviarse en el header `Authorization` de los endpoints protegidos.',
                    '',
                    'El JWT incluye `id`, `name` y `email` del usuario. No tiene expiración configurada en la implementación actual.'
                ].join('\n'),
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/LoginRequest' },
                        {
                            example: {
                                email: 'maria@mail.com',
                                password: 'pepe123'
                            }
                        }
                    )
                },
                responses: {
                    200: success_response(
                        'Credenciales válidas. Se devuelve el token de sesión.',
                        { $ref: '#/components/schemas/LoginResponse' },
                        {
                            ok: true,
                            message: 'You have logged in successfully',
                            status: 200,
                            data: {
                                auth_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                            }
                        }
                    ),
                    400: error_response(
                        'Campos faltantes, tipos incorrectos o email con formato inválido.',
                        [
                            ['campos_requeridos', 400, 'Email and password are required'],
                            ['email_invalido', 400, 'Email is incorrect']
                        ]
                    ),
                    401: error_response(
                        'El email no está registrado o la contraseña no coincide con el hash guardado.',
                        [
                            ['credenciales_invalidas', 401, 'Invalid email or password']
                        ]
                    ),
                    403: error_response(
                        'Se devuelve un error genérico para no revelar si el email está verificado o no.',
                        [
                            ['email_no_verificado', 403, 'Sucedio un error al tratar de iniciar sesion en su cuenta']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/auth/verify-email': {
            get: {
                tags: ['Auth'],
                summary: 'Verificar el email del usuario',
                operationId: 'verifyEmail',
                description: [
                    'Verifica la firma y la vigencia del token enviado por mail y marca al usuario como verificado.',
                    '',
                    'Si el usuario ya estaba verificado no se considera un error: responde `200` con `data.already_verified: true` (el enlace pudo usarse dos veces).',
                    '',
                    'El token también puede llegar por path en el endpoint de compatibilidad `GET /api/auth/verify-email/{verify_email_token}`.'
                ].join('\n'),
                parameters: [
                    {
                        name: 'verification_token',
                        in: 'query',
                        required: true,
                        description: 'Token JWT firmado que viaja en el enlace del email de verificación.',
                        schema: {
                            type: 'string'
                        },
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                ],
                responses: {
                    200: {
                        description: 'Email verificado o ya verificado previamente.',
                        content: json_content(
                            { $ref: '#/components/schemas/VerifyEmailResponse' },
                            {
                                examples: {
                                    verificado_ahora: {
                                        summary: 'El usuario se verificó con esta llamada',
                                        value: {
                                            ok: true,
                                            status: 200,
                                            message: 'Usuario verificado exitosamente'
                                        }
                                    },
                                    ya_verificado: {
                                        summary: 'El usuario ya estaba verificado',
                                        value: {
                                            ok: true,
                                            status: 200,
                                            message: 'El email ya estaba verificado',
                                            data: {
                                                already_verified: true
                                            }
                                        }
                                    }
                                }
                            }
                        )
                    },
                    400: error_response(
                        'Falta el token o el enlace es inválido, fue alterado o expiró.',
                        [
                            ['token_faltante', 400, 'El link no incluye un token de verificacion'],
                            ['token_invalido', 400, 'El enlace de verificacion es invalido o expiro']
                        ]
                    ),
                    403: error_response(
                        'El usuario existe pero está desactivado de la plataforma.',
                        [
                            ['usuario_desactivado', 403, 'Usuario esta desactivado de la plataforma, contactate con soporte si consideras que esto es un error']
                        ]
                    ),
                    404: error_response(
                        'El token es válido pero el usuario referenciado ya no existe.',
                        [
                            ['usuario_no_encontrado', 404, 'Usuario no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/auth/verify-email/{verify_email_token}': {
            get: {
                tags: ['Auth'],
                summary: 'Verificación de email (compatibilidad con links viejos)',
                operationId: 'verifyEmailLegacyRedirect',
                description: [
                    'Endpoint de compatibilidad para enlaces antiguos que traían el token en el path.',
                    '',
                    'No verifica nada por sí mismo: redirige (`302`) al frontend a `/verify-email?verification_token=...` para que la pantalla de verificación procese el token.'
                ].join('\n'),
                parameters: [
                    {
                        name: 'verify_email_token',
                        in: 'path',
                        required: true,
                        description: 'Token de verificación que venía en el path del link viejo.',
                        schema: {
                            type: 'string'
                        }
                    }
                ],
                responses: {
                    302: {
                        description: 'Redirección al frontend con el token en el query string.',
                        headers: {
                            Location: {
                                description: 'URL del frontend: `${URL_FRONTEND}/verify-email?verification_token=<token>`',
                                schema: {
                                    type: 'string',
                                    format: 'uri'
                                }
                            }
                        }
                    },
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/auth/forgot-password': {
            post: {
                tags: ['Auth'],
                summary: 'Solicitar restablecimiento de contraseña',
                operationId: 'forgotPassword',
                description: [
                    'Si el email pertenece a un usuario existente y activo, genera un token de restablecimiento válido por 1 hora y envía el mail con el enlace al frontend (`/reset-password?reset_token=...`).',
                    '',
                    'Por seguridad la respuesta es **siempre la misma**, exista o no el usuario, para no revelar qué emails están registrados.'
                ].join('\n'),
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/ForgotPasswordRequest' },
                        {
                            example: {
                                email: 'maria@mail.com'
                            }
                        }
                    )
                },
                responses: {
                    200: success_response(
                        'Solicitud procesada. No confirma si el email existe.',
                        { $ref: '#/components/schemas/SuccessfulMessageResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Si el email está registrado, te enviamos un correo con las instrucciones para restablecer tu contraseña'
                        }
                    ),
                    400: error_response(
                        'El email no fue enviado o tiene un formato inválido.',
                        [
                            ['email_requerido', 400, 'Email is required'],
                            ['email_invalido', 400, 'Email is incorrect']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/auth/reset-password': {
            post: {
                tags: ['Auth'],
                summary: 'Restablecer la contraseña',
                operationId: 'resetPassword',
                description: [
                    'Valida el token recibido por mail y guarda la nueva contraseña encriptada.',
                    '',
                    'El token está firmado con un secreto que incluye el hash de la contraseña actual, por lo que **solo puede usarse una vez**: al cambiar la contraseña, el token deja de ser válido.'
                ].join('\n'),
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/ResetPasswordRequest' },
                        {
                            example: {
                                reset_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                                new_password: 'nuevaClave123'
                            }
                        }
                    )
                },
                responses: {
                    200: success_response(
                        'Contraseña actualizada correctamente.',
                        { $ref: '#/components/schemas/SuccessfulMessageResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Contraseña actualizada correctamente'
                        }
                    ),
                    400: error_response(
                        'Faltan datos, la contraseña es demasiado corta o el token es inválido/expiró.',
                        [
                            ['campos_requeridos', 400, 'El token y la nueva contraseña son obligatorios'],
                            ['password_corta', 400, 'La contraseña debe tener al menos 8 caracteres'],
                            ['token_invalido', 400, 'El enlace de restablecimiento es inválido o expiró']
                        ]
                    ),
                    403: error_response(
                        'El usuario dueño del token está desactivado de la plataforma.',
                        [
                            ['usuario_desactivado', 403, 'Usuario esta desactivado de la plataforma, contactate con soporte si consideras que esto es un error']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        /* ------------------------------------------------------------ */
        /* USERS                                                         */
        /* ------------------------------------------------------------ */

        '/api/users': {
            get: {
                tags: ['Users'],
                summary: 'Listar todos los usuarios',
                operationId: 'getUsers',
                description: [
                    'Devuelve la lista completa de usuarios registrados.',
                    '',
                    '**Ojo:** hoy esta ruta no usa `authMiddleware`, por lo que es pública. Además devuelve el documento completo de MongoDB, incluido el hash de la contraseña.'
                ].join('\n'),
                responses: {
                    200: success_response(
                        'Lista de usuarios.',
                        { $ref: '#/components/schemas/GetUsersResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Get users list',
                            data: {
                                users: [
                                    {
                                        _id: '6aabff9a190ff6061955c889',
                                        nombre: 'maria',
                                        email: 'maria@mail.com',
                                        password: '$2b$10$hash...',
                                        fecha_creacion: '2026-09-17T14:56:26.249Z',
                                        activo: true,
                                        email_verificado: true,
                                        __v: 0
                                    }
                                ]
                            }
                        }
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/users/me': {
            get: {
                tags: ['Users'],
                summary: 'Obtener el perfil del usuario autenticado',
                operationId: 'getMe',
                description: [
                    'Devuelve el perfil completo del usuario dueño del token, incluyendo `foto_perfil` y `descripcion`.',
                    '',
                    'Estos datos no viajan dentro del JWT (el payload queda acotado a `id`, `name` y `email`), por lo que esta es la forma de traerlos.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                responses: {
                    200: success_response(
                        'Perfil del usuario autenticado.',
                        { $ref: '#/components/schemas/GetMeResponse' }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    404: error_response(
                        'El usuario del token ya no existe.',
                        [
                            ['usuario_no_encontrado', 404, 'User not found']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            },

            put: {
                tags: ['Users'],
                summary: 'Actualizar la propia cuenta',
                operationId: 'updateMe',
                description: [
                    'Cambia el `name` (obligatorio) y, opcionalmente, la `descripcion` y la `foto_perfil` del usuario autenticado.',
                    '',
                    'Devuelve el usuario actualizado y un JWT nuevo re-firmado con el nombre actualizado (la sesión no necesita re-login).',
                    '',
                    'Semántica de `foto_perfil`: data URL reemplaza, `null` quita la foto, campo omitido la conserva. `descripcion` con campo omitido también se conserva.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/UpdateMeRequest' },
                        {
                            example: {
                                name: 'María García',
                                descripcion: 'Backend developer en formación',
                                foto_perfil: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
                            }
                        }
                    )
                },
                responses: {
                    200: success_response(
                        'Perfil actualizado con el token re-firmado.',
                        { $ref: '#/components/schemas/UpdateMeResponse' }
                    ),
                    400: error_response(
                        '`name` faltante o vacío, `name` mayor a 60 caracteres, `descripcion` mayor a 160, o `foto_perfil` inválida.',
                        [
                            ['name_faltante', 400, 'name es un campo requerido'],
                            ['name_largo', 400, 'name no puede superar los 60 caracteres'],
                            ['descripcion_larga', 400, 'descripcion no puede superar los 160 caracteres'],
                            ['foto_invalida', 400, 'foto_perfil debe ser una imagen en formato data URL base64 (PNG, JPG o WebP)'],
                            ['foto_grande', 400, 'foto_perfil no puede superar los 200 KB']
                        ]
                    ),
                    401: AUTH_ERRORS[401],
                    404: error_response(
                        'El usuario del token no existe o está desactivado.',
                        [
                            ['usuario_no_encontrado', 404, 'Usuario no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            },

            delete: {
                tags: ['Users'],
                summary: 'Borrar la cuenta del usuario autenticado',
                operationId: 'deleteMe',
                description: [
                    'Borra la cuenta DEFINITIVAMENTE con borrado en cascada:',
                    '',
                    '- Los espacios donde el usuario es el ÚNICO owner se eliminan por completo (canales, mensajes y membresías de todos sus integrantes).',
                    '- En espacios ajenos se borran solo sus mensajes y su membresía; el espacio y los demás miembros quedan intactos.',
                    '',
                    'El body no lleva datos; el endpoint responde con `data.workspaces_deleted` (lista de ids de espacios eliminados).'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                responses: {
                    200: success_response(
                        'Cuenta eliminada.',
                        { $ref: '#/components/schemas/SuccessfulMessageResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Cuenta eliminada correctamente',
                            data: {
                                account_deleted: true,
                                user_deleted: {
                                    id: '6aabff9a190ff6061955c889',
                                    nombre: 'maria',
                                    email: 'maria@mail.com'
                                },
                                workspaces_deleted: [
                                    { workspace_id: '6ab01f9a190ff6061955c88a' }
                                ]
                            }
                        }
                    ),
                    401: AUTH_ERRORS[401],
                    404: error_response(
                        'El usuario no existe.',
                        [
                            ['usuario_no_encontrado', 404, 'Usuario no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/users/{user_id}': {
            get: {
                tags: ['Users'],
                summary: 'Obtener un usuario por id',
                operationId: 'getUserById',
                description: [
                    'Devuelve los datos de un usuario en particular.',
                    '',
                    '**Ojo:** hoy esta ruta no usa `authMiddleware`, por lo que es pública. Si el id no tiene formato de ObjectId de MongoDB, Mongoose lanza un `CastError` y la API responde `500`.'
                ].join('\n'),
                parameters: [
                    { $ref: '#/components/parameters/UserId' }
                ],
                responses: {
                    200: success_response(
                        'Usuario encontrado.',
                        { $ref: '#/components/schemas/GetUserResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Get user details successfully',
                            data: {
                                user: {
                                    _id: '6aabff9a190ff6061955c889',
                                    nombre: 'maria',
                                    email: 'maria@mail.com',
                                    password: '$2b$10$hash...',
                                    fecha_creacion: '2026-09-17T14:56:26.249Z',
                                    activo: true,
                                    email_verificado: true,
                                    __v: 0
                                }
                            }
                        }
                    ),
                    404: error_response(
                        'No existe un usuario con ese id.',
                        [
                            ['usuario_no_encontrado', 404, 'User not found']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        /* ------------------------------------------------------------ */
        /* WORKSPACES                                                    */
        /* ------------------------------------------------------------ */

        '/api/workspaces': {
            get: {
                tags: ['Workspaces'],
                summary: 'Listar los espacios de trabajo del usuario autenticado',
                operationId: 'getWorkspaces',
                description: [
                    'Devuelve una entrada por cada membresía del usuario autenticado, con el rol que tiene en ese espacio de trabajo.',
                    '',
                    'Los datos del workspace se obtienen con `populate`. Si una membresía apunta a un workspace que ya no existe, la API falla con `500`.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                responses: {
                    200: success_response(
                        'Membresías del usuario con los datos resumidos de cada workspace.',
                        { $ref: '#/components/schemas/GetWorkspacesResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Obtenidos todos los datos',
                            data: {
                                workspaces: [
                                    {
                                        member_id: '6ab01f9a190ff6061955c890',
                                        member_rol: 'owner',
                                        workspace_id: '6ab01f9a190ff6061955c88a',
                                        workspace_nombre: 'Equipo Backend',
                                        workspace_descripcion: 'Canal de trabajo del equipo de backend',
                                        workspace_logo: null,
                                        workspace_fecha_creacion: '2026-09-17T14:56:26.249Z'
                                    }
                                ]
                            }
                        }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            },
            post: {
                tags: ['Workspaces'],
                summary: 'Crear un espacio de trabajo',
                operationId: 'createWorkspace',
                description: [
                    'Crea un workspace con los datos del body. El usuario autenticado queda automáticamente como miembro con rol `owner`.',
                    '',
                    'Además se crea automáticamente el canal `General` dentro del espacio. Si la creación de la membresía o del canal falla, el espacio se elimina para no quedar a medio armar.',
                    '',
                    '`logo` es opcional: una data URL base64 (`data:image/png|jpeg|webp;base64,...`) de hasta ~200 KB decodificados. Si viene inválido, la API responde `400`.',
                    '',
                    'No hay validación manual del resto del body: se delega en el schema de Mongoose. Si falta `name`, supera los 30 caracteres o `description` supera los 1000, Mongoose lanza un `ValidationError` que la API responde como `500`.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/CreateWorkspaceRequest' },
                        {
                            example: {
                                name: 'Equipo Backend',
                                description: 'Canal de trabajo del equipo de backend',
                                logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
                            }
                        }
                    )
                },
                responses: {
                    201: success_response(
                        'Workspace creado, membresía de owner generada y canal General creado.',
                        { $ref: '#/components/schemas/CreateWorkspaceResponse' },
                        {
                            ok: true,
                            status: 201,
                            message: 'Workspace creado',
                            data: {
                                workspace_created: {
                                    _id: '6ab01f9a190ff6061955c88a',
                                    nombre: 'Equipo Backend',
                                    description: 'Canal de trabajo del equipo de backend',
                                    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
                                    fecha_creacion: '2026-09-17T14:56:26.249Z',
                                    __v: 0
                                },
                                owner_membership: {
                                    _id: '6ab01f9a190ff6061955c890',
                                    fk_id_usuario: '6aabff9a190ff6061955c889',
                                    fk_id_espacio_trabajo: '6ab01f9a190ff6061955c88a',
                                    rol: 'owner',
                                    fecha_creacion: '2026-09-17T14:56:26.249Z',
                                    activo: false,
                                    __v: 0
                                },
                                default_channel: {
                                    canal_id: '6ab01f9a190ff6061955c8a0',
                                    canal_nombre: 'General',
                                    canal_descripcion: 'Canal general del espacio de trabajo',
                                    categoria: null,
                                    fecha_creacion: '2026-09-17T14:56:26.249Z'
                                }
                            }
                        }
                    ),
                    400: error_response(
                        'Header de autenticación inválido, o `logo` inválido en el body.',
                        [
                            ['header_ausente', 400, 'Auth header is requered'],
                            ['header_malformado', 400, 'Auth header is malformed'],
                            ['logo_invalido', 400, 'logo debe ser una imagen en formato data URL base64 (PNG, JPG o WebP)'],
                            ['logo_grande', 400, 'logo no puede superar los 200 KB']
                        ]
                    ),
                    401: AUTH_ERRORS[401],
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/workspaces/{workspace_id}': {
            get: {
                tags: ['Workspaces'],
                summary: 'Obtener un espacio de trabajo',
                operationId: 'getWorkspaceById',
                description: [
                    'Devuelve los datos del workspace y la lista de sus miembros.',
                    '',
                    'Requiere ser miembro del workspace (cualquier rol).'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' }
                ],
                responses: {
                    200: success_response(
                        'Workspace y sus miembros.',
                        { $ref: '#/components/schemas/GetWorkspaceResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Workspace obtenido correctamente',
                            data: {
                                workspace_selected: {
                                    _id: '6ab01f9a190ff6061955c88a',
                                    nombre: 'Equipo Backend',
                                    description: 'Canal de trabajo del equipo de backend',
                                    logo: null,
                                    fecha_creacion: '2026-09-17T14:56:26.249Z',
                                    __v: 0
                                },
                                members: [
                                    {
                                        member_id: '6ab01f9a190ff6061955c890',
                                        member_rol: 'owner',
                                        fecha_creacion: '2026-09-17T14:56:26.249Z',
                                        usuario: {
                                            id: '6aabff9a190ff6061955c889',
                                            nombre: 'maria',
                                            email: 'maria@mail.com'
                                        }
                                    }
                                ]
                            }
                        }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario autenticado no es miembro del workspace.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo']
                        ]
                    ),
                    404: error_response(
                        'No existe un workspace con ese id.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            },
            put: {
                tags: ['Workspaces'],
                summary: 'Actualizar un espacio de trabajo',
                operationId: 'updateWorkspace',
                description: [
                    'Actualiza el nombre y la descripción del workspace.',
                    '',
                    '`name` es obligatorio. `description` es opcional: si no se envía (o llega vacía) se guarda como cadena vacía. Solo puede hacerlo un miembro con rol `owner` o `admin`.',
                    '',
                    '`logo` es opcional: si se envía reemplaza el logo actual (data URL base64, máx. ~200 KB), con `null` se quita, y si no se envía se conserva.',
                    '',
                    '**Ojo:** el repositorio actual no retorna el documento actualizado, por lo que la respuesta devuelve `data: {}` (sin `workspace_updated`).'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' }
                ],
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/UpdateWorkspaceRequest' },
                        {
                            example: {
                                name: 'Equipo Backend UTN',
                                description: 'Nueva descripción del espacio',
                                logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
                            }
                        }
                    )
                },
                responses: {
                    200: success_response(
                        'Workspace actualizado. `data` llega vacío en la implementación actual.',
                        { $ref: '#/components/schemas/UpdateWorkspaceResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Workspace actualizado correctamente',
                            data: {}
                        }
                    ),
                    400: error_response(
                        'Header de autenticación inválido, falta `name` en el body, o `logo` inválido.',
                        [
                            ['header_ausente', 400, 'Auth header is requered'],
                            ['header_malformado', 400, 'Auth header is malformed'],
                            ['campos_requeridos', 400, 'name es un campo requerido'],
                            ['logo_invalido', 400, 'logo debe ser una imagen en formato data URL base64 (PNG, JPG o WebP)'],
                            ['logo_grande', 400, 'logo no puede superar los 200 KB']
                        ]
                    ),
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario no es miembro del workspace o su rol no es `owner`/`admin`.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo'],
                            ['sin_permisos', 403, 'No tienes permisos suficientes para hacer esta operacion']
                        ]
                    ),
                    404: error_response(
                        'No existe un workspace con ese id.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            },
            delete: {
                tags: ['Workspaces'],
                summary: 'Eliminar un espacio de trabajo',
                operationId: 'deleteWorkspace',
                description: [
                    'Elimina el workspace, todas sus membresías, sus canales y los mensajes de esos canales.',
                    '',
                    'Solo puede hacerlo un miembro con rol `owner`.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' }
                ],
                responses: {
                    200: success_response(
                        'Workspace eliminado junto con sus membresías, canales y mensajes.',
                        { $ref: '#/components/schemas/DeleteWorkspaceResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Workspace eliminado correctamente',
                            data: {
                                workspace_deleted: {
                                    _id: '6ab01f9a190ff6061955c88a',
                                    nombre: 'Equipo Backend',
                                    description: 'Canal de trabajo del equipo de backend',
                                    fecha_creacion: '2026-09-17T14:56:26.249Z',
                                    __v: 0
                                }
                            }
                        }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario no es miembro del workspace o su rol no es `owner`.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo'],
                            ['sin_permisos', 403, 'No tienes permisos suficientes para hacer esta operacion']
                        ]
                    ),
                    404: error_response(
                        'No existe un workspace con ese id.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/workspaces/{workspace_id}/members': {
            get: {
                tags: ['Workspaces'],
                summary: 'Listar los miembros de un espacio de trabajo',
                operationId: 'getWorkspaceMembers',
                description: 'Devuelve todas las membresías del workspace con los datos públicos de cada usuario. Requiere ser miembro (cualquier rol).',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' }
                ],
                responses: {
                    200: success_response(
                        'Lista de miembros del workspace.',
                        { $ref: '#/components/schemas/GetWorkspaceMembersResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Miembros obtenidos correctamente',
                            data: {
                                members: [
                                    {
                                        member_id: '6ab01f9a190ff6061955c890',
                                        member_rol: 'owner',
                                        fecha_creacion: '2026-09-17T14:56:26.249Z',
                                        usuario: {
                                            id: '6aabff9a190ff6061955c889',
                                            nombre: 'maria',
                                            email: 'maria@mail.com'
                                        }
                                    }
                                ]
                            }
                        }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario autenticado no es miembro del workspace.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo']
                        ]
                    ),
                    404: error_response(
                        'No existe un workspace con ese id.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/workspaces/{workspace_id}/members/{member_id}': {
            delete: {
                tags: ['Workspaces'],
                summary: 'Eliminar un miembro de un espacio de trabajo',
                operationId: 'removeWorkspaceMember',
                description: [
                    'Elimina la membresía indicada del workspace.',
                    '',
                    'Solo puede hacerlo un miembro con rol `owner` o `admin`. El owner del workspace no puede ser eliminado, nadie puede eliminar su propia membresía y un `admin` solo puede eliminar usuarios comunes (no a otros `admin`).'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' },
                    { $ref: '#/components/parameters/MemberId' }
                ],
                responses: {
                    200: success_response(
                        'Membresía eliminada del workspace.',
                        { $ref: '#/components/schemas/DeleteWorkspaceMemberResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Miembro eliminado correctamente',
                            data: {
                                member_deleted: {
                                    member_id: '6ab01f9a190ff6061955c890',
                                    member_rol: 'user',
                                    usuario_id: '6aabff9a190ff6061955c889'
                                }
                            }
                        }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario no es miembro del workspace, su rol no es `owner`/`admin`, o la operación viola las reglas de eliminación.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo'],
                            ['sin_permisos', 403, 'No tienes permisos suficientes para hacer esta operacion'],
                            ['propia_membresia', 403, 'No podes eliminar tu propia membresia'],
                            ['owner_protegido', 403, 'No se puede eliminar al owner del espacio de trabajo'],
                            ['admin_protegido', 403, 'Un admin no puede eliminar a otro admin']
                        ]
                    ),
                    404: error_response(
                        'No existe el workspace o la membresía no pertenece a ese workspace.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado'],
                            ['miembro_no_encontrado', 404, 'Miembro no encontrado en este espacio de trabajo']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        /* ------------------------------------------------------------ */
        /* CHANNELS                                                      */
        /* ------------------------------------------------------------ */

        '/api/workspaces/{workspace_id}/channels': {
            get: {
                tags: ['Channels'],
                summary: 'Listar los canales de un espacio de trabajo',
                operationId: 'getChannels',
                description: [
                    'Devuelve los canales del workspace ordenados por fecha de creación.',
                    '',
                    'Requiere ser miembro del workspace (cualquier rol). El canal `General` se crea automáticamente al crear el espacio.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' }
                ],
                responses: {
                    200: success_response(
                        'Lista de canales del workspace.',
                        { $ref: '#/components/schemas/GetChannelsResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Canales obtenidos correctamente',
                            data: {
                                channels: [
                                    {
                                        canal_id: '6ab01f9a190ff6061955c8a0',
                                        canal_nombre: 'General',
                                        canal_descripcion: 'Canal general del espacio de trabajo',
                                        categoria: null,
                                        fecha_creacion: '2026-09-17T14:56:26.249Z'
                                    }
                                ]
                            }
                        }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario autenticado no es miembro del workspace.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo']
                        ]
                    ),
                    404: error_response(
                        'No existe un workspace con ese id.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            },
            post: {
                tags: ['Channels'],
                summary: 'Crear un canal en un espacio de trabajo',
                operationId: 'createChannel',
                description: [
                    'Crea un canal dentro del workspace. Solo puede hacerlo un miembro con rol `owner` o `admin`.',
                    '',
                    '`name` es obligatorio y se guarda sin el `#`. `description` y `categoria` son opcionales; si no se envía `categoria`, el canal queda sin categoría.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' }
                ],
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/CreateChannelRequest' },
                        {
                            example: {
                                name: 'anuncios',
                                description: 'Novedades del equipo'
                            }
                        }
                    )
                },
                responses: {
                    201: success_response(
                        'Canal creado.',
                        { $ref: '#/components/schemas/CreateChannelResponse' },
                        {
                            ok: true,
                            status: 201,
                            message: 'Canal creado',
                            data: {
                                channel_created: {
                                    canal_id: '6ab01f9a190ff6061955c8a1',
                                    canal_nombre: 'anuncios',
                                    canal_descripcion: 'Novedades del equipo',
                                    categoria: null,
                                    fecha_creacion: '2026-09-17T15:10:00.000Z'
                                }
                            }
                        }
                    ),
                    400: error_response(
                        'Header de autenticación inválido, o body inválido.',
                        [
                            ['header_ausente', 400, 'Auth header is requered'],
                            ['header_malformado', 400, 'Auth header is malformed'],
                            ['falta_name', 400, 'name es un campo requerido'],
                            ['name_largo', 400, 'name no puede superar los 60 caracteres'],
                            ['description_larga', 400, 'description no puede superar los 1000 caracteres'],
                            ['categoria_larga', 400, 'categoria no puede superar los 60 caracteres']
                        ]
                    ),
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario no es miembro del workspace o su rol no es `owner`/`admin`.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo'],
                            ['sin_permisos', 403, 'No tienes permisos suficientes para hacer esta operacion']
                        ]
                    ),
                    404: error_response(
                        'No existe un workspace con ese id.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/workspaces/{workspace_id}/channels/{channel_id}': {
            delete: {
                tags: ['Channels'],
                summary: 'Eliminar un canal',
                operationId: 'deleteChannel',
                description: [
                    'Elimina el canal y sus mensajes. Solo puede hacerlo un miembro con rol `owner` o `admin`.',
                    '',
                    'El canal `General` del espacio no se puede eliminar.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' },
                    { $ref: '#/components/parameters/ChannelId' }
                ],
                responses: {
                    200: success_response(
                        'Canal eliminado junto con sus mensajes.',
                        { $ref: '#/components/schemas/DeleteChannelResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Canal eliminado correctamente',
                            data: {
                                channel_deleted: {
                                    canal_id: '6ab01f9a190ff6061955c8a1',
                                    canal_nombre: 'anuncios',
                                    canal_descripcion: 'Novedades del equipo',
                                    categoria: null,
                                    fecha_creacion: '2026-09-17T15:10:00.000Z'
                                }
                            }
                        }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario no es miembro del workspace, su rol no es `owner`/`admin`, o intenta borrar el canal General.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo'],
                            ['sin_permisos', 403, 'No tienes permisos suficientes para hacer esta operacion'],
                            ['canal_protegido', 403, 'El canal General del espacio no se puede eliminar']
                        ]
                    ),
                    404: error_response(
                        'No existe el workspace, o el canal no pertenece a ese workspace.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado'],
                            ['canal_no_encontrado', 404, 'Canal no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/workspaces/{workspace_id}/channels/{channel_id}/messages': {
            get: {
                tags: ['Channels'],
                summary: 'Listar los mensajes de un canal',
                operationId: 'getChannelMessages',
                description: [
                    'Devuelve los mensajes del canal ordenados por fecha de creación (del más antiguo al más reciente).',
                    '',
                    'Requiere ser miembro del workspace (cualquier rol). El autor se devuelve resuelto desde la membresía: `autor.member_id` y `autor.nombre`.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' },
                    { $ref: '#/components/parameters/ChannelId' }
                ],
                responses: {
                    200: success_response(
                        'Lista de mensajes del canal.',
                        { $ref: '#/components/schemas/GetChannelMessagesResponse' },
                        {
                            ok: true,
                            status: 200,
                            message: 'Mensajes obtenidos correctamente',
                            data: {
                                messages: [
                                    {
                                        mensaje_id: '6ab01f9a190ff6061955c8b0',
                                        contenido: '¡Hola equipo!',
                                        fecha_creacion: '2026-11-15T19:02:00.000Z',
                                        autor: {
                                            member_id: '6ab01f9a190ff6061955c890',
                                            nombre: 'maria'
                                        }
                                    }
                                ]
                            }
                        }
                    ),
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario autenticado no es miembro del workspace.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo']
                        ]
                    ),
                    404: error_response(
                        'No existe el workspace, o el canal no pertenece a ese workspace.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado'],
                            ['canal_no_encontrado', 404, 'Canal no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            },
            post: {
                tags: ['Channels'],
                summary: 'Enviar un mensaje a un canal',
                operationId: 'createChannelMessage',
                description: [
                    'Crea un mensaje en el canal en nombre del usuario autenticado. Cualquier miembro del workspace puede enviar mensajes en cualquiera de sus canales.',
                    '',
                    '`content` es obligatorio, se guarda sin espacios al inicio ni al final y admite hasta 30000 caracteres.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' },
                    { $ref: '#/components/parameters/ChannelId' }
                ],
                requestBody: {
                    required: true,
                    content: json_content(
                        { $ref: '#/components/schemas/CreateChannelMessageRequest' },
                        {
                            example: {
                                content: '¡Hola equipo!'
                            }
                        }
                    )
                },
                responses: {
                    201: success_response(
                        'Mensaje creado.',
                        { $ref: '#/components/schemas/CreateChannelMessageResponse' },
                        {
                            ok: true,
                            status: 201,
                            message: 'Mensaje creado',
                            data: {
                                message_created: {
                                    mensaje_id: '6ab01f9a190ff6061955c8b0',
                                    contenido: '¡Hola equipo!',
                                    fecha_creacion: '2026-11-15T19:02:00.000Z',
                                    autor: {
                                        member_id: '6ab01f9a190ff6061955c890',
                                        nombre: 'maria'
                                    }
                                }
                            }
                        }
                    ),
                    400: error_response(
                        'Header de autenticación inválido, o body inválido.',
                        [
                            ['header_ausente', 400, 'Auth header is requered'],
                            ['header_malformado', 400, 'Auth header is malformed'],
                            ['falta_content', 400, 'content es un campo requerido'],
                            ['content_largo', 400, 'content no puede superar los 30000 caracteres']
                        ]
                    ),
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario autenticado no es miembro del workspace.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo']
                        ]
                    ),
                    404: error_response(
                        'No existe el workspace, o el canal no pertenece a ese workspace.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado'],
                            ['canal_no_encontrado', 404, 'Canal no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        },

        '/api/workspaces/{workspace_id}/channels/{channel_id}/events': {
            get: {
                tags: ['Channels'],
                summary: 'Suscribirse al feed en tiempo real del canal (SSE)',
                operationId: 'streamChannelEvents',
                description: [
                    'Abre una conexion **Server-Sent Events** (`text/event-stream`) y mantiene la respuesta abierta mientras el cliente escuche.',
                    '',
                    'Eventos que emite:',
                    '- `connected`: evento de bienvenida, `data` = `{ "canal_id": "..." }`.',
                    '- `mensaje-nuevo`: `data` = `{ "canal_id": "...", "mensaje": { mensaje_id, contenido, fecha_creacion, autor } }`. No se emite al autor del mensaje.',
                    '',
                    'La conexion recibe comentarios `":ping"` como heartbeat para mantenerse viva a traves de proxies.',
                    '',
                    'Como `EventSource` no puede enviar headers, el token JWT se acepta por query param: `?token=<auth_token>`.'
                ].join('\n'),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/WorkspaceId' },
                    { $ref: '#/components/parameters/ChannelId' },
                    {
                        name: 'token',
                        in: 'query',
                        required: false,
                        description: 'Alternativa al header `Authorization` para el feed SSE (EventSource no soporta headers). Usa el mismo JWT de la API.',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    200: {
                        description: 'Stream de eventos abierto. Cada evento llega como `event: <nombre>\\ndata: <json>\\n\\n`.',
                        content: {
                            'text/event-stream': {
                                schema: { type: 'string' },
                                example: 'event: mensaje-nuevo\ndata: {"canal_id":"6ab01f9a190ff6061955c8a1","mensaje":{"mensaje_id":"6ab01f9a190ff6061955c8b0","contenido":"¡Hola equipo!","fecha_creacion":"2026-11-15T19:02:00.000Z","autor":{"member_id":"6ab01f9a190ff6061955c890","nombre":"maria"}}}\n\n'
                            }
                        }
                    },
                    400: AUTH_ERRORS[400],
                    401: AUTH_ERRORS[401],
                    403: error_response(
                        'El usuario autenticado no es miembro del workspace.',
                        [
                            ['no_miembro', 403, 'No eres miembro de este espacio de trabajo']
                        ]
                    ),
                    404: error_response(
                        'No existe el workspace, o el canal no pertenece a ese workspace.',
                        [
                            ['workspace_no_encontrado', 404, 'Workspace no encontrado'],
                            ['canal_no_encontrado', 404, 'Canal no encontrado']
                        ]
                    ),
                    500: INTERNAL_ERROR[500],
                    503: DATABASE_ERROR[503]
                }
            }
        }
    },

    components: {

        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Token devuelto por `POST /api/auth/login`. Formato del header: `Authorization: Bearer <auth_token>`'
            }
        },

        parameters: {
            WorkspaceId: {
                name: 'workspace_id',
                in: 'path',
                required: true,
                description: 'ObjectId de MongoDB del espacio de trabajo (24 caracteres hexadecimales).',
                schema: {
                    type: 'string',
                    pattern: '^[a-fA-F0-9]{24}$'
                },
                example: '6ab01f9a190ff6061955c88a'
            },
            UserId: {
                name: 'user_id',
                in: 'path',
                required: true,
                description: 'ObjectId de MongoDB del usuario (24 caracteres hexadecimales).',
                schema: {
                    type: 'string',
                    pattern: '^[a-fA-F0-9]{24}$'
                },
                example: '6aabff9a190ff6061955c889'
            },
            ChannelId: {
                name: 'channel_id',
                in: 'path',
                required: true,
                description: 'ObjectId de MongoDB del canal (24 caracteres hexadecimales). Debe pertenecer al workspace indicado.',
                schema: {
                    type: 'string',
                    pattern: '^[a-fA-F0-9]{24}$'
                },
                example: '6ab01f9a190ff6061955c8a1'
            },
            MemberId: {
                name: 'member_id',
                in: 'path',
                required: true,
                description: 'ObjectId de MongoDB de la membresía (24 caracteres hexadecimales). Debe pertenecer al workspace indicado.',
                schema: {
                    type: 'string',
                    pattern: '^[a-fA-F0-9]{24}$'
                },
                example: '6ab01f9a190ff6061955c890'
            }
        },

        schemas: {

            /* -------------------- Requests -------------------- */

            RegisterRequest: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                    username: {
                        type: 'string',
                        description: 'Nombre visible del usuario.',
                        example: 'maria'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'Debe tener formato de email y no estar registrado previamente.',
                        example: 'maria@mail.com'
                    },
                    password: {
                        type: 'string',
                        format: 'password',
                        description: 'Contraseña en texto plano. Se guarda encriptada con bcrypt. El registro no exige un mínimo de caracteres.',
                        example: 'pepe123'
                    },
                    descripcion: {
                        type: 'string',
                        maxLength: 160,
                        description: 'Descripción corta del perfil (bio). Opcional; se guarda con trim y vacía si no se envía.',
                        example: 'Backend developer en formación'
                    },
                    foto_perfil: {
                        $ref: '#/components/schemas/ProfilePhotoField'
                    }
                }
            },

            LoginRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'maria@mail.com'
                    },
                    password: {
                        type: 'string',
                        format: 'password',
                        example: 'pepe123'
                    }
                }
            },

            ForgotPasswordRequest: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'maria@mail.com'
                    }
                }
            },

            ResetPasswordRequest: {
                type: 'object',
                required: ['reset_token', 'new_password'],
                properties: {
                    reset_token: {
                        type: 'string',
                        description: 'Token JWT que llegó en el enlace del email de restablecimiento.',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                    new_password: {
                        type: 'string',
                        format: 'password',
                        minLength: 8,
                        description: 'Nueva contraseña. Debe tener al menos 8 caracteres.',
                        example: 'nuevaClave123'
                    }
                }
            },

            CreateWorkspaceRequest: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 30,
                        description: 'Nombre del workspace. Requerido por el schema de Mongoose.',
                        example: 'Equipo Backend'
                    },
                    description: {
                        type: 'string',
                        maxLength: 1000,
                        description: 'Descripción opcional del workspace.',
                        example: 'Canal de trabajo del equipo de backend'
                    },
                    logo: {
                        type: 'string',
                        description: [
                            'Logo opcional del workspace como data URL base64: `data:image/png;base64,<datos>`.',
                            'Tipos aceptados: PNG (`data:image/png`), JPG (`data:image/jpeg`) y WebP (`data:image/webp`).',
                            'Máximo ~200 KB una vez decodificados los datos base64. Sin logo, omitir el campo o enviar `null`.'
                        ].join('\n'),
                        example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
                    }
                }
            },

            UpdateWorkspaceRequest: {
                type: 'object',
                required: ['name'],
                description: [
                    '`name` es obligatorio; el controller responde `400` si falta.',
                    '',
                    '`description` es opcional: si no se envía se guarda como cadena vacía.',
                    '',
                    '`logo` es opcional: si se envía reemplaza el logo actual, con `null` se quita, y si no se envía se conserva.'
                ].join('\n'),
                properties: {
                    name: {
                        type: 'string',
                        maxLength: 30,
                        example: 'Equipo Backend UTN'
                    },
                    description: {
                        type: 'string',
                        maxLength: 1000,
                        description: 'Descripción opcional del espacio. Si no se envía, queda vacía.',
                        example: 'Nueva descripción del espacio'
                    },
                    logo: {
                        type: 'string',
                        nullable: true,
                        description: [
                            'Logo opcional como data URL base64 (`data:image/png|jpeg|webp;base64,...`, máx. ~200 KB decodificados).',
                            'Con `null` se elimina el logo actual; si se omite el campo, el logo se conserva.'
                        ].join('\n'),
                        example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
                    }
                }
            },

            ProfilePhotoField: {
                type: 'string',
                description: [
                    'Foto de perfil como data URL base64 (`data:image/png;base64,<datos>`).',
                    'Tipos aceptados: PNG (`data:image/png`), JPG (`data:image/jpeg`) y WebP (`data:image/webp`).',
                    'Máximo ~200 KB una vez decodificados los datos base64 (el frontend la recorta a 256x256 antes de enviarla).',
                    'Al registrarse, omitir el campo o enviar `null` significa sin foto.'
                ].join('\n'),
                example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
            },

            UpdateMeRequest: {
                type: 'object',
                required: ['name'],
                description: [
                    '`name` es obligatorio; el controller responde `400` si falta.',
                    '',
                    '`descripcion` es opcional (máx. 160 caracteres): si no se envía se conserva la actual, si se envía se reemplaza (trim incluido).',
                    '',
                    '`foto_perfil` es opcional con 3 estados: si se envía un data URL reemplaza la foto actual, con `null` se quita, y si se omite el campo se conserva.'
                ].join('\n'),
                properties: {
                    name: {
                        type: 'string',
                        maxLength: 60,
                        example: 'María García'
                    },
                    descripcion: {
                        type: 'string',
                        maxLength: 160,
                        description: 'Descripción corta del perfil (bio). Opcional: si no se envía se conserva la actual.',
                        example: 'Backend developer en formación'
                    },
                    foto_perfil: {
                        $ref: '#/components/schemas/ProfilePhotoField'
                    }
                }
            },

            UpdateMeResponse: {
                type: 'object',
                properties: {
                    ok: { type: 'boolean', example: true },
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Perfil actualizado correctamente' },
                    data: {
                        type: 'object',
                        properties: {
                            user_updated: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', example: '6aabff9a190ff6061955c889' },
                                    nombre: { type: 'string', example: 'María García' },
                                    email: { type: 'string', example: 'maria@mail.com' },
                                    foto_perfil: { type: 'string', nullable: true, example: null },
                                    descripcion: { type: 'string', example: 'Backend developer en formación' }
                                }
                            },
                            auth_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                        }
                    }
                }
            },

            GetMeResponse: {
                type: 'object',
                properties: {
                    ok: { type: 'boolean', example: true },
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Perfil obtenido correctamente' },
                    data: {
                        type: 'object',
                        properties: {
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', example: '6aabff9a190ff6061955c889' },
                                    nombre: { type: 'string', example: 'María García' },
                                    email: { type: 'string', example: 'maria@mail.com' },
                                    foto_perfil: { type: 'string', nullable: true, description: 'Data URL base64 de la foto de perfil, o `null` si no tiene.' },
                                    descripcion: { type: 'string', example: 'Backend developer en formación' }
                                }
                            }
                        }
                    }
                }
            },

            CreateChannelRequest: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 60,
                        description: 'Nombre del canal, sin el `#`. El controller devuelve `400` si falta o está vacío.',
                        example: 'anuncios'
                    },
                    description: {
                        type: 'string',
                        maxLength: 1000,
                        description: 'Descripción opcional del canal.',
                        example: 'Novedades del equipo'
                    },
                    categoria: {
                        type: 'string',
                        maxLength: 60,
                        description: 'Categoría opcional. Si no se envía, el canal queda sin categoría.',
                        example: 'Canales de texto'
                    }
                }
            },

            CreateChannelMessageRequest: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 30000,
                        description: 'Texto del mensaje. El controller devuelve `400` si falta o solo tiene espacios.',
                        example: '¡Hola equipo!'
                    }
                }
            },

            /* -------------------- Modelos -------------------- */

            User: {
                type: 'object',
                description: 'Documento de usuario tal como lo devuelve MongoDB. Incluye el hash de la contraseña porque los endpoints de usuarios no aplican un DTO de salida.',
                properties: {
                    _id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        example: '6aabff9a190ff6061955c889'
                    },
                    nombre: {
                        type: 'string',
                        example: 'maria'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'maria@mail.com'
                    },
                    password: {
                        type: 'string',
                        description: 'Hash bcrypt de la contraseña (nunca la contraseña original).',
                        example: '$2b$10$hash...'
                    },
                    fecha_creacion: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-09-17T14:56:26.249Z'
                    },
                    activo: {
                        type: 'boolean',
                        description: 'Si es `false` el usuario está desactivado de la plataforma.',
                        example: true
                    },
                    email_verificado: {
                        type: 'boolean',
                        description: 'Indica si el usuario ya usó el enlace de verificación.',
                        example: true
                    },
                    __v: {
                        type: 'integer',
                        description: 'Versión interna del documento en Mongoose.',
                        example: 0
                    }
                }
            },

            Workspace: {
                type: 'object',
                description: 'Documento del espacio de trabajo en MongoDB.',
                properties: {
                    _id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        example: '6ab01f9a190ff6061955c88a'
                    },
                    nombre: {
                        type: 'string',
                        maxLength: 30,
                        example: 'Equipo Backend'
                    },
                    description: {
                        type: 'string',
                        maxLength: 1000,
                        example: 'Canal de trabajo del equipo de backend'
                    },
                    logo: {
                        type: 'string',
                        nullable: true,
                        description: 'Logo del workspace como data URL base64. `null` cuando el workspace no tiene logo.',
                        example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
                    },
                    fecha_creacion: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-09-17T14:56:26.249Z'
                    },
                    __v: {
                        type: 'integer',
                        example: 0
                    }
                }
            },

            Channel: {
                type: 'object',
                description: 'Canal de un espacio de trabajo tal como lo devuelve la API (campos con prefijo `canal_`).',
                properties: {
                    canal_id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        example: '6ab01f9a190ff6061955c8a0'
                    },
                    canal_nombre: {
                        type: 'string',
                        maxLength: 60,
                        example: 'General'
                    },
                    canal_descripcion: {
                        type: 'string',
                        maxLength: 1000,
                        example: 'Canal general del espacio de trabajo'
                    },
                    categoria: {
                        type: 'string',
                        maxLength: 60,
                        nullable: true,
                        description: 'Categoría del canal. `null` cuando el canal no tiene categoría.',
                        example: null
                    },
                    fecha_creacion: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-09-17T14:56:26.249Z'
                    }
                }
            },

            ChannelMessage: {
                type: 'object',
                description: 'Mensaje de un canal tal como lo devuelve la API (campos con prefijo `mensaje_` y autor resuelto).',
                properties: {
                    mensaje_id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        example: '6ab01f9a190ff6061955c8b0'
                    },
                    contenido: {
                        type: 'string',
                        maxLength: 30000,
                        example: '¡Hola equipo!'
                    },
                    fecha_creacion: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-11-15T19:02:00.000Z'
                    },
                    autor: {
                        type: 'object',
                        required: ['member_id', 'nombre'],
                        properties: {
                            member_id: {
                                type: 'string',
                                pattern: '^[a-fA-F0-9]{24}$',
                                description: 'ObjectId de la membresía (Miembro) que envió el mensaje.',
                                example: '6ab01f9a190ff6061955c890'
                            },
                            nombre: {
                                type: 'string',
                                description: 'Nombre visible del usuario autor.',
                                example: 'maria'
                            }
                        }
                    }
                }
            },

            Member: {
                type: 'object',
                description: 'Documento de membresía (usuario dentro de un workspace). En la creación, el repositorio envía `active` en lugar de `activo`, por lo que Mongoose descarta ese campo y `activo` queda en su valor por defecto (`false`).',
                properties: {
                    _id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        example: '6ab01f9a190ff6061955c890'
                    },
                    fk_id_usuario: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        description: 'ObjectId del usuario miembro.',
                        example: '6aabff9a190ff6061955c889'
                    },
                    fk_id_espacio_trabajo: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        description: 'ObjectId del workspace.',
                        example: '6ab01f9a190ff6061955c88a'
                    },
                    rol: {
                        type: 'string',
                        enum: ['user', 'admin', 'owner'],
                        example: 'owner'
                    },
                    fecha_creacion: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-09-17T14:56:26.249Z'
                    },
                    activo: {
                        type: 'boolean',
                        example: false
                    },
                    __v: {
                        type: 'integer',
                        example: 0
                    }
                }
            },

            WorkspaceMembership: {
                type: 'object',
                description: 'Resumen de una membresía junto con los datos del workspace, usado en el listado de workspaces del usuario.',
                properties: {
                    member_id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        example: '6ab01f9a190ff6061955c890'
                    },
                    member_rol: {
                        type: 'string',
                        enum: ['user', 'admin', 'owner'],
                        example: 'owner'
                    },
                    workspace_id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        example: '6ab01f9a190ff6061955c88a'
                    },
                    workspace_nombre: {
                        type: 'string',
                        example: 'Equipo Backend'
                    },
                    workspace_descripcion: {
                        type: 'string',
                        description: 'Descripción del workspace. Puede no estar presente si el workspace no tiene descripción.',
                        example: 'Canal de trabajo del equipo de backend'
                    },
                    workspace_logo: {
                        type: 'string',
                        nullable: true,
                        description: 'Logo del workspace como data URL base64. `null` cuando el workspace no tiene logo (el frontend muestra su logo por defecto).',
                        example: null
                    },
                    workspace_fecha_creacion: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-09-17T14:56:26.249Z'
                    }
                }
            },

            WorkspaceMember: {
                type: 'object',
                description: 'Membresía con los datos públicos del usuario, usada en el detalle del workspace y en el listado de miembros.',
                properties: {
                    member_id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        example: '6ab01f9a190ff6061955c890'
                    },
                    member_rol: {
                        type: 'string',
                        enum: ['user', 'admin', 'owner'],
                        example: 'owner'
                    },
                    fecha_creacion: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-09-17T14:56:26.249Z'
                    },
                    usuario: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                pattern: '^[a-fA-F0-9]{24}$',
                                example: '6aabff9a190ff6061955c889'
                            },
                            nombre: {
                                type: 'string',
                                example: 'maria'
                            },
                            email: {
                                type: 'string',
                                format: 'email',
                                example: 'maria@mail.com'
                            }
                        }
                    }
                }
            },

            /* -------------------- Responses -------------------- */

            ErrorResponse: {
                type: 'object',
                required: ['ok', 'status', 'message'],
                description: 'Envoltura estándar de errores de la API.',
                properties: {
                    ok: {
                        type: 'boolean',
                        enum: [false],
                        example: false
                    },
                    status: {
                        type: 'integer',
                        description: 'Código HTTP repetido en el body.',
                        example: 400
                    },
                    message: {
                        type: 'string',
                        description: 'Descripción legible del error.',
                        example: 'Email is incorrect'
                    }
                }
            },

            ServiceUnavailableResponse: {
                type: 'object',
                required: ['message'],
                description: 'Respuesta del middleware de conexión a MongoDB. A diferencia del resto de los errores, no incluye `ok` ni `status`.',
                properties: {
                    message: {
                        type: 'string',
                        example: 'No se pudo conectar a la base de datos'
                    }
                }
            },

            SuccessfulMessageResponse: {
                type: 'object',
                required: ['ok', 'status', 'message'],
                description: 'Respuesta exitosa que solo comunica un mensaje, sin datos adicionales.',
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Operación realizada correctamente'
                    }
                }
            },

            LoginResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'You have logged in successfully'
                    },
                    data: {
                        type: 'object',
                        required: ['auth_token'],
                        properties: {
                            auth_token: {
                                type: 'string',
                                description: 'JWT firmado con la información de sesión del usuario.',
                                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                            }
                        }
                    }
                }
            },

            VerifyEmailResponse: {
                type: 'object',
                required: ['ok', 'status', 'message'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Usuario verificado exitosamente'
                    },
                    data: {
                        type: 'object',
                        description: 'Solo está presente cuando el email ya estaba verificado.',
                        properties: {
                            already_verified: {
                                type: 'boolean',
                                example: true
                            }
                        }
                    }
                }
            },

            GetUsersResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Get users list'
                    },
                    data: {
                        type: 'object',
                        required: ['users'],
                        properties: {
                            users: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/User' }
                            }
                        }
                    }
                }
            },

            GetUserResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Get user details successfully'
                    },
                    data: {
                        type: 'object',
                        required: ['user'],
                        properties: {
                            user: { $ref: '#/components/schemas/User' }
                        }
                    }
                }
            },

            GetWorkspacesResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Obtenidos todos los datos'
                    },
                    data: {
                        type: 'object',
                        required: ['workspaces'],
                        properties: {
                            workspaces: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/WorkspaceMembership' }
                            }
                        }
                    }
                }
            },

            CreateWorkspaceResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 201
                    },
                    message: {
                        type: 'string',
                        example: 'Workspace creado'
                    },
                    data: {
                        type: 'object',
                        required: ['workspace_created', 'owner_membership', 'default_channel'],
                        properties: {
                            workspace_created: { $ref: '#/components/schemas/Workspace' },
                            owner_membership: { $ref: '#/components/schemas/Member' },
                            default_channel: {
                                allOf: [
                                    { $ref: '#/components/schemas/Channel' }
                                ],
                                description: 'Canal `General` que se crea automáticamente con el espacio de trabajo.'
                            }
                        }
                    }
                }
            },

            GetChannelsResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Canales obtenidos correctamente'
                    },
                    data: {
                        type: 'object',
                        required: ['channels'],
                        properties: {
                            channels: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Channel' }
                            }
                        }
                    }
                }
            },

            CreateChannelResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 201
                    },
                    message: {
                        type: 'string',
                        example: 'Canal creado'
                    },
                    data: {
                        type: 'object',
                        required: ['channel_created'],
                        properties: {
                            channel_created: { $ref: '#/components/schemas/Channel' }
                        }
                    }
                }
            },

            DeleteChannelResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Canal eliminado correctamente'
                    },
                    data: {
                        type: 'object',
                        required: ['channel_deleted'],
                        properties: {
                            channel_deleted: { $ref: '#/components/schemas/Channel' }
                        }
                    }
                }
            },

            GetChannelMessagesResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Mensajes obtenidos correctamente'
                    },
                    data: {
                        type: 'object',
                        required: ['messages'],
                        properties: {
                            messages: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/ChannelMessage' }
                            }
                        }
                    }
                }
            },

            CreateChannelMessageResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 201
                    },
                    message: {
                        type: 'string',
                        example: 'Mensaje creado'
                    },
                    data: {
                        type: 'object',
                        required: ['message_created'],
                        properties: {
                            message_created: { $ref: '#/components/schemas/ChannelMessage' }
                        }
                    }
                }
            },

            GetWorkspaceResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Workspace obtenido correctamente'
                    },
                    data: {
                        type: 'object',
                        required: ['workspace_selected', 'members'],
                        properties: {
                            workspace_selected: { $ref: '#/components/schemas/Workspace' },
                            members: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/WorkspaceMember' }
                            }
                        }
                    }
                }
            },

            DeleteWorkspaceResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Workspace eliminado correctamente'
                    },
                    data: {
                        type: 'object',
                        required: ['workspace_deleted'],
                        properties: {
                            workspace_deleted: { $ref: '#/components/schemas/Workspace' }
                        }
                    }
                }
            },

            UpdateWorkspaceResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Workspace actualizado correctamente'
                    },
                    data: {
                        type: 'object',
                        description: 'En la implementación actual llega vacío porque el repositorio no retorna el documento actualizado. El campo `workspace_updated` está contemplado pero hoy no se envía.',
                        properties: {
                            workspace_updated: { $ref: '#/components/schemas/Workspace' }
                        }
                    }
                }
            },

            GetWorkspaceMembersResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Miembros obtenidos correctamente'
                    },
                    data: {
                        type: 'object',
                        required: ['members'],
                        properties: {
                            members: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/WorkspaceMember' }
                            }
                        }
                    }
                }
            },

            DeleteWorkspaceMemberResponse: {
                type: 'object',
                required: ['ok', 'status', 'message', 'data'],
                properties: {
                    ok: {
                        type: 'boolean',
                        example: true
                    },
                    status: {
                        type: 'integer',
                        example: 200
                    },
                    message: {
                        type: 'string',
                        example: 'Miembro eliminado correctamente'
                    },
                    data: {
                        type: 'object',
                        required: ['member_deleted'],
                        properties: {
                            member_deleted: {
                                type: 'object',
                                required: ['member_id', 'member_rol', 'usuario_id'],
                                properties: {
                                    member_id: {
                                        type: 'string',
                                        description: 'ObjectId de la membresía eliminada.',
                                        example: '6ab01f9a190ff6061955c890'
                                    },
                                    member_rol: {
                                        type: 'string',
                                        enum: ['user', 'admin', 'owner'],
                                        example: 'user'
                                    },
                                    usuario_id: {
                                        type: 'string',
                                        description: 'ObjectId del usuario cuya membresía se eliminó.',
                                        example: '6aabff9a190ff6061955c889'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

export default openapi_document
