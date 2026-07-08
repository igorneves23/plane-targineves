import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-2xl font-bold text-tx1">Plane</span>
        </div>

        <div className="bg-bg1 border border-bdr/10 rounded-2xl p-8">
          {!token ? (
            <>
              <h1 className="text-xl font-bold text-tx1 mb-1">Link inválido</h1>
              <p className="text-tx3 text-sm mb-6">
                Este link de redefinição de senha está incompleto. Solicite um novo link.
              </p>
              <Link to="/forgot-password" className="text-brand-400 text-sm hover:underline">
                Solicitar novo link
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="text-xl font-bold text-tx1 mb-1">Senha redefinida</h1>
              <p className="text-tx3 text-sm">Redirecionando para o login...</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-tx1 mb-1">Criar nova senha</h1>
              <p className="text-tx3 text-sm mb-6">Escolha uma nova senha para sua conta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nova senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  autoFocus
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />

                {error && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full justify-center" loading={loading}>
                  Redefinir senha
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
