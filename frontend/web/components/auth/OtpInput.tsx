'use client';

import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  length?: number;
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  length = 6,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split string into array of characters of length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Auto-focus first empty box on mount
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // only digits
    if (!val) {
      // Cleared
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
      return;
    }

    if (val.length > 1) {
      // Pasted or multiple characters in one box
      handlePastedContent(val, index);
      return;
    }

    const singleChar = val[val.length - 1];
    const newDigits = [...digits];
    newDigits[index] = singleChar;
    const combined = newDigits.join('');
    onChange(combined);

    // Advance focus to next input
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Move back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    handlePastedContent(pasted, 0);
  };

  const handlePastedContent = (text: string, startIndex: number) => {
    const chars = text.slice(0, length - startIndex).split('');
    const newDigits = [...digits];
    chars.forEach((c, idx) => {
      newDigits[startIndex + idx] = c;
    });
    const combined = newDigits.join('').slice(0, length);
    onChange(combined);

    // Move focus to next unfilled index or last input
    const nextIdx = Math.min(startIndex + chars.length, length - 1);
    inputRefs.current[nextIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 w-full max-w-sm mx-auto" onPaste={handlePaste}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${idx + 1} of ${length}`}
          className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-lg border input-opaque transition-all duration-150 outline-none
            ${
              hasError
                ? 'border-[var(--danger)] text-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/30'
                : digit
                ? 'border-[var(--accent)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]/30'
                : 'border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
      ))}
    </div>
  );
}
