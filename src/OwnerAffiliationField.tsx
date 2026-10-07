import { useEffect, useMemo, useRef, useState } from "react";
import { ownerAffiliationOptions } from "./data";
import { RequiredFieldMark } from "./LeadDetail";
import { filterOptionsBySearch } from "./SearchableSelect";

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

function OwnerAffiliationSummary({
  selected,
  emptyLabel,
  variant = "chips",
}: {
  selected: string[];
  emptyLabel: string;
  variant?: "chips" | "inline";
}) {
  if (selected.length === 0) {
    return <span className="inline-field-text">{emptyLabel}</span>;
  }

  if (variant === "inline") {
    const summary = selected.join(", ");
    return (
      <span className="inline-field-text owner-affiliation-inline-summary" title={summary}>
        {summary}
      </span>
    );
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
  required,
  summaryVariant = "chips",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  options?: string[];
  emptyLabel?: string;
  required?: boolean;
  summaryVariant?: "chips" | "inline";
}) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = parseOwnerAffiliations(value);
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
    setSearchQuery("");
    if (commit && draft !== value) onChange(draft);
  }

  function openEditor() {
    setDraft(value);
    setSearchQuery("");
    setEditing(true);
    setMenuOpen(true);
  }

  const filteredOptionsList = useMemo(() => {
    const summary = menuSelected.join(", ");
    return filterOptionsBySearch(optionsList, searchQuery, summary);
  }, [optionsList, searchQuery, menuSelected]);

  useEffect(() => {
    if (!editing) return;
    searchInputRef.current?.focus();
  }, [editing]);

  function toggle(option: string) {
    const nextSet = new Set(menuSelectedSet);
    if (nextSet.has(option)) nextSet.delete(option);
    else nextSet.add(option);
    const next = serializeOwnerAffiliations(optionsList.filter((item) => nextSet.has(item)));
    setDraft(next);
    onChange(next);
    setMenuOpen(true);
    requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    if (!editing) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [editing]);

  const valueClass = isEmpty ? "inline-field-value is-placeholder" : "inline-field-value";

  return (
    <div
      ref={rootRef}
      className={[
        editing
          ? "kv-row inline-field contact-owner-affiliation-field is-editing"
          : "kv-row inline-field contact-owner-affiliation-field",
        required ? "is-required" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="kv-label">
        <span className="kv-label-text">{label}</span>
        {required ? <RequiredFieldMark /> : null}
      </span>
      <div className="kv-value">
        {editing ? (
          <div className="inline-field-editor owner-affiliation-field-editor">
            <input
              ref={searchInputRef}
              className="inline-field-input owner-affiliation-search"
              type="text"
              value={searchQuery}
              placeholder={menuSelected.length > 0 ? "Search affiliations" : emptyLabel}
              aria-label={label}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setMenuOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") close(false);
              }}
            />
            {menuOpen ? (
              <ul className="inline-menu owner-affiliation-menu" role="listbox" aria-multiselectable="true">
                {filteredOptionsList.length === 0 ? (
                  <li className="inline-menu-empty" role="presentation">
                    No matching affiliations
                  </li>
                ) : (
                  filteredOptionsList.map((option) => {
                    const isSelected = menuSelectedSet.has(option);
                    return (
                      <li key={option}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={isSelected ? "is-selected" : undefined}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => toggle(option)}
                        >
                          <span className="inline-checkbox" aria-hidden="true" />
                          <span className="owner-affiliation-menu-label">{option}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}
          </div>
        ) : (
          <button type="button" className={`${valueClass} contact-owner-affiliation-value`} onClick={openEditor}>
            <OwnerAffiliationSummary selected={selected} emptyLabel={emptyLabel} variant={summaryVariant} />
          </button>
        )}
      </div>
    </div>
  );
}
