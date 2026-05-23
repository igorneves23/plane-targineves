import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'change_me'

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, SECRET) as jwt.JwtPayload
}
