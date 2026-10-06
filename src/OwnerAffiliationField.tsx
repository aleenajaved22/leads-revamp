import { useEffect, useRef, useState } from "react";
import { ownerAffiliationOptions } from "./data";

function parseOwnerAffiliations(value: string) {
  return value
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function serializeOwnerAffiliations(values: string[]) {
  return values.join(", ");
}

function affiliationChipOptions(options: string[], selected: string[]) {
  const extras = selected.filter((option) => !options.includes(option));
  return [...extras, ...options];
}

function OwnerAffiliationOverflowHint({ labels }: { labels: string[] }) {
  const [open, setOpen] = useState(false);

  if (labels.length === 0) return null;

  return (
    <span
      className="owner-affiliation-overflow-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="owner-affiliation-chip owner-affiliation-overflow" aria-expanded={open}>
        +{labels.length}
      </span>
      {open ? (
        <span className="owner-affiliation-overflow-popover" role="tooltip">
          {labels.map((label) => (
            <span key={label} className="owner-affiliation-chip is-selected is-readonly">
              {label}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function OwnerAffiliationSummary({ selected, emptyLabel }: { selected: string[]; emptyLabel: string }) {
  if (selected.length === 0) {
    return <span className="inline-field-text">{emptyLabel}</span>;
  }

  const visibleSelected = selected.slice(0, 2);
  const overflowSelected = selected.slice(2);

  return (
    <>
      {visibleSelected.map((label) => (
        <span key={label} className="owner-affiliation-chip is-selected is-readonly">
          {label}
        </span>
      ))}
      <OwnerAffiliationOverflowHint labels={overflowSelected} />
    </>
  );
}

export function ContactOwnerAffiliationChips({
  value,
  onChange,
  label = "Owner Affiliation",
  options = ownerAffiliationOptions,
  emptyLabel = "Select Owner Affiliation",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  options?: string[];
  emptyLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseOwnerAffiliations(value);
  const draftSelected = parseOwnerAffiliations(draft);
  const isEmpty = selected.length === 0;
  const menuSelected = parseOwnerAffiliations(draft);
  const optionsList = affiliationChipOptions(options, menuSelected);
  const menuSelectedSet = new Set(menuSelected);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  function close(commit = true) {
    setEditing(false);
    setMenuOpen(false);
    if (commit && draft !== value) onChange(draft);
  }

  function openEditor() {
    setDraft(value);
    setEditing(true);
    setMenuOpen(true);
  }

  function toggle(option: string) {
    const nextSet = new Set(menuSelectedSet);
    if (nextSet.has(option)) nextSet.delete(option);
    else nextSet.add(option);
    setDraft(serializeOwnerAffiliations(optionsList.filter((item) => nextSet.has(item))));
  }

  useEffect(() => {
    if (!editing) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  });

  const valueClass = isEmpty ? "inline-field-value is-placeholder" : "inline-field-value";

  return (
    <div
      ref={rootRef}
      className={
        editing
          ? "kv-row inline-field contact-owner-affiliation-field is-editing"
          : "kv-row inline-field contact-owner-affiliation-field"
      }
    >
      <span className="kv-label">{label}</span>
      <div className="kv-value">
        {editing ? (
          <div className="inline-field-editor">
            <button
              type="button"
              className="inline-select contact-owner-affiliation-trigger"
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="contact-owner-affiliation-trigger-body">
                <OwnerAffiliationSummary selected={draftSelected} emptyLabel={emptyLabel} />
              </span>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 6.2 8 10.2 12 6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            {menuOpen ? (
              <ul className="inline-menu owner-affiliation-menu" role="listbox" aria-multiselectable="true">
                {optionsList.map((option) => {
                  const isSelected = menuSelectedSet.has(option);
                  return (
                    <li key={option}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={isSelected ? "is-selected" : undefined}
                        onClick={() => toggle(option)}
                      >
                        <span className="inline-checkbox" aria-hidden="true" />
                        {option}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : (
          <button type="button" className={`${valueClass} contact-owner-affiliation-value`} onClick={openEditor}>
            <OwnerAffiliationSummary selected={selected} emptyLabel={emptyLabel} />
          </button>
        )}
      </div>
    </div>
  );
}
