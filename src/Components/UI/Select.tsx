import React, { SelectHTMLAttributes, ReactNode } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectOptGroup {
    label: string;
    options: SelectOption[];
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
    options?: (SelectOption | SelectOptGroup)[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    helperText?: string;
    size?: 'small' | 'medium' | 'large';
    variant?: 'default' | 'outlined' | 'filled';
    loading?: boolean;
    className?: string;
    children?: ReactNode;
}

const isOptGroup = (item: SelectOption | SelectOptGroup): item is SelectOptGroup => {
    return 'options' in item;
};

export const Select: React.FC<SelectProps> = ({
    options = [],
    value,
    onChange,
    placeholder,
    label,
    error,
    helperText,
    size = 'medium',
    variant = 'default',
    loading = false,
    className = '',
    children,
    disabled,
    ...rest
}) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onChange?.(event.target.value);
    };

    const selectId = rest.id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const selectClasses = [
        styles.select,
        styles[`select--${size}`],
        styles[`select--${variant}`],
        error ? styles['select--error'] : '',
        disabled ? styles['select--disabled'] : '',
        loading ? styles['select--loading'] : '',
        className
    ].filter(Boolean).join(' ');

    const renderOptions = () => {
        if (children) {
            return children;
        }

        return options.map((item, index) => {
            if (isOptGroup(item)) {
                return (
                    <optgroup key={`group-${index}`} label={item.label}>
                        {item.options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </optgroup>
                );
            } else {
                return (
                    <option
                        key={item.value}
                        value={item.value}
                        disabled={item.disabled}
                    >
                        {item.label}
                    </option>
                );
            }
        });
    };

    return (
        <div className={styles.selectContainer}>
            {label && (
                <label htmlFor={selectId} className={styles.label}>
                    {label}
                    {rest.required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div className={styles.selectWrapper}>
                <select
                    id={selectId}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled || loading}
                    className={selectClasses}
                    {...rest}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {renderOptions()}
                </select>

                {loading && (
                    <div className={styles.loadingIcon}>
                        <svg className={styles.spinner} viewBox="0 0 24 24">
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray="32"
                                strokeDashoffset="32"
                            />
                        </svg>
                    </div>
                )}

                <div className={styles.selectIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                </div>
            </div>

            {(error || helperText) && (
                <div className={styles.helpText}>
                    {error ? (
                        <span className={styles.errorText}>{error}</span>
                    ) : (
                        <span className={styles.helperText}>{helperText}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default Select;
