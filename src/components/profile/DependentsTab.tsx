import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Users, Plus, Phone, User, Loader2, Edit } from 'lucide-react';
import { DependentsService, type Dependent } from '@/services/dependentsService';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const DependentsTab = () => {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  
  // Form fields
  const [depName, setDepName] = useState('');
  const [countryCode, setCountryCode] = useState('55');
  const [phone, setPhone] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchDependents();
  }, []);

  const fetchDependents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        const deps = await DependentsService.getDependents(session.user.id);
        setDependents(deps);
      }
    } catch (error) {
      console.error('Error fetching dependents:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dependentes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDepName('');
    setCountryCode('55');
    setPhone('');
  };

  const countries = [
    { code: '55', name: 'Brasil', flag: '🇧🇷', placeholder: '(11) 99999-9999', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 2) return num;
      if (num.length <= 6) return `(${num.slice(0, 2)}) ${num.slice(2)}`;
      if (num.length === 10) return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6, 10)}`;
      return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7, 11)}`;
    }},
    { code: '1', name: 'Estados Unidos', flag: '🇺🇸', placeholder: '(555) 555-5555', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`;
      return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6, 10)}`;
    }},
    { code: '351', name: 'Portugal', flag: '🇵🇹', placeholder: '912 345 678', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `${num.slice(0, 3)} ${num.slice(3)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6, 9)}`;
    }},
    { code: '34', name: 'Espanha', flag: '🇪🇸', placeholder: '612 34 56 78', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 5) return `${num.slice(0, 3)} ${num.slice(3)}`;
      if (num.length <= 7) return `${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7, 9)}`;
    }},
    { code: '44', name: 'Reino Unido', flag: '🇬🇧', placeholder: '7400 123456', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 4) return num;
      return `${num.slice(0, 4)} ${num.slice(4, 10)}`;
    }},
    { code: '49', name: 'Alemanha', flag: '🇩🇪', placeholder: '151 12345678', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      return `${num.slice(0, 3)} ${num.slice(3, 11)}`;
    }},
    { code: '33', name: 'França', flag: '🇫🇷', placeholder: '6 12 34 56 78', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 1) return num;
      if (num.length <= 3) return `${num.slice(0, 1)} ${num.slice(1)}`;
      if (num.length <= 5) return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3)}`;
      if (num.length <= 7) return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
      return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7, 9)}`;
    }},
    { code: '39', name: 'Itália', flag: '🇮🇹', placeholder: '312 345 6789', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `${num.slice(0, 3)} ${num.slice(3)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6, 10)}`;
    }},
    { code: '81', name: 'Japão', flag: '🇯🇵', placeholder: '90-1234-5678', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 2) return num;
      if (num.length <= 6) return `${num.slice(0, 2)}-${num.slice(2)}`;
      return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
    }},
    { code: '86', name: 'China', flag: '🇨🇳', placeholder: '138 0013 8000', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 7) return `${num.slice(0, 3)} ${num.slice(3)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 7)} ${num.slice(7, 11)}`;
    }},
  ];

  const formatPhone = (value: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? country.format(value) : value.replace(/\D/g, '');
  };

  const getPlaceholder = () => {
    const country = countries.find(c => c.code === countryCode);
    return country?.placeholder || 'Número de telefone';
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!depName.trim() || !phone.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e telefone são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        const fullPhone = `${countryCode}${phone}`;
        await DependentsService.addDependent(session.user.id, depName, fullPhone);
        
        toast({
          title: 'Sucesso',
          description: 'Dependente adicionado com sucesso',
        });
        
        resetForm();
        setIsAddDialogOpen(false);
        fetchDependents();
      }
    } catch (error) {
      console.error('Error adding dependent:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar dependente',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDependent = (dependent: Dependent) => {
    setEditingDependent(dependent);
    setDepName(dependent.dep_name || '');
    
    // Extrair código do país do telefone
    const phoneStr = dependent.dep_phone || '';
    const brazilMatch = phoneStr.match(/^55(\d+)$/);
    const usMatch = phoneStr.match(/^1(\d+)$/);
    
    if (brazilMatch) {
      setCountryCode('55');
      setPhone(brazilMatch[1]);
    } else if (usMatch) {
      setCountryCode('1');
      setPhone(usMatch[1]);
    } else {
      // Tentar outros códigos
      const match = phoneStr.match(/^(\d{1,3})(\d+)$/);
      if (match) {
        setCountryCode(match[1]);
        setPhone(match[2]);
      } else {
        setCountryCode('55');
        setPhone(phoneStr);
      }
    }
    
    setIsEditDialogOpen(true);
  };

  const handleUpdateDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDependent?.id || !depName.trim() || !phone.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e telefone são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const fullPhone = `${countryCode}${phone}`;
      await DependentsService.updateDependent(editingDependent, depName, fullPhone);
      
      toast({
        title: 'Sucesso',
        description: 'Dependente atualizado com sucesso',
      });
      
      resetForm();
      setIsEditDialogOpen(false);
      setEditingDependent(null);
      fetchDependents();
    } catch (error) {
      console.error('Error updating dependent:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar dependente',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDependent = async (dep: Dependent) => {
    try {
      await DependentsService.deleteDependent(dep);
      
      toast({
        title: 'Sucesso',
        description: 'Dependente removido com sucesso',
      });
      
      fetchDependents();
    } catch (error) {
      console.error('Error deleting dependent:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover dependente',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Users className="h-5 w-5" />
            Dependentes
          </CardTitle>
          <CardDescription className="text-xs">
            Gerencie seus dependentes <br />
            ({dependents.length} cadastrado{dependents.length !== 1 ? 's' : ''})
          </CardDescription>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Dependente</DialogTitle>
              <DialogDescription>
                Adicione um novo dependente ao seu cadastro
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddDependent} className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="dep-name" className="font-medium">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="dep-name"
                    value={depName}
                    onChange={(e) => setDepName(e.target.value)}
                    placeholder="Nome completo do dependente"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="dep-phone" className="font-medium">Telefone</label>
                <div className="flex gap-2">
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-48 justify-between"
                      >
                        {countries.find(c => c.code === countryCode)?.flag} {countries.find(c => c.code === countryCode)?.name}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0 z-50 border bg-popover text-popover-foreground shadow-md">
                      <Command>
                        <CommandInput placeholder="Buscar país..." />
                        <CommandList className="max-h-64 overflow-y-auto">
                          <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                          <CommandGroup>
                            {countries.map((country) => (
                              <CommandItem
                                key={country.code}
                                value={country.name}
                                onSelect={() => {
                                  setCountryCode(country.code);
                                  setCountryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    countryCode === country.code ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {country.flag} {country.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="dep-phone"
                      value={formatPhone(phone)}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder={getPlaceholder()}
                      className="pl-10"
                      type="tel"
                      required
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Digite o número com DDD (será formatado automaticamente)
                </p>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingDependent(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Dependente</DialogTitle>
              <DialogDescription>
                Edite as informações do dependente
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdateDependent} className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="edit-dep-name" className="font-medium">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="edit-dep-name"
                    value={depName}
                    onChange={(e) => setDepName(e.target.value)}
                    placeholder="Nome completo do dependente"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="edit-dep-phone" className="font-medium">Telefone</label>
                <div className="flex gap-2">
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-48 justify-between"
                      >
                        {countries.find(c => c.code === countryCode)?.flag} {countries.find(c => c.code === countryCode)?.name}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0 z-50 border bg-popover text-popover-foreground shadow-md">
                      <Command>
                        <CommandInput placeholder="Buscar país..." />
                        <CommandList className="max-h-64 overflow-y-auto">
                          <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                          <CommandGroup>
                            {countries.map((country) => (
                              <CommandItem
                                key={country.code}
                                value={country.name}
                                onSelect={() => {
                                  setCountryCode(country.code);
                                  setCountryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    countryCode === country.code ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {country.flag} {country.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="edit-dep-phone"
                      value={formatPhone(phone)}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder={getPlaceholder()}
                      className="pl-10"
                      type="tel"
                      required
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Digite o número com DDD (será formatado automaticamente)
                </p>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {dependents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dependente cadastrado</p>
            <p className="text-sm">Clique em "Adicionar Dependente" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dependents.map((dependent) => (
              <div
                key={`${dependent.id}-${dependent.dep_name}-${dependent.dep_phone}`}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {dependent.dep_name?.[0]?.toUpperCase() || 'D'}
                  </div>
                  <div>
                    <h4 className="font-medium">{dependent.dep_name}</h4>
                    <p className="text-sm text-muted-foreground">{dependent.dep_phone}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditDependent(dependent)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDependent(dependent)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DependentsTab;