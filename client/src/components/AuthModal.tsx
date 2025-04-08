import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AuthForm } from '@/lib/types';
import { login, register, saveUser } from '@/lib/auth';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState<AuthForm>({
    name: '',
    password: '',
    requestAdmin: false,
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setAuthForm({
      name: '',
      password: '',
      requestAdmin: false,
    });
    setAuthError(null);
  };

  const handleAuth = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);

      if (mode === 'login') {
        const user = await login(authForm);
        saveUser(user);
        toast({
          title: 'Successfully logged in',
          description: `Welcome back, ${user.name}!`,
        });
      } else {
        const user = await register(authForm);
        saveUser(user);
        toast({
          title: 'Registration successful',
          description: `Welcome, ${user.name}!`,
        });
      }

      // Wait a moment for localStorage and state to update
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 100);
    } catch (error) {
      console.error('Authentication error:', error);
      
      if (error instanceof Response) {
        try {
          const data = await error.json();
          setAuthError(data.message || 'Authentication failed');
        } catch (e) {
          setAuthError(`Error ${error.status}: ${error.statusText}`);
        }
      } else if (error instanceof Error) {
        setAuthError(error.message || 'An unexpected error occurred');
      } else {
        setAuthError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Log In' : 'Register'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={authForm.name}
              onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
              placeholder="Enter your name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              placeholder="Enter the event password"
              required
            />
            <p className="text-sm text-muted-foreground">
              {mode === 'login' 
                ? 'Use the predefined event password.'
                : 'Enter the predefined password for this event.'}
            </p>
          </div>
          
          {mode === 'register' && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="admin"
                checked={authForm.requestAdmin}
                onCheckedChange={(checked) => 
                  setAuthForm({ ...authForm, requestAdmin: Boolean(checked) })
                }
              />
              <Label htmlFor="admin" className="text-sm font-normal">
                Register as Admin
              </Label>
            </div>
          )}
          
          {authError && <p className="text-sm font-medium text-destructive">{authError}</p>}
          
          <div className="flex justify-end">
            <Button onClick={handleAuth} disabled={isLoading}>
              {mode === 'login' ? 'Log In' : 'Register'}
            </Button>
          </div>
          
          <div className="text-center text-sm">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <Button variant="link" className="p-0" onClick={toggleMode}>
                  Register
                </Button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <Button variant="link" className="p-0" onClick={toggleMode}>
                  Log In
                </Button>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
