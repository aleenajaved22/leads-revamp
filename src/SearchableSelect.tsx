import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export function filterOptionsBySearch(options: string[], searchQuery: string, currentValue: string) {
  const query = searchQuery.trim().toLowerCase();
  const current = currentValue.trim();
  if (!query || (current && query === current.toLowerCase())) return options;
  return options.filter((option) => option.toLowerCase().includes(query));
}

export function SearchableSelectControl({
  open,
  value,
  placeholder,
  searchQuery,
  onSearchQueryChange,
  onOpen,
  onClose,
  onClear,
  inputRef,
  ariaLabel,
  tone = "default",
  disabled = false,
}: {
  open: boolean;
  value: string;
  placeholder: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  ariaLabel: string;
  tone?: "default" | "link";
  disabled?: boolean;
}) {
  const current = value.trim();

  return (
    <div
      className={[
        "searchable-select",
        open ? "is-open" : "is-closed",
        tone === "link" ? "is-link-tone" : "",
        disabled ? "is-disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {open ? (
        <input
          ref={inputRef}
          className="searchable-select-input"
          type="text"
          value={searchQuery}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
        />
      ) : (
        <button
          type="button"
          className="searchable-select-display"
          aria-expanded={open}
          disabled={disabled}
          onClick={onOpen}
        >
          <span className={`searchable-select-display-text${current ? "" : " is-placeholder"}`}>
            {current || placeholder}
          </span>
        </button>
      )}
      {open && !disabled ? (
        <div className="searchable-select-actions">
          {current ? (
            <button
              type="button"
              className="searchable-select-clear"
              aria-label="Clear selection"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
            >
              ×
            </button>
          ) : null}
          <button
            type="button"
            className="searchable-select-chevron"
            aria-label="Close options"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6.2 8 10.2 12 6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SearchableSelectMenu({
  options,
  value,
  noneOption,
  onChoose,
  listboxId,
}: {
  options: string[];
  value: string;
  noneOption?: boolean;
  onChoose: (option: string) => void;
  listboxId?: string;
}) {
  const current = value.trim();
  const selectedLabel = current || "None";

  return (
    <ul className="inline-menu searchable-select-menu" id={listboxId} role="listbox">
      {options.length === 0 ? (
        <li className="inline-menu-empty" aria-hidden="true">
          No matches
        </li>
      ) : (
        options.map((option) => {
          const active =
            noneOption
              ? option === selectedLabel || (option === "None" && !current)
              : option === current;
          return (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={active ? "is-selected" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChoose(option)}
              >
                <span className="inline-radio" />
                {option}
              </button>
            </li>
          );
        })
      )}
    </ul>
  );
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  ariaLabel = "Select option",
  tone = "default",
  noneOption = false,
  disabled = false,
  listboxId,
  menuFooter,
  onOpenChange,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
  tone?: "default" | "link";
  noneOption?: boolean;
  disabled?: boolean;
  listboxId?: string;
  menuFooter?: ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = value.trim();

  const choices = useMemo(() => {
    if (!noneOption) return options;
    return ["None", ...options.filter((option) => option !== "None")];
  }, [noneOption, options]);

  const filterBaseline = noneOption ? (current || "None") : current;

  const queryForFilter = open && !isFiltering ? current : searchQuery;

  const filteredOptions = useMemo(
    () => filterOptionsBySearch(choices, queryForFilter, filterBaseline),
    [choices, queryForFilter, filterBaseline],
  );

  const inputDisplayValue = open && !isFiltering ? current : searchQuery;

  function closeMenu() {
    setOpen(false);
    setSearchQuery("");
    setIsFiltering(false);
    onOpenChange?.(false);
  }

  function openMenu() {
    setSearchQuery(current);
    setIsFiltering(false);
    setOpen(true);
    onOpenChange?.(true);
  }

  function clearSelection() {
    onChange("");
    closeMenu();
  }

  function choose(option: string) {
    onChange(noneOption && option === "None" ? "" : option);
    closeMenu();
  }

  useEffect(() => {
    if (!open || disabled) return;
    const input = inputRef.current;
    requestAnimationFrame(() => {
      input?.focus();
      if (!isFiltering && current) input?.select();
    });
  }, [open, disabled, isFiltering, current]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`searchable-select-field${open ? " is-open" : ""}`}>
      <SearchableSelectControl
        open={open}
        value={value}
        placeholder={placeholder}
        searchQuery={inputDisplayValue}
        onSearchQueryChange={(query) => {
          setIsFiltering(true);
          setSearchQuery(query);
        }}
        onOpen={openMenu}
        onClose={closeMenu}
        onClear={clearSelection}
        inputRef={inputRef}
        ariaLabel={ariaLabel}
        tone={tone}
        disabled={disabled}
      />
      {open && !disabled ? (
        <>
          <SearchableSelectMenu
            options={filteredOptions}
            value={value}
            noneOption={noneOption}
            onChoose={choose}
            listboxId={listboxId}
          />
          {menuFooter}
        </>
      ) : null}
    </div>
  );
}
