import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../lib/hooks';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { Button, TextInput } from '../components/ui';

export default function Register() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', businessName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const bind = (field) => ({ value: form[field], onChange: (event) => setForm({ ...form, [field]: event.target.value }) });

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Your name is required';
    if (!form.businessName.trim()) next.businessName = 'Business name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (form.password.length < 6) next.password = 'Use at least 6 characters';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await register({ name: form.name.trim(), businessName: form.businessName.trim(), email: form.email.trim(), password: form.password });
      toast.success('Account created! Complete your business profile to start billing.');
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start billing in under two minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput label="Your Name" autoComplete="name" autoFocus {...bind('name')} error={errors.name} />
        <TextInput label="Business Name" autoComplete="organization" {...bind('businessName')} error={errors.businessName} placeholder="As it should appear on invoices" />
        <TextInput label="Email address" type="email" autoComplete="email" {...bind('email')} error={errors.email} />
        <PasswordInput label="Password" autoComplete="new-password" {...bind('password')} error={errors.password} />
        <PasswordInput label="Confirm Password" autoComplete="new-password" {...bind('confirmPassword')} error={errors.confirmPassword} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create Account
        </Button>
      </form>
    </AuthLayout>
  );
}
