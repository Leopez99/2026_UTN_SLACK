/*
Agrupa los canales por categoria para el sidebar.
Los canales sin categoria van a un grupo con grupo_nombre null, que el
sidebar dibuja sin encabezado.
*/

export function groupChannelsByCategory(channels = []) {
  const groups = []
  const groups_by_key = new Map()

  channels.forEach((channel) => {
    const category_name = (channel.categoria || '').trim()
    const group_key = category_name.toLowerCase()

    let group = groups_by_key.get(group_key)

    if (!group) {
      group = {
        grupo_id: group_key || 'sin-categoria',
        grupo_nombre: category_name || null,
        canales: []
      }

      groups_by_key.set(group_key, group)
      groups.push(group)
    }

    group.canales.push(channel)
  })

  return groups
}

export function findDefaultChannel(channels = []) {
  return channels.find(
    (channel) => (channel.canal_nombre || '').toLowerCase() === 'general'
  ) ?? channels[0] ?? null
}
