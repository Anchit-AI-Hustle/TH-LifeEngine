"use client";

import { ReactNode, useId, cloneElement, isValidElement } from 'react';
import styles from './Form.module.css';

interface FieldProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
}

/** Label, control, then help or error text; wires up htmlFor / aria-describedby. */
export function Field({ label, required, helper, error, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        'aria-describedby': helper || error ? noteId : undefined,
        'aria-invalid': error ? true : undefined,
      })
    : children;
  const controlId = isValidElement<{ id?: string }>(children) ? children.props.id ?? id : undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={controlId}>
        {label}
        {required && <span className={styles.required} aria-hidden>*</span>}
      </label>
      {control}
      {error ? (
        <span id={noteId} className={`${styles.help} ${styles.error}`} role="alert">
          {error}
        </span>
      ) : helper ? (
        <span id={noteId} className={styles.help}>
          {helper}
        </span>
      ) : null}
    </div>
  );
}
