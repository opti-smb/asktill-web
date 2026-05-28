import { useRef } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { getEmailSuggestion } from '../../lib/emailValidation';
import styles from './EmailField.module.css';

interface EmailFieldProps {
  id?: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  emailValue: string;
  onApplySuggestion: (email: string) => void;
  highlight?: boolean;
  onEmailChange?: () => void;
}

export default function EmailField({
  id = 'email',
  label,
  placeholder = 'you@yourbusiness.com',
  autoComplete = 'email',
  registration,
  error,
  emailValue,
  onApplySuggestion,
  highlight = false,
  onEmailChange,
}: EmailFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestion = getEmailSuggestion(emailValue || '');

  const { ref, onChange, ...rest } = registration;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete={autoComplete}
        spellCheck={false}
        className={`${styles.input} ${error || highlight ? styles.inputError : ''}`}
        placeholder={placeholder}
        {...rest}
        ref={(node) => {
          ref(node);
          inputRef.current = node;
        }}
        onChange={(event) => {
          onChange(event);
          onEmailChange?.();
        }}
      />
      {error && <span className={styles.error}>{error.message}</span>}
      {suggestion && !error && (
        <button
          type="button"
          className={styles.suggestion}
          onClick={() => {
            onApplySuggestion(suggestion);
            inputRef.current?.focus();
          }}
        >
          Did you mean <strong>{suggestion}</strong>?
        </button>
      )}
      {suggestion && error && (
        <button
          type="button"
          className={styles.suggestion}
          onClick={() => {
            onApplySuggestion(suggestion);
            inputRef.current?.focus();
          }}
        >
          Use <strong>{suggestion}</strong> instead
        </button>
      )}
    </div>
  );
}

export function focusEmailInput(id = 'email') {
  const el = document.getElementById(id) as HTMLInputElement | null;
  el?.focus();
  el?.select();
}
