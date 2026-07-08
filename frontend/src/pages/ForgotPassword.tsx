import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { authService } from '../services/auth.service'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao solicitar redefinição de senha')
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
          {sent ? (
            <>
              <h1 className="text-xl font-bold text-tx1 mb-1">Verifique seu email</h1>
              <p className="text-tx3 text-sm mb-6">
                Se <span className="text-tx1">{email}</span> estiver cadastrado, você receberá um link para redefinir
                sua senha em instantes.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-tx1 mb-1">Esqueceu sua senha?</h1>
              <p className="text-tx3 text-sm mb-6">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />

                {error && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full justify-center" loading={loading}>
                  Enviar link de redefinição
                </Button>
              </form>
            </>
          )}

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm text-tx3 hover:text-tx1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
