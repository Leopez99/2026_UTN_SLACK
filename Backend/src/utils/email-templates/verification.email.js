/*
Plantillas de emails del proyecto.

Cada archivo de esta carpeta exporta las funciones que arman el contenido de un email.

IMPORTANTE: los clientes de correo (Gmail, Outlook) NO respetan clases CSS ni hojas externas,
todo el estilo debe ir inline y el layout se arma con tablas.
*/

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

export function buildVerificationEmailHtml(username, verification_url) {
    const safe_username = escapeHtml(username)

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica tu cuenta</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f5f9;">
    <span style="display: none; font-size: 1px; color: #f6f5f9;">
        Confirmamos tu registro: activa tu cuenta en un solo click. El enlace es valido por 7 dias.
    </span>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f5f9; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
                    <!-- Encabezado: marca -->
                    <tr>
                        <td align="center" style="padding: 8px 0 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" valign="middle" width="36" height="36" style="width: 36px; height: 36px; background-color: #4a154b; border-radius: 10px; font-family: Arial, Helvetica, sans-serif; font-size: 17px; font-weight: bold; color: #ffffff;">
                                        S
                                    </td>
                                    <td style="padding-left: 10px; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; letter-spacing: -0.3px; color: #4a154b;">
                                        Slack
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Tarjeta principal -->
                    <tr>
                        <td style="background-color: #ffffff; border: 1px solid #e8e6ee; border-radius: 14px; padding: 40px 40px 32px;">
                            <h1 style="margin: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; letter-spacing: -0.5px; color: #1d1c1d; text-align: center;">
                                Verific&aacute; tu correo electr&oacute;nico
                            </h1>
                            <p style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #616061; text-align: center;">
                                Hola ${safe_username}, gracias por registrarte.
                            </p>
                            <p style="margin: 0 0 28px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #616061; text-align: center;">
                                Para activar tu cuenta y empezar a conversar con tu equipo, confirm&aacute; que este correo es tuyo.
                            </p>

                            <!-- Boton de accion -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${verification_url}"
                                           style="display: inline-block; padding: 14px 32px; background-color: #4a154b; border-radius: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none;">
                                            Verificar mi cuenta
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color: #616061; text-align: center;">
                                Este enlace es v&aacute;lido por <strong style="color: #1d1c1d;">7 d&iacute;as</strong>.
                            </p>

                            <!-- Separador -->
                            <div style="height: 1px; background-color: #e8e6ee; margin: 28px 0;"></div>

                            <!-- Alternativa si el boton no funciona -->
                            <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color: #616061; text-align: center;">
                                Si el bot&oacute;n no funciona, copi&aacute; y peg&aacute; este enlace en tu navegador:
                            </p>
                            <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: #4a154b; text-align: center; word-break: break-all;">
                                <a href="${verification_url}" style="color: #4a154b; text-decoration: underline;">
                                    ${verification_url}
                                </a>
                            </p>
                        </td>
                    </tr>

                    <!-- Aviso de seguridad -->
                    <tr>
                        <td align="center" style="padding: 20px 16px 0;">
                            <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color: #616061;">
                                Si no creaste esta cuenta, pod&eacute;s ignorar este mensaje: ning&uacute;n dato fue compartido.
                            </p>
                        </td>
                    </tr>

                    <!-- Pie -->
                    <tr>
                        <td align="center" style="padding: 16px 16px 8px;">
                            <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: #c0bcc6;">
                                Este correo fue enviado autom&aacute;ticamente, no respondas a esta direcci&oacute;n.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
}

export function buildVerificationEmailText(username, verification_url) {
    return [
        `Hola ${username}, gracias por registrarte.`,
        '',
        'Para activar tu cuenta confirmá tu correo electrónico en este enlace:',
        verification_url,
        '',
        'El enlace es válido por 7 días.',
        'Si no creaste esta cuenta, podés ignorar este mensaje.'
    ].join('\n')
}
