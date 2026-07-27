import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao fazer login')
    }
  }

  return (
    <div className="relative min-h-screen bg-bg0 flex items-center justify-center p-4 overflow-hidden">
      {/* Brilho de fundo — dá profundidade à tela sem competir com o formulário */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[38rem] h-[38rem] rounded-full blur-3xl
                   bg-brand-500/20 dark:bg-brand-500/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-32 w-[30rem] h-[30rem] rounded-full blur-3xl
                   bg-brand-400/10 dark:bg-brand-400/[0.07]"
      />

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-2xl font-bold text-tx1">Plane</span>
        </div>

        <div className="bg-bg1/90 backdrop-blur-sm border border-bdr/10 rounded-2xl p-8 shadow-2xl shadow-black/20">
          <h1 className="text-xl font-bold text-tx1 mb-1">Bem-vindo de volta</h1>
          <p className="text-tx3 text-sm mb-6">Entre com sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
            <div>
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Link
                to="/forgot-password"
                className="inline-block mt-1.5 text-xs text-brand-400 hover:underline"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg animate-slide-up">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full justify-center" loading={loading}>
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
