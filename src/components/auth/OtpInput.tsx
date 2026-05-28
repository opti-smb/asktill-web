import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import styles from './OtpInput.module.css';

export type OtpInputStatus = 'default' | 'success' | 'error';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  status?: OtpInputStatus;
}

export default function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  status = 'default',
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  const updateAt = (index: number, char: string) => {
    const next = digits.map((d, i) => (i === index ? char : d === ' ' ? '' : d)).join('').slice(0, length);
    onChange(next.replace(/\s/g, ''));
  };

  const focusIndex = (index: number) => {
    inputsRef.current[index]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    updateAt(index, char);
    if (char && index < length - 1) focusIndex(index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      focusIndex(index - 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    focusIndex(Math.min(pasted.length, length - 1));
  };

  return (
    <div className={styles.row} role="group" aria-label="One-time passcode">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          className={`${styles.box} ${status === 'success' ? styles.boxSuccess : ''} ${status === 'error' ? styles.boxError : ''}`}
          value={digit.trim()}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}
