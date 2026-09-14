import { useId, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { cx } from '../lib/cx';
import { Field } from './ui';

export default function PasswordInput({ label, error, hint, className, ...props }) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} className={cx('input pr-10', error && 'input-error')} {...props} />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
    </Field>
  );
}
