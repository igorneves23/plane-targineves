import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, X, Shield, Users as UsersIcon, Pencil } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { userService, UserWithDate } from '../services/user.service'
import { UserRole } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  LEADER: 'Líder',
  MEMBER: 'Membro',
}

const ROLE_COLOR: Record<UserRole, string> = {
  ADMIN: 'text-purple-400 bg-purple-500/10',
  LEADER: 'text-blue-400 bg-blue-500/10',
  MEMBER: 'text-tx2 bg-bdr/5',
}

export default function Users() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserWithDate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithDate | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MEMBER' as UserRole })
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: 'MEMBER' as UserRole })

  useEffect(() => {
    // user === null enquanto o /auth/me ainda não respondeu — só decide
    // expulsar depois que o usuário carregou.
    if (!user) return
    if (user.role !== 'ADMIN') {
      navigate('/dashboard')
      return
    }
    load()
  }, [user])

  async function load() {
    setLoading(true)
    try {
      setUsers(await userService.list())
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const created = await userService.create(form)
      setUsers((prev) => [...prev, created])
      setForm({ name: '', email: '', password: '', role: 'MEMBER' })
      setShowForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar usuário')
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(u: UserWithDate) {
    setEditingUser(u)
    setEditForm({ name: u.name, email: u.email, password: '', role: u.role })
    setError('')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setError('')
    setSubmitting(true)
    try {
      const payload: any = { name: editForm.name, email: editForm.email, role: editForm.role }
      if (editForm.password) payload.password = editForm.password
      const updated = await userService.update(editingUser.id, payload)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setEditingUser(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atualizar usuário')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover o usuário "${name}"?`)) return
    try {
      await userService.delete(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao remover usuário')
    }
  }

  return (
    <div className="flex h-screen bg-bg0 text-tx1 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Usuários" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-tx1 mb-1">Gerenciar Usuários</h2>
                <p className="text-tx2 text-sm">Crie e gerencie os acessos da equipe</p>
              </div>
              <Button onClick={() => setShowForm(true)} className="shrink-0 whitespace-nowrap self-start sm:self-auto">
                <Plus className="w-4 h-4 mr-2" />
                Novo usuário
              </Button>
            </div>

            {/* Formulário de criação */}
            {showForm && (
              <div className="bg-bg1 border border-bdr/10 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-tx1">Criar novo usuário</h3>
                  <button onClick={() => { setShowForm(false); setError('') }} className="text-tx3 hover:text-tx1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nome completo"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nome do usuário"
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Senha"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                    <div>
                      <label className="block text-sm font-medium text-tx2 mb-1.5">Função</label>
                      <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                        className="w-full px-3 py-2.5 bg-bg2 border border-bdr/10 rounded-lg text-tx1 text-sm focus:outline-none focus:border-brand-500"
                      >
                        <option value="MEMBER">Membro</option>
                        <option value="LEADER">Líder</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                  </div>
                  {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                  )}
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setError('') }}>
                      Cancelar
                    </Button>
                    <Button type="submit" loading={submitting}>
                      Criar usuário
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal de edição */}
            {editingUser && (
              <div className="bg-bg1 border border-bdr/10 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-tx1">Editar — {editingUser.name}</h3>
                  <button onClick={() => setEditingUser(null)} className="text-tx3 hover:text-tx1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nome completo"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nova senha (deixe em branco para não alterar)"
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      minLength={editForm.password ? 6 : undefined}
                    />
                    <div>
                      <label className="block text-sm font-medium text-tx2 mb-1.5">Função</label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                        className="w-full px-3 py-2.5 bg-bg2 border border-bdr/10 rounded-lg text-tx1 text-sm focus:outline-none focus:border-brand-500"
                      >
                        <option value="MEMBER">Membro</option>
                        <option value="LEADER">Líder</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                  </div>
                  {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                  )}
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit" loading={submitting}>
                      Salvar alterações
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de usuários */}
            <div className="bg-bg1 border border-bdr/10 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-bg2 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-tx3">
                  <UsersIcon className="w-10 h-10 mb-3 opacity-30" />
                  <p>Nenhum usuário encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-bdr/5 text-xs text-tx3 uppercase tracking-wider">
                        <th className="text-left px-5 py-3 font-medium">Usuário</th>
                        <th className="text-left px-5 py-3 font-medium">Função</th>
                        <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Criado em</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bdr/5">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-bdr/[0.02] transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.name} src={u.avatar} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-tx1">{u.name}</p>
                                <p className="text-xs text-tx3">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLOR[u.role]}`}>
                              {u.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                              {ROLE_LABEL[u.role]}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-tx3 hidden sm:table-cell">
                            {format(new Date(u.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(u)}
                                className="p-1.5 text-tx3 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {u.id !== user?.id && (
                                <button
                                  onClick={() => handleDelete(u.id, u.name)}
                                  className="p-1.5 text-tx3 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
