import { pool } from '../config/db.js'

// Menentukan data milik tim mana yang boleh dibaca request ini.
//   - Owner/admin boleh memakai ?team=all (semua tim) atau ?team=<id tim>.
//   - Selain itu (atau tanpa ?team=) hanya tim milik user sendiri.
// Mengembalikan array id tim, atau null kalau id tim yang diminta tidak ada.
// Dipakai di SQL sebagai `team_id = ANY($1::uuid[])`.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function resolveTeamIds(req) {
  const own = [req.user.teamId]
  const wanted = typeof req.query.team === 'string' ? req.query.team.trim() : ''
  const privileged = req.user.role === 'owner' || req.user.role === 'admin'
  if (!wanted || !privileged) return own
  if (wanted === 'all') {
    const res = await pool.query('SELECT id FROM teams')
    return res.rows.map((r) => r.id)
  }
  if (!UUID.test(wanted)) return null
  const res = await pool.query('SELECT id FROM teams WHERE id = $1', [wanted])
  return res.rows.length ? [wanted] : null
}

// true kalau scope-nya persis tim milik user sendiri (boleh memakai cache per tim)
export const isOwnScope = (req, teamIds) => teamIds.length === 1 && teamIds[0] === req.user.teamId
