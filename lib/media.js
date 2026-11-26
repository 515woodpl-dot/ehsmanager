// Photos uploaded from the app (session types for the booking page). They are
// stored on the server's disk outside the code folder, so deploys never touch
// them. Set MEDIA_DIR to move them; back this folder up with the database.
import path from 'path'

export const MEDIA_DIR = process.env.MEDIA_DIR || '/var/www/ehs-media'
export const MEDIA_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/
export const MEDIA_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
export const mediaPath = name => path.join(MEDIA_DIR, name)
