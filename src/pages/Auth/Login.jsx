import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const signIn = useAuthStore(state => state.signIn);
  const signOut = useAuthStore(state => state.signOut);
  const fetchProfile = useAuthStore(state => state.fetchProfile);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('Password reset link has been sent to your email.');
      } else {
        const data = await signIn(email, password);
      
      if (data?.user) {
        await fetchProfile(data.user);
        const profile = useAuthStore.getState().profile;
        
        if (profile) {
          if (profile.role === 'customer' && !profile.is_approved) {
            await signOut();
            setError('Account pending approval. Please wait for company confirmation.');
            return;
          }
          
          navigate(profile.role === 'company' ? '/company' : '/customer');
        } else {
          await signOut();
          setError('Profile not found for this account. Please contact support.');
        }
      }
      }
    } catch (err) {
      setError(err.message || (isForgotPassword ? 'Failed to send reset link' : 'Failed to sign in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-center items-center mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          {isForgotPassword ? 'Reset Password' : 'B2B Wholesale Login'}
        </h2>
      </div>
      
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-brand-berry/10 border border-red-500/50 flex items-center gap-2 text-brand-berry text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/50 flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#6B4226] mb-1">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-primary border border-border-light rounded-lg py-2 pl-10 pr-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 focus:border-brand-caramel transition-colors"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {!isForgotPassword && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-[#6B4226]">Password</label>
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                className="text-xs text-brand-caramel hover:text-brand-caramel/80 font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-text-secondary" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required={!isForgotPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-primary border border-border-light rounded-lg py-2 pl-10 pr-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 focus:border-brand-caramel transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-gradient-to-r from-brand-caramel to-brand-caramel/80 hover:to-brand-caramel text-brand-navy font-bold py-2.5 px-4 rounded-lg shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : (isForgotPassword ? 'Send Reset Link' : 'Sign In')}
        </button>
        
        {isForgotPassword && (
          <button
            type="button"
            onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
            className="w-full mt-3 bg-transparent text-text-secondary hover:text-text-primary font-medium py-2 px-4 transition-colors"
          >
            Back to Login
          </button>
        )}
      </form>

      <div className="mt-6 flex flex-col gap-2 text-center text-sm text-text-secondary">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-caramel hover:text-brand-caramel/80 font-medium transition-colors">
            Register Shop
          </Link>
        </p>
        <p>
          Want to register your own company?{' '}
          <Link to="/register/company" className="text-brand-caramel hover:text-brand-caramel/80 font-medium transition-colors">
            Register Company
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
