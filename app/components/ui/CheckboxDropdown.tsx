"use client";
import React, { useState, useRef, useEffect, useId } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface CheckboxDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  required?: boolean;
  helper?: string;
  maxSelected?: number;
  disabled?: boolean;
  /** Shown under the control in red; also marks the control invalid. */
  error?: string;
  /** Id for the trigger button, so error summaries can focus it. */
  id?: string;
  /** Adds a filter box at the top of the list. On by default for lists longer than 10. */
  searchable?: boolean;
}

/** Multi-select: a button that opens a checkbox list, with the picks shown as removable chips below. */
export default function CheckboxDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select options",
  required = false,
  helper,
  maxSelected,
  disabled = false,
  error,
  id,
  searchable,
}: CheckboxDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const listId = `${autoId}-list`;
  const noteId = `${autoId}-note`;
  const showSearch = searchable ?? options.length > 10;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }
    if (showSearch) searchRef.current?.focus();
  }, [isOpen, showSearch]);

  const toggleOption = (value: string) => {
    const exists = selected.includes(value);
    if (exists) {
      onChange(selected.filter((v) => v !== value));
      return;
    }

    if (maxSelected && selected.length >= maxSelected) {
      return;
    }

    onChange([...selected, value]);
  };

  const visible = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
        : `${selected.length} selected`;

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && isOpen) {
          e.stopPropagation();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <label htmlFor={triggerId} className="mb-1.5 block text-[13px] font-semibold text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
        )}
      </label>

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={helper || error ? noteId : undefined}
        className={clsx(
          "flex min-h-[40px] w-full items-center justify-between gap-2 rounded-[10px] border bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors",
          "focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-100",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          error ? "border-red-500" : "border-gray-300 hover:border-gray-400",
        )}
        disabled={disabled}
      >
        <span className={clsx("min-w-0 truncate", selected.length === 0 ? "text-gray-400" : "text-gray-900")}>
          {displayText}
        </span>
        <ChevronDown
          className={clsx("h-4 w-4 shrink-0 text-gray-400 transition-transform", isOpen && "rotate-180")}
          aria-hidden
        />
      </button>

      {error ? (
        <p id={noteId} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : helper ? (
        <p id={noteId} className="mt-1.5 text-xs text-gray-500">
          {helper}
          {maxSelected ? ` (up to ${maxSelected})` : ""}
        </p>
      ) : null}

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {showSearch && (
            <div className="relative border-b border-gray-100 p-2">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label={`Search ${label.toLowerCase()}`}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          )}
          <div id={listId} role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-64 overflow-auto py-1">
            {visible.map((option) => {
              const checked = selected.includes(option.value);
              const blocked = maxSelected ? !checked && selected.length >= maxSelected : false;
              return (
                <label
                  key={option.value}
                  className={clsx(
                    "flex min-h-[40px] cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors",
                    checked ? "bg-indigo-50/60 text-gray-900" : "text-gray-700 hover:bg-gray-50",
                    blocked && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={blocked}
                    onChange={() => toggleOption(option.value)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {checked && <Check className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />}
                </label>
              );
            })}

            {visible.length === 0 && (
              <div className="px-3 py-3 text-center text-sm text-gray-500">
                {options.length === 0 ? "No options available" : "No matches"}
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
              <span className="text-xs text-gray-500">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Selected ${label.toLowerCase()}`}>
          {selected.map((value) => {
            const option = options.find((opt) => opt.value === value);
            const text = option?.label || value;
            return (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => toggleOption(value)}
                  disabled={disabled}
                  aria-label={`Remove ${text}`}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-indigo-50 px-3 text-[13px] font-medium text-indigo-700 ring-1 ring-indigo-200 transition-colors hover:bg-indigo-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:opacity-60"
                >
                  {text}
                  <X className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
