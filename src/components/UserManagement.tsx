import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../../types';
import { showError, showSuccess, showLoading, dismissToast } from '../utils/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import { Input } from '../../components/Input'; // Using existing Input component
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Pencil, Trash2 } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    investor_profile: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      showError('Erro ao carregar usuários.');
    } else {
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  };

  const handleEditClick = (user: UserProfile) => {
    setCurrentUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      role: user.role,
      investor_profile: user.investor_profile || 'null_profile', // Mapeia null para 'null_profile'
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (user: UserProfile) => {
    setCurrentUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = async () => {
    if (!currentUser) return;

    const toastId = showLoading('Salvando usuário...');
    try {
      const investorProfileToSave = editForm.investor_profile === 'null_profile' ? null : editForm.investor_profile;

      // Objeto para atualização do perfil
      const profileUpdateData: Partial<UserProfile> = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        role: editForm.role as 'user' | 'admin',
        investor_profile: investorProfileToSave as 'Conservador' | 'Moderado' | 'Agressivo' | null,
      };

      // Se o email foi alterado, atualiza na tabela auth.users e no perfil
      if (editForm.email !== currentUser.email) {
        throw new Error('Alteração de email de autenticação não é suportada no client. Implemente via Edge Function/servidor com Service Role Key.');
      }

      // Atualiza a tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      showSuccess('Usuário atualizado com sucesso!');
      fetchUsers(); // Refresh the list
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      showError('Erro ao atualizar usuário: ' + error.message);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser) return;

    const toastId = showLoading('Excluindo usuário...');
    try {
      // First, delete the user from auth.users, which should cascade to profiles
      throw new Error('Exclusão de usuário não é suportada no client. Implemente via Edge Function/servidor com Service Role Key.');

      showSuccess('Usuário excluído com sucesso!');
      fetchUsers(); // Refresh the list
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showError('Erro ao excluir usuário: ' + error.message);
    } finally {
      dismissToast(toastId);
    }
  };

  if (loading) {
    // Avoid rendering a spinner while loading.
    return <div className="min-h-[200px]" />;
  }

  return (
    <div className="p-6 bg-background rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Gerenciamento de Usuários</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Perfil Investidor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.first_name} {user.last_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.investor_profile || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)} className="mr-2">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(user)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Faça alterações no perfil do usuário aqui. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first_name" className="text-right">
                Primeiro Nome
              </Label>
              <Input
                id="first_name"
                name="first_name"
                value={editForm.first_name}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="last_name" className="text-right">
                Sobrenome
              </Label>
              <Input
                id="last_name"
                name="last_name"
                value={editForm.last_name}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                value={editForm.email}
                onChange={handleEditFormChange} // Habilitado para edição
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Papel
              </Label>
              <Select value={editForm.role} onValueChange={(value) => handleSelectChange('role', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="investor_profile" className="text-right">
                Perfil Investidor
              </Label>
              <Select value={editForm.investor_profile} onValueChange={(value) => handleSelectChange('investor_profile', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conservador">Conservador</SelectItem>
                  <SelectItem value="Moderado">Moderado</SelectItem>
                  <SelectItem value="Agressivo">Agressivo</SelectItem>
                  <SelectItem value="null_profile">N/A</SelectItem> {/* Valor alterado para 'null_profile' */}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <span className="font-bold">{currentUser?.email}</span>? Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;