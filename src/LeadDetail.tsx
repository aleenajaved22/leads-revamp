import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PropertyMap } from "./PropertyMap";
import {
  companyStatusClass,
  emptyCompany,
  emptyContact,
  occupancyFloorValue,
  occupancyLabel,
  occupancyParts,
  occupancySuiteValue,
  type Company,
  type Contact,
  type Lead,
  type Status,
} from "./data";

const companyFields: {
  key: keyof Company;
  label: string;
  options?: string[];
  placeholder?: string;
  kind?: "phone" | "date";
}[] = [
  { key: "name", label: "Company Name", placeholder: "Enter Company Name" },
  { key: "secondaryVertical", label: "Secondary Vertical", placeholder: "Enter Secondary Vertical" },
  { key: "phone", label: "Phone Number", placeholder: "+1 800 567 8905", kind: "phone" },
  { key: "employees", label: "No. of Employees", placeholder: "Enter No. of Employees" },
  { key: "naics", label: "NAICS", placeholder: "Enter NAICS" },
  { key: "revenue", label: "Revenue", placeholder: "Enter Revenue" },
  { key: "website", label: "Website URL", placeholder: "Enter Website URL" },
  { key: "emailDomain", label: "Email Domain", placeholder: "Enter Email Domain" },
];

const occupancyFields: { key: keyof Company; label: string; placeholder?: string }[] = [
  { key: "floor", label: "Floor", placeholder: "Enter Floor" },
  { key: "suite", label: "Suite / Unit / Apartment", placeholder: "Enter Suite / Unit / Apartment" },
  { key: "occupiedArea", label: "Occupied Area (sq ft)", placeholder: "Enter Occupied Area" },
];

const occupancyDateFields: { key: "effectiveDate" | "tillDate"; label: string }[] = [
  { key: "effectiveDate", label: "Company at Property - Effective Date" },
  { key: "tillDate", label: "Company at Property - Till Date" },
];

const propertyAffiliationOptions = ["Managed", "Owned", "Regional Office", "Shared", "Tenant", "Headquarters"];

const propertyPrimaryVerticals = ["Commercial", "Industrial", "Office", "Retail", "Healthcare", "Mixed Use"];
const propertyBuildingStatuses = ["Existing", "Under Construction", "Planned"];
const propertyCountries = ["United States"];
const propertyStates = [
  "California",
  "Texas",
  "Delaware",
  "Illinois",
  "Ohio",
  "Florida",
  "New York",
  "Pennsylvania",
  "Tennessee",
];
const propertyCities = [
  "San Francisco",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Austin",
  "Celina",
  "Santa Ana",
  "Pembroke Pines",
  "Toledo",
  "Naperville",
];

const ownerAffiliationOptions = [
  "Decision Maker",
  "Billing",
  "End User",
  "Blocker",
  "Influencer",
];

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

function ContactOwnerAffiliationChips({
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

const contactFields: {
  key: keyof Contact;
  label: string;
  placeholder: string;
  kind?: "phone";
  options?: string[];
}[] = [
  { key: "firstName", label: "First Name", placeholder: "Enter First Name" },
  { key: "lastName", label: "Last Name", placeholder: "Enter Last Name" },
  { key: "title", label: "Title", placeholder: "Enter Title" },
  { key: "email", label: "Email", placeholder: "Enter Email" },
  { key: "phone", label: "Phone Number", placeholder: "+1 800 567 8905", kind: "phone" },
  { key: "cell", label: "Cell Number", placeholder: "+1 800 567 8905", kind: "phone" },
  {
    key: "ownerAffiliation",
    label: "Owner Affiliation",
    placeholder: "Select Owner Affiliation",
    options: ownerAffiliationOptions,
  },
  { key: "address", label: "Address", placeholder: "Enter Address" },
  { key: "country", label: "Country", placeholder: "Select Country", options: propertyCountries },
  { key: "state", label: "State", placeholder: "Select State", options: propertyStates },
  { key: "city", label: "City", placeholder: "Select City", options: propertyCities },
  { key: "zipcode", label: "Zipcode", placeholder: "Enter Zipcode" },
];

const workflow = [
  { status: "Raw" as Status, label: "Raw Data" },
  { status: "Cleaned" as Status, label: "Cleaned" },
  { status: "Enriched" as Status, label: "Enriched" },
];

const companySectionOffset = 32;

const companyTabs = [
  { id: "information", label: "Company Information" },
  { id: "occupancy", label: "Property Occupancy" },
  { id: "contacts", label: "Contacts" },
];

function workflowIndex(status: Status) {
  if (status === "Cleaned") return 1;
  if (status === "Enriched" || status === "Approved") return 2;
  return 0;
}

function formatFieldDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
}

function shown(value: string) {
  return value.trim() ? value : "N/A";
}

function fieldValue(raw: string) {
  return raw.trim() && raw !== "N/A" ? raw : "";
}

function withCurrentOption(value: string, options: string[]) {
  const current = value.trim();
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

function countryLabel(code: string) {
  const value = code.trim().toUpperCase();
  if (!value || value === "N/A") return "";
  if (value === "US" || value === "USA") return "United States";
  return code.trim();
}

function countryCode(label: string) {
  if (label === "United States") return "US";
  return label;
}

function countryFlagPrefix(country: string) {
  const label = countryLabel(country);
  if (label !== "United States") return undefined;
  return <img className="inline-field-flag" src="/assets/flag-usa.png" alt="" />;
}

function phoneFlagPrefix(phone: string, country: string) {
  const trimmed = phone.trim();
  if (!trimmed) return undefined;
  const isUs =
    countryLabel(country) === "United States" || trimmed.startsWith("+1") || /^\+1[\s(-]/.test(trimmed);
  return isUs ? countryFlagPrefix("US") : undefined;
}

function tenancyLabel(value: string) {
  if (!value.trim() || value === "N/A") return "N/A";
  if (/tenant/i.test(value)) return value;
  return `${value}-Tenant`;
}

function formatActivityDate(raw: string) {
  const value = raw.trim();
  if (!value || value === "N/A") return "N/A";
  let date: Date | null = null;
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) date = new Date(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
  else {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  if (!date || Number.isNaN(date.getTime())) return value;
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

const activityFields: { label: string; value: (lead: Lead) => string }[] = [
  { label: "Lead Added", value: (lead) => formatActivityDate(lead.added) },
  { label: "Last Modified", value: (lead) => formatActivityDate(lead.modified) },
  { label: "Modified By", value: (lead) => shown(lead.modifiedBy) },
  { label: "Processed By", value: (lead) => shown(lead.processed) },
];

function ActivityHint({ lead }: { lead: Lead }) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function updatePosition() {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = popover?.offsetWidth ?? 260;
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    setPosition({ top: rect.bottom + 8, left });
  }

  function cancelClose() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  }

  function show() {
    cancelClose();
    setOpen(true);
    requestAnimationFrame(updatePosition);
  }

  function toggle() {
    cancelClose();
    setOpen((current) => {
      const next = !current;
      if (next) requestAnimationFrame(updatePosition);
      return next;
    });
  }

  useEffect(() => {
    return () => cancelClose();
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(updatePosition);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onLayout() {
      updatePosition();
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", onLayout, true);
    window.addEventListener("resize", onLayout);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onLayout, true);
      window.removeEventListener("resize", onLayout);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const popover = open ? (
    <div
      ref={popoverRef}
      className="summary-activity-popover"
      style={{ top: position.top, left: position.left }}
      role="tooltip"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <dl className="activity-popover-rows">
        {activityFields.map((field) => (
          <Fragment key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value(lead)}</dd>
          </Fragment>
        ))}
        <dt>Assigned To</dt>
        <dd>
          {lead.assignee ? (
            <span className="activity-assignee">
              <img src={lead.assignee.avatar} alt="" />
              {lead.assignee.name}
            </span>
          ) : (
            "Unassigned"
          )}
        </dd>
      </dl>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="summary-activity"
        aria-expanded={open}
        aria-haspopup="true"
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onFocus={show}
        onClick={toggle}
      >
        Activity
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 7.1V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="5.15" r="0.75" fill="currentColor" />
        </svg>
      </button>
      {popover && createPortal(popover, document.body)}
    </>
  );
}

function AddressHeading({
  value,
  invalid,
  onCommit,
}: {
  value: string;
  invalid?: boolean;
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const display = value.trim() && value !== "N/A" ? value : "Address unavailable";

  useEffect(() => {
    if (!editing) setDraft(display === "Address unavailable" ? "" : display);
  }, [editing, display]);

  useEffect(() => {
    if (!editing || !inputRef.current) return;
    const input = inputRef.current;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [editing]);

  function commit(next = draft) {
    setEditing(false);
    const trimmed = next.trim();
    const current = display === "Address unavailable" ? "" : display;
    if (trimmed !== current) onCommit(trimmed);
  }

  const text = editing ? draft || " " : display;

  return (
    <span className="summary-title-slot">
      <span className="summary-title-mirror" aria-hidden="true">
        {text}
      </span>
      {editing ? (
        <textarea
          ref={inputRef}
          className={invalid ? "summary-title-input is-error" : "summary-title-input"}
          value={draft}
          aria-label="Property address"
          aria-invalid={invalid || undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              setDraft(display === "Address unavailable" ? "" : display);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className={invalid ? "summary-title is-error" : "summary-title"}
          aria-invalid={invalid || undefined}
          onClick={() => {
            setDraft(display === "Address unavailable" ? "" : display);
            setEditing(true);
          }}
        >
          {display}
        </button>
      )}
    </span>
  );
}

type FieldError = {
  id: string;
  group: string;
  indexLabel: string;
  message: string;
  anchor: string;
  companyId?: string;
};

function fieldErrorsFor(lead: Lead): FieldError[] {
  if (lead.id !== "1") return [];
  const logs: FieldError[] = [];
  if (lead.address.trim() && lead.address !== "N/A") {
    const company = lead.companies[0];
    if (company) {
      logs.push({
        id: `company-suite-${company.id}`,
        group: "Property Info",
        indexLabel: "1.",
        message: "Multiple companies found at this property; suite number is missing for this lead.",
        anchor: `company-suite-${company.id}`,
        companyId: company.id,
      });
    }
  }
  for (const company of lead.companies) {
    for (const contact of company.contacts) {
      if (!contact.email.trim()) continue;
      if (contact.id !== "ct-1-a1") continue;
      const name = `${contact.firstName} ${contact.lastName}`.trim() || "Untitled contact";
      logs.push({
        id: `contact-email-${contact.id}`,
        group: `${company.name || "Untitled company"} - Contact: ${name}`,
        indexLabel: "1.",
        message: "Contact's email has not been verified",
        anchor: `contact-email-${contact.id}`,
        companyId: company.id,
      });
    }
  }
  return logs;
}

function ErrorLogs({
  logs,
  activeId,
  onSelect,
}: {
  logs: FieldError[];
  activeId: string | null;
  onSelect: (error: FieldError) => void;
}) {
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const groups: { title: string; items: FieldError[] }[] = [];
  for (const log of logs) {
    const current = groups[groups.length - 1];
    if (current?.title === log.group) current.items.push(log);
    else groups.push({ title: log.group, items: [log] });
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      if (!dockRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("click", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("click", onPointerDown, true);
    };
  }, [open]);

  if (logs.length === 0) return null;

  return (
    <div className="error-logs-dock" ref={dockRef}>
      {open && (
        <section id="error-logs-panel" className="error-logs" aria-label="Error logs">
          <div className="error-logs-head">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path
                fill="currentColor"
                d="M5.5 7.5H6.5V8.5H5.5V7.5ZM5.5 3.5H6.5V6.5H5.5V3.5ZM5.995 1C3.235 1 1 3.24 1 6C1 8.76 3.235 11 5.995 11C8.76 11 11 8.76 11 6C11 3.24 8.76 1 5.995 1ZM6 10C3.79 10 2 8.21 2 6C2 3.79 3.79 2 6 2C8.21 2 10 3.79 10 6C10 8.21 8.21 10 6 10Z"
              />
            </svg>
            <h2>Error logs</h2>
          </div>
          {groups.map((group) => (
            <div className="error-logs-group" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={item.id === activeId ? "error-logs-item is-active" : "error-logs-item"}
                      onClick={() => onSelect(item)}
                    >
                      <span>{item.indexLabel}</span>
                      <span>{item.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      <button
        type="button"
        className="error-logs-toggle"
        aria-label="Error"
        aria-expanded={open}
        aria-controls="error-logs-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path
            fill="currentColor"
            d="M5.5 7.5H6.5V8.5H5.5V7.5ZM5.5 3.5H6.5V6.5H5.5V3.5ZM5.995 1C3.235 1 1 3.24 1 6C1 8.76 3.235 11 5.995 11C8.76 11 11 8.76 11 6C11 3.24 8.76 1 5.995 1ZM6 10C3.79 10 2 8.21 2 6C2 3.79 3.79 2 6 2C8.21 2 10 3.79 10 6C10 8.21 8.21 10 6 10Z"
          />
        </svg>
      </button>
    </div>
  );
}

function stamp(lead: Lead): Lead {
  return {
    ...lead,
    modified: new Date().toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    modifiedBy: "Aleena",
  };
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
}) {
  return (
    <label className="edit-field">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PhoneField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="edit-field phone-edit-field">
      {label}
      <div className="phone-input-shell">
        <button type="button" className="phone-input-country" aria-label="Country code">
          <img className="phone-input-flag" src="/assets/flag-usa.png" alt="" />
          <img className="phone-input-chevron" src="/assets/chevron-down-sm.svg" alt="" />
        </button>
        <input
          className="phone-input-control"
          value={value}
          placeholder={placeholder}
          inputMode="tel"
          autoComplete="tel"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="edit-field">
      {label}
      <span className="edit-select">
        <select
          value={value}
          className={value.trim() ? undefined : "is-placeholder"}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{placeholder ?? "Select"}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <img className="edit-select-chevron" src="/assets/chevron-down-sm.svg" alt="" />
      </span>
    </label>
  );
}

function InlineField({
  label,
  value,
  options,
  onCommit,
  emptyLabel,
  prefix,
  suffix,
  hideLabel,
  invalid,
  anchorId,
  tone,
  inputType = "text",
}: {
  label: string;
  value: string;
  options?: string[];
  onCommit: (value: string) => void;
  emptyLabel?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  hideLabel?: boolean;
  invalid?: boolean;
  anchorId?: string;
  tone?: "parent";
  inputType?: "text" | "date";
}) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const choices = options ? ["None", ...options.filter((option) => option !== "None")] : undefined;

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  function close(next = draft) {
    setEditing(false);
    setMenuOpen(false);
    if (next !== value) onCommit(next);
  }

  useEffect(() => {
    if (!editing) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  });

  function choose(option: string) {
    const next = option === "None" ? "" : option;
    setDraft(next);
    close(next);
  }

  const selectedLabel = value.trim() ? value : "None";
  const isEmpty = !value.trim();
  const display = isEmpty ? (emptyLabel ?? shown(value)) : inputType === "date" ? formatFieldDate(value) : value;
  const valueClass = isEmpty ? "inline-field-value is-placeholder" : "inline-field-value";

  return (
    <div
      ref={rootRef}
      data-error-anchor={anchorId}
      className={
        [
          "kv-row inline-field",
          editing ? "is-editing" : "",
          invalid ? "is-error" : "",
          tone === "parent" ? "is-parent" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <span className="kv-label" hidden={hideLabel}>{label}</span>
      <div className="kv-value">
      {editing && choices ? (
        <div className="inline-field-editor">
          <button
            type="button"
            className="inline-select"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="inline-field-text">{draft.trim() ? draft : "None"}</span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6.2 8 10.2 12 6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <ul className="inline-menu" role="listbox">
              {choices.map((option) => {
                const active = option === selectedLabel || (option === "None" && !value.trim());
                return (
                  <li key={option}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={active ? "is-selected" : ""}
                      onClick={() => choose(option)}
                    >
                      <span className="inline-radio" />
                      {option}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : editing ? (
        <input
          className="inline-field-input"
          type={inputType}
          value={draft}
          aria-label={label}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              close();
            }
            if (event.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button type="button" className={valueClass} onClick={() => {
          setDraft(value);
          setEditing(true);
          setMenuOpen(Boolean(choices));
        }}>
          {prefix}
          <span className="inline-field-text">{display}</span>
        </button>
      )}
      {!editing && suffix}
      </div>
    </div>
  );
}

function CompanySearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    onChange("");
    setOpen(false);
  }

  return (
    <div className={open ? "company-search is-open" : "company-search"}>
      <div className="company-search-field">
      <button
        type="button"
        className="company-search-toggle"
        aria-label={open ? "Close search" : "Search companies"}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <img src="/assets/icon-search.svg" alt="" />
      </button>
      <input
        ref={inputRef}
        className="company-search-input"
        type="search"
        placeholder="Search"
        aria-label="Search companies"
        tabIndex={open ? 0 : -1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
      />
      {open && value && (
        <button
          type="button"
          className="company-search-clear"
          aria-label="Clear search"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
        >
          ×
        </button>
      )}
      </div>
    </div>
  );
}

export function LeadDetail({
  lead,
  leads,
  onOpenLead,
  onChange,
  onBack,
}: {
  lead: Lead;
  leads: Lead[];
  onOpenLead: (id: string) => void;
  onChange: (lead: Lead) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState(lead.companies[0]?.id ?? "");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [newCompany, setNewCompany] = useState<Company>(emptyCompany());
  const [contactMode, setContactMode] = useState<"add" | "edit" | null>(null);
  const [contactDraft, setContactDraft] = useState<Contact>(emptyContact());
  const [companyTab, setCompanyTab] = useState("information");
  const [propertyFactsExpanded, setPropertyFactsExpanded] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);
  const [leadConfirm, setLeadConfirm] = useState<"archive" | "enrich" | null>(null);
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);
  const propertyMenuRef = useRef<HTMLDivElement>(null);
  const companyDetailScrollRef = useRef<HTMLDivElement>(null);
  const companySectionRefs = useRef<Partial<Record<string, HTMLElement | null>>>({});
  const pendingCompanyTabRef = useRef<string | null>(null);
  const pendingErrorAnchorRef = useRef<string | null>(null);
  const pendingScrollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedId(lead.companies[0]?.id ?? "");
    setAddCompanyOpen(false);
    setContactMode(null);
    setCompanyTab("information");
    setPropertyFactsExpanded(false);
    setCompanyQuery("");
    setPropertyMenuOpen(false);
    setLeadConfirm(null);
    setActiveErrorId(null);
  }, [lead.id]);

  useEffect(() => {
    if (!propertyMenuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!propertyMenuRef.current?.contains(event.target as Node)) setPropertyMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPropertyMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [propertyMenuOpen]);

  const normalizedCompanyQuery = companyQuery.trim().toLowerCase();
  const visibleCompanies = normalizedCompanyQuery
    ? lead.companies.filter((company) =>
        [company.name, company.secondaryVertical, company.status, occupancyLabel(company)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedCompanyQuery),
      )
    : lead.companies;

  const selected = lead.companies.find((company) => company.id === selectedId) ?? lead.companies[0];
  const { floorText } = selected ? occupancyParts(selected) : { floorText: "" };
  const parentCompany = selected?.parentCompany?.trim() ?? "";
  const parentPropertyId = parentCompany
    ? (leads.find(
        (item) =>
          item.id !== lead.id &&
          item.companies.some((company) => company.name.toLowerCase() === parentCompany.toLowerCase()),
      )?.id ??
      leads.find(
        (item) => item.id !== lead.id && item.name.toLowerCase().startsWith(parentCompany.toLowerCase()),
      )?.id ??
      null)
    : null;
  const step = workflowIndex(lead.status);
  const location = lead.address.trim() && lead.address !== "N/A" ? lead.address : "Address unavailable";
  const mapQuery = location === "Address unavailable" ? "" : location;

  const fieldErrors = fieldErrorsFor(lead);
  const activeError = fieldErrors.find((error) => error.id === activeErrorId) ?? null;

  function focusErrorAnchor(anchor: string) {
    if (anchor === "property-address") {
      document.querySelector("[data-error-anchor='property-address']")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    const root = companyDetailScrollRef.current;
    const target = root?.querySelector(`[data-error-anchor="${anchor}"]`);
    if (!(target instanceof HTMLElement) || !root) return;
    const top = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 24;
    root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function sectionForAnchor(anchor: string) {
    if (anchor.startsWith("company-suite-")) return "occupancy";
    if (anchor.startsWith("contact-email-")) return "contacts";
    return "information";
  }

  function openError(error: FieldError) {
    setActiveErrorId(error.id);
    if (error.companyId && error.companyId !== selectedId) {
      pendingErrorAnchorRef.current = error.anchor;
      setSelectedId(error.companyId);
      return;
    }
    if (error.companyId) setCompanyTab(sectionForAnchor(error.anchor));
    requestAnimationFrame(() => focusErrorAnchor(error.anchor));
  }

  useEffect(() => {
    const anchor = pendingErrorAnchorRef.current;
    if (anchor) {
      pendingErrorAnchorRef.current = null;
      setCompanyTab(sectionForAnchor(anchor));
      requestAnimationFrame(() => focusErrorAnchor(anchor));
      return;
    }
    setCompanyTab("information");
    companyDetailScrollRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);

  useEffect(() => {
    const root = companyDetailScrollRef.current;
    if (!root || !selected) return;

    function onScroll() {
      if (!root) return;
      const pending = pendingCompanyTabRef.current;
      if (pending) {
        if (pendingScrollTimerRef.current !== null) window.clearTimeout(pendingScrollTimerRef.current);
        pendingScrollTimerRef.current = window.setTimeout(() => {
          pendingCompanyTabRef.current = null;
          pendingScrollTimerRef.current = null;
        }, 150);
        return;
      }
      const rootTop = root.getBoundingClientRect().top;
      let current = companyTabs[0].id;
      for (const tab of companyTabs) {
        const heading = companySectionRefs.current[tab.id]?.querySelector("h3");
        if (heading && heading.getBoundingClientRect().top - rootTop <= companySectionOffset + 8) current = tab.id;
      }
      setCompanyTab(current);
    }

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (pendingScrollTimerRef.current !== null) window.clearTimeout(pendingScrollTimerRef.current);
      pendingCompanyTabRef.current = null;
    };
  }, [selected?.id]);

  function selectCompany(id: string) {
    setSelectedId(id);
  }

  function scrollToCompanySection(sectionId: string) {
    const root = companyDetailScrollRef.current;
    const section = companySectionRefs.current[sectionId];
    const heading = section?.querySelector("h3");
    const target = heading ?? section;
    if (!root || !target) return;
    setCompanyTab(sectionId);
    const top =
      sectionId === companyTabs[0].id
        ? 0
        : target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - companySectionOffset;
    const next = Math.max(0, Math.min(top, root.scrollHeight - root.clientHeight));
    if (Math.abs(next - root.scrollTop) < 1) return;
    pendingCompanyTabRef.current = sectionId;
    root.scrollTo({ top: next, behavior: "smooth" });
  }

  function updateCompanyField(key: keyof Company, value: string) {
    if (!selected) return;
    const patch: Partial<Company> =
      key === "floor"
        ? { floor: value, floorRange: value }
        : key === "suite"
          ? { suite: value, suiteRange: value }
          : { [key]: value };
    onChange(
      stamp({
        ...lead,
        companies: lead.companies.map((company) =>
          company.id === selected.id ? { ...company, ...patch } : company,
        ),
      }),
    );
  }

  function openAddCompanyModal() {
    setNewCompany(emptyCompany());
    setAddCompanyOpen(true);
  }

  function addCompany() {
    const created: Company = {
      ...newCompany,
      id: `c-${Date.now()}`,
      name: newCompany.name.trim() || "Untitled company",
      floorRange: newCompany.floor.trim(),
      suiteRange: newCompany.suite.trim(),
      status: "Cleaned",
    };
    onChange(stamp({ ...lead, companies: [...lead.companies, created] }));
    setSelectedId(created.id);
    setCompanyTab("information");
    setCompanyQuery("");
    setAddCompanyOpen(false);
    setNewCompany(emptyCompany());
  }

  function updateNewContact(id: string, patch: Partial<Contact>) {
    setNewCompany((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => (contact.id === id ? { ...contact, ...patch } : contact)),
    }));
  }

  function addNewContact() {
    setNewCompany((current) => ({
      ...current,
      contacts: [...current.contacts, { ...emptyContact(), id: `ct-${Date.now()}` }],
    }));
  }

  function removeNewContact(id: string) {
    setNewCompany((current) => ({
      ...current,
      contacts: current.contacts.filter((contact) => contact.id !== id),
    }));
  }

  function renderCompanyFormField(
    field: { key: keyof Company; label: string; placeholder?: string; kind?: "phone" | "date"; options?: string[] },
    value: string,
    onChange: (value: string) => void,
  ) {
    if (field.kind === "phone") {
      return (
        <PhoneField
          key={field.key}
          label={field.label}
          value={value}
          placeholder={field.placeholder}
          onChange={onChange}
        />
      );
    }
    if (field.kind === "date") {
      return (
        <TextField
          key={field.key}
          label={field.label}
          value={value}
          type="date"
          onChange={onChange}
        />
      );
    }
    if (field.options) {
      return (
        <SelectField
          key={field.key}
          label={field.label}
          value={value}
          placeholder={field.placeholder}
          options={field.options}
          onChange={onChange}
        />
      );
    }
    return (
      <TextField
        key={field.key}
        label={field.label}
        value={value}
        placeholder={field.placeholder}
        onChange={onChange}
      />
    );
  }

  function contactInitials(contact: Contact) {
    const letters = `${contact.firstName} ${contact.lastName}`
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2);
    return letters.join("").toUpperCase() || "?";
  }

  function contactDisplayName(contact: Contact) {
    const name = `${contact.firstName} ${contact.lastName}`.trim();
    return name;
  }

  function updateContact(contactId: string, patch: Partial<Contact>) {
    if (!selected) return;
    onChange(
      stamp({
        ...lead,
        companies: lead.companies.map((company) =>
          company.id === selected.id
            ? {
                ...company,
                contacts: company.contacts.map((contact) =>
                  contact.id === contactId ? { ...contact, ...patch } : contact,
                ),
              }
            : company,
        ),
      }),
    );
  }

  function addEmptyContact() {
    if (!selected) return;
    const nextContact = { ...emptyContact(), id: `ct-${Date.now()}` };
    onChange(
      stamp({
        ...lead,
        companies: lead.companies.map((company) =>
          company.id === selected.id ? { ...company, contacts: [...company.contacts, nextContact] } : company,
        ),
      }),
    );
  }

  function removeContact(contactId: string) {
    if (!selected) return;
    if (contactMode === "edit" && contactDraft.id === contactId) setContactMode(null);
    onChange(
      stamp({
        ...lead,
        companies: lead.companies.map((company) =>
          company.id === selected.id
            ? { ...company, contacts: company.contacts.filter((contact) => contact.id !== contactId) }
            : company,
        ),
      }),
    );
  }

  function saveContact() {
    if (!selected || !contactMode) return;
    const nextContact = contactMode === "add" ? { ...contactDraft, id: `ct-${Date.now()}` } : contactDraft;
    const contacts =
      contactMode === "add"
        ? [...selected.contacts, nextContact]
        : selected.contacts.map((contact) => (contact.id === nextContact.id ? nextContact : contact));
    onChange(
      stamp({
        ...lead,
        companies: lead.companies.map((company) => (company.id === selected.id ? { ...company, contacts } : company)),
      }),
    );
    setContactMode(null);
  }

  function updateLead(patch: Partial<Lead>) {
    onChange(stamp({ ...lead, ...patch }));
  }

  function confirmLeadAction() {
    if (leadConfirm === "archive") updateLead({ archived: true });
    if (leadConfirm === "enrich") updateLead({ status: "Enriched" });
    setLeadConfirm(null);
  }

  const tenancyValue = lead.tenancy.trim() && lead.tenancy !== "N/A" ? tenancyLabel(lead.tenancy) : "";

  return (
    <div className="lead-panel is-page">
      <div className="lead-page-body">
        <aside className="property-column">
          <div className="property-column-scroll">
          <div className="property-details">
        <header className="property-banner">
          <div className="property-banner-top">
            <button type="button" className="property-back" onClick={onBack}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <div className="property-banner-tools">
              <ActivityHint lead={lead} />
              <span className="property-banner-divider" aria-hidden="true" />
              <div className="menu-anchor property-more" ref={propertyMenuRef}>
              <button
                type="button"
                className="property-action-button"
                aria-haspopup="menu"
                aria-expanded={propertyMenuOpen}
                onClick={() => setPropertyMenuOpen((open) => !open)}
              >
                Action
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 6.2 8 10.2 12 6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {propertyMenuOpen && (
                <div className="menu property-more-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item property-more-enrich"
                    onClick={() => {
                      setPropertyMenuOpen(false);
                      setLeadConfirm("enrich");
                    }}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.2 8.2 6.4 11.4 12.8 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Mark Property as Enriched
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item property-more-archive"
                    onClick={() => {
                      setPropertyMenuOpen(false);
                      setLeadConfirm("archive");
                    }}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M2.25 3.25h11.5v2.1H2.25z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M3.15 5.35h9.7V12.2a.7.7 0 0 1-.7.7H3.85a.7.7 0 0 1-.7-.7V5.35z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M6.2 8.35h3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Archived
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
          <div className="property-banner-head">
            <div className="property-banner-heading">
              <div className="summary-title-row" data-error-anchor="property-address">
                <h1>
                  <AddressHeading
                    value={location}
                    invalid={activeError?.anchor === "property-address"}
                    onCommit={(value) => updateLead({ address: value })}
                  />
                </h1>
                {lead.archived && <span className="badge badge-neutral">Archived</span>}
              </div>
            </div>
          </div>

          <ol className="stepper" aria-label="Property status">
            {workflow.map((item, index) => {
              const state = index < step ? "done" : index === step ? "current" : "upcoming";
              return (
                <li
                  key={item.label}
                  className={`stepper-step is-${state}`}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className="stepper-title">{item.label}</span>
                </li>
              );
            })}
          </ol>

          <div className="property-facts">
            <div className="property-facts-summary">
              <InlineField
                label="Property Name"
                value={fieldValue(lead.name)}
                emptyLabel="Enter Property Name"
                onCommit={(value) => updateLead({ name: value })}
              />
              <InlineField
                label="Primary Vertical"
                value={fieldValue(lead.primaryVertical)}
                emptyLabel="Select Primary Vertical"
                options={withCurrentOption(lead.primaryVertical, propertyPrimaryVerticals)}
                onCommit={(value) => updateLead({ primaryVertical: value })}
              />
              <InlineField
                label="Address"
                value={fieldValue(lead.address)}
                emptyLabel="Enter Address"
                onCommit={(value) => updateLead({ address: value })}
              />
              <InlineField
                label="Tenancy"
                value={tenancyValue}
                emptyLabel="Select Tenancy"
                options={["Single-Tenant", "Multi-Tenant"]}
                onCommit={(value) => updateLead({ tenancy: value.replace(/-Tenant$/i, "") })}
              />
            </div>
            {propertyFactsExpanded && (
              <div className="property-facts-more">
                <InlineField
                  label="Country"
                  value={countryLabel(lead.country)}
                  emptyLabel="Select Country"
                  options={propertyCountries}
                  prefix={countryFlagPrefix(lead.country)}
                  onCommit={(value) => updateLead({ country: countryCode(value) })}
                />
                <InlineField
                  label="County"
                  value={fieldValue(lead.county)}
                  emptyLabel="Enter County"
                  onCommit={(value) => updateLead({ county: value })}
                />
                <InlineField
                  label="State"
                  value={fieldValue(lead.state)}
                  emptyLabel="Select State"
                  options={withCurrentOption(lead.state, propertyStates)}
                  onCommit={(value) => updateLead({ state: value })}
                />
                <InlineField
                  label="City"
                  value={fieldValue(lead.city)}
                  emptyLabel="Select City"
                  options={withCurrentOption(lead.city, propertyCities)}
                  onCommit={(value) => updateLead({ city: value })}
                />
                <InlineField
                  label="Zipcode"
                  value={fieldValue(lead.zipcode)}
                  emptyLabel="Enter Zipcode"
                  onCommit={(value) => updateLead({ zipcode: value })}
                />
                <InlineField
                  label="Land Area"
                  value={fieldValue(lead.landArea)}
                  emptyLabel="Enter Land Area"
                  onCommit={(value) => updateLead({ landArea: value })}
                />
                <InlineField
                  label="Amenities"
                  value={fieldValue(lead.amenities)}
                  emptyLabel="Enter Amenities (e.g Pool, Gym, Parking)"
                  onCommit={(value) => updateLead({ amenities: value })}
                />
                <InlineField
                  label="Parking Spaces"
                  value={fieldValue(lead.parkingSpaces)}
                  emptyLabel="Enter No. of Parking Spaces"
                  onCommit={(value) => updateLead({ parkingSpaces: value })}
                />
                <InlineField
                  label="Loading Docks"
                  value={fieldValue(lead.loadingDocks)}
                  emptyLabel="Enter Number of Loading Docks"
                  onCommit={(value) => updateLead({ loadingDocks: value })}
                />
                <InlineField
                  label="RBA"
                  value={fieldValue(lead.rba)}
                  emptyLabel="Enter RBA"
                  onCommit={(value) => updateLead({ rba: value })}
                />
                <InlineField
                  label="Building Status"
                  value={fieldValue(lead.buildingStatus)}
                  emptyLabel="Select Building Status"
                  options={withCurrentOption(lead.buildingStatus, propertyBuildingStatuses)}
                  onCommit={(value) => updateLead({ buildingStatus: value })}
                />
              </div>
            )}
            <button
              type="button"
              className="property-facts-toggle"
              aria-expanded={propertyFactsExpanded}
              onClick={() => setPropertyFactsExpanded((open) => !open)}
            >
              {propertyFactsExpanded ? "See less" : "See more"}
              <svg
                className={propertyFactsExpanded ? "property-facts-chevron is-up" : "property-facts-chevron"}
                viewBox="0 0 14 14"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.129 4.879a.5.5 0 0 1 .742 0L7 8.008l3.129-3.129a.5.5 0 1 1 .742.671l-3.5 3.5a.5.5 0 0 1-.742 0l-3.5-3.5a.5.5 0 0 1 0-.671Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </header>
          </div>
          <PropertyMap address={mapQuery} companies={lead.companies} floorCount={lead.floorCount} rba={lead.rba} />
          </div>
        </aside>

          <aside className="company-list-pane" aria-label="Companies at this property">
            <div className="company-list-head">
              <div className="company-list-head-row">
                <h2>Companies</h2>
                <div className="company-list-actions">
                  {lead.companies.length > 0 && (
                    <CompanySearch value={companyQuery} onChange={setCompanyQuery} />
                  )}
                  <button type="button" className="btn btn-sm btn-ghost-primary" onClick={openAddCompanyModal}>
                    + Add
                  </button>
                </div>
              </div>
              <p className="company-list-kicker">Companies at this Property</p>
            </div>
            {lead.companies.length === 0 ? (
              <p className="panel-empty company-list-empty">No companies at this property yet.</p>
            ) : visibleCompanies.length === 0 ? (
              <p className="panel-empty company-list-empty">No companies match “{companyQuery.trim()}”.</p>
            ) : (
              <ul className="company-list">
                {visibleCompanies.map((company) => {
                  const { floorText } = occupancyParts(company);
                  return (
                    <li key={company.id}>
                      <button
                        type="button"
                        className={company.id === selected?.id ? "company-list-item is-selected" : "company-list-item"}
                        onClick={() => selectCompany(company.id)}
                      >
                        <div className="company-list-item-header">
                          <h3 className="company-list-item-name">{company.name.trim() || "Company Name"}</h3>
                        </div>
                        <span className="company-list-item-meta">
                          {floorText ? <span>{floorText}</span> : <span>Floor info unavailable</span>}
                          <span className="banner-dot" aria-hidden="true" />
                          <span className={`company-list-item-status ${companyStatusClass(company.status)}`}>
                            {company.status}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <main className="company-detail-pane">
            {!selected && (
              <div className="company-detail-empty">
                <h2>No company selected</h2>
                <p className="panel-empty">Add a company to view details, occupancy, and contacts for this property.</p>
                <button type="button" className="btn btn-primary" onClick={openAddCompanyModal}>
                  + Add Company
                </button>
              </div>
            )}

            {selected && (
              <>
                <div className="company-detail-toolbar">
                  <div className="company-detail-title">
                    <h2>{selected.name.trim() || "Company Name"}</h2>
                    <p className="company-detail-meta">
                      {floorText ? <span>{floorText}</span> : <span>Floor info unavailable</span>}
                      <span className="banner-dot" aria-hidden="true" />
                      <span className={`company-detail-status ${companyStatusClass(selected.status)}`}>
                        {selected.status}
                        {selected.status === "Attention Required" && (
                          <img src="/assets/icon-error.svg" alt="" />
                        )}
                      </span>
                    </p>
                  </div>
                  <ErrorLogs logs={fieldErrors} activeId={activeErrorId} onSelect={openError} />
                </div>

                <div className="company-detail-body">
                  <div className="company-detail-content">
                    <nav className="detail-tabs company-detail-tabs" aria-label="Company sections">
                      {companyTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          className={companyTab === tab.id ? "is-active" : ""}
                          onClick={() => scrollToCompanySection(tab.id)}
                        >
                          {tab.label}
                          {tab.id === "contacts" && ` (${selected?.contacts.length ?? 0})`}
                        </button>
                      ))}
                    </nav>

                    <div ref={companyDetailScrollRef} className="company-detail-scroll">
                  <section
                    className="company-detail-section"
                    data-section="information"
                    aria-labelledby="company-section-information"
                    ref={(node) => {
                      companySectionRefs.current.information = node;
                    }}
                  >
                    <h3 id="company-section-information" className="company-detail-section-title">
                      Company Information
                    </h3>
                    <div className="kv-table">
                      {companyFields.map((field) => (
                        <InlineField
                          key={field.key}
                          label={field.label}
                          value={String(selected[field.key] ?? "")}
                          emptyLabel={field.placeholder}
                          inputType={field.kind === "date" ? "date" : "text"}
                          options={field.options ? withCurrentOption(String(selected[field.key] ?? ""), field.options) : undefined}
                          prefix={
                            field.key === "phone"
                              ? phoneFlagPrefix(String(selected.phone ?? ""), lead.country)
                              : undefined
                          }
                          onCommit={(value) => updateCompanyField(field.key, value)}
                        />
                      ))}
                      <InlineField
                        label="Parent Company"
                        emptyLabel="Enter Parent Company"
                        tone="parent"
                        value={selected.parentCompany ?? ""}
                        suffix={
                          parentPropertyId && (selected.parentCompany ?? "").trim() ? (
                            <button
                              type="button"
                              className="company-parent-link"
                              aria-label={`Open another property for ${selected.parentCompany}`}
                              onClick={() => onOpenLead(parentPropertyId)}
                            >
                              <svg viewBox="0 0 16 16" aria-hidden="true">
                                <path
                                  d="M4.5 11.5 11.5 4.5M6.5 4.5h5v5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          ) : undefined
                        }
                        onCommit={(value) => updateCompanyField("parentCompany", value)}
                      />
                    </div>
                  </section>

                  <section
                    className="company-detail-section"
                    data-section="occupancy"
                    aria-labelledby="company-section-occupancy"
                    ref={(node) => {
                      companySectionRefs.current.occupancy = node;
                    }}
                  >
                    <h3 id="company-section-occupancy" className="company-detail-section-title">
                      Property Occupancy
                    </h3>
                    <div className="kv-table">
                      {occupancyFields.map((field) => (
                        <InlineField
                          key={field.key}
                          label={field.label}
                          value={
                            field.key === "floor"
                              ? occupancyFloorValue(selected)
                              : field.key === "suite"
                                ? occupancySuiteValue(selected)
                                : String(selected[field.key] ?? "")
                          }
                          invalid={field.key === "suite" && activeError?.anchor === `company-suite-${selected.id}`}
                          anchorId={field.key === "suite" ? `company-suite-${selected.id}` : undefined}
                          onCommit={(value) => updateCompanyField(field.key, value)}
                        />
                      ))}
                      {occupancyDateFields.map((field) => (
                        <InlineField
                          key={field.key}
                          label={field.label}
                          value={selected[field.key]}
                          emptyLabel="MM/DD/YYYY"
                          inputType="date"
                          onCommit={(value) => updateCompanyField(field.key, value)}
                        />
                      ))}
                      <ContactOwnerAffiliationChips
                        label="Property Affiliation"
                        options={propertyAffiliationOptions}
                        emptyLabel="Select Property Affiliation"
                        value={selected.propertyAffiliation}
                        onChange={(value) => updateCompanyField("propertyAffiliation", value)}
                      />
                    </div>
                  </section>

                  <section
                    className="company-detail-section"
                    data-section="contacts"
                    aria-labelledby="company-section-contacts"
                    ref={(node) => {
                      companySectionRefs.current.contacts = node;
                    }}
                  >
                    <h3 id="company-section-contacts" className="company-detail-section-title">
                      Contacts ({selected.contacts.length})
                    </h3>
                      {selected.contacts.length === 0 && (
                        <p className="panel-empty">No contacts for this company yet.</p>
                      )}
                      <div className="contact-grid">
                        {selected.contacts.map((contact) => (
                          <article key={contact.id} className="contact-card">
                            <div className="contact-card-head">
                              <span className="contact-initials" aria-hidden="true">
                                {contactInitials(contact)}
                              </span>
                              <div className="contact-card-title">
                                <div className="contact-card-name-field">
                                  <InlineField
                                    hideLabel
                                    label="Name"
                                    value={contactDisplayName(contact)}
                                    emptyLabel="Contact Name"
                                    onCommit={(value) => {
                                      const parts = value.trim().split(/\s+/).filter(Boolean);
                                      updateContact(contact.id, {
                                        firstName: parts[0] ?? "",
                                        lastName: parts.slice(1).join(" "),
                                      });
                                    }}
                                  />
                                </div>
                                <div className="contact-card-email-field">
                                  <InlineField
                                    hideLabel
                                    label="Email"
                                    value={contact.email}
                                    emptyLabel="Enter Email"
                                    invalid={activeError?.anchor === `contact-email-${contact.id}`}
                                    anchorId={`contact-email-${contact.id}`}
                                    onCommit={(value) => updateContact(contact.id, { email: value })}
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                className="contact-card-remove"
                                onClick={() => removeContact(contact.id)}
                              >
                                <svg viewBox="0 0 16 16" aria-hidden="true" fill="none">
                                  <path
                                    d="M6.15 2.35h3.7a.5.5 0 0 1 .5.5v.95M3.35 4.3h9.3"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M4.45 4.3v8.05a1.15 1.15 0 0 0 1.15 1.15h4.8a1.15 1.15 0 0 0 1.15-1.15V4.3"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M6.65 7.05v3.35M9.35 7.05v3.35"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                Delete
                              </button>
                            </div>
                            <div className="contact-card-row contact-card-row-2">
                              <ContactOwnerAffiliationChips
                                value={contact.ownerAffiliation}
                                onChange={(next) => updateContact(contact.id, { ownerAffiliation: next })}
                              />
                              <InlineField
                                label="Title"
                                value={contact.title}
                                emptyLabel="Enter Title"
                                onCommit={(value) => updateContact(contact.id, { title: value })}
                              />
                            </div>
                            <div className="contact-card-row contact-card-row-2">
                              <InlineField
                                label="Phone Number"
                                value={contact.phone}
                                emptyLabel="Enter Phone Number"
                                prefix={phoneFlagPrefix(contact.phone, contact.country || lead.country)}
                                onCommit={(value) => updateContact(contact.id, { phone: value })}
                              />
                              <InlineField
                                label="Cell Number"
                                value={contact.cell}
                                emptyLabel="Enter Cell Number"
                                prefix={phoneFlagPrefix(contact.cell, contact.country || lead.country)}
                                onCommit={(value) => updateContact(contact.id, { cell: value })}
                              />
                            </div>
                            <div className="contact-card-row contact-card-row-2">
                              <InlineField
                                label="Address"
                                value={contact.address}
                                emptyLabel="Enter Address"
                                onCommit={(value) => updateContact(contact.id, { address: value })}
                              />
                              <InlineField
                                label="Country"
                                value={countryLabel(contact.country)}
                                emptyLabel="Country"
                                options={propertyCountries}
                                prefix={countryFlagPrefix(contact.country)}
                                onCommit={(value) => updateContact(contact.id, { country: countryCode(value) })}
                              />
                            </div>
                            <div className="contact-card-row contact-card-row-2">
                              <InlineField
                                label="State"
                                value={fieldValue(contact.state)}
                                emptyLabel="State"
                                options={withCurrentOption(contact.state, propertyStates)}
                                onCommit={(value) => updateContact(contact.id, { state: value })}
                              />
                              <InlineField
                                label="City"
                                value={fieldValue(contact.city)}
                                emptyLabel="City"
                                options={withCurrentOption(contact.city, propertyCities)}
                                onCommit={(value) => updateContact(contact.id, { city: value })}
                              />
                            </div>
                            <div className="contact-card-row contact-card-row-2">
                              <InlineField
                                label="Zipcode"
                                value={contact.zipcode}
                                emptyLabel="Enter Zipcode"
                                onCommit={(value) => updateContact(contact.id, { zipcode: value })}
                              />
                            </div>
                          </article>
                        ))}
                        <button
                          type="button"
                          className="contact-add"
                          onClick={addEmptyContact}
                        >
                          <span className="contact-add-icon" aria-hidden="true">
                            <svg viewBox="0 0 16 16">
                              <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
                              <path d="M8 5.1v5.8M5.1 8h5.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                          </span>
                          Add Contact
                        </button>
                      </div>
                  </section>
                      <div className="company-detail-scroll-spacer" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
      </div>

      {leadConfirm && (
        <div className="modal-backdrop" onClick={() => setLeadConfirm(null)}>
          <div
            className="modal confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="icon-button confirm-close" aria-label="Close" onClick={() => setLeadConfirm(null)}>
              ×
            </button>
            <span className={leadConfirm === "archive" ? "confirm-icon is-archive" : "confirm-icon is-enrich"} aria-hidden="true">
              {leadConfirm === "archive" ? (
                <svg viewBox="0 0 16 16">
                  <path d="M2.25 3.25h11.5v2.1H2.25z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M3.15 5.35h9.7V12.2a.7.7 0 0 1-.7.7H3.85a.7.7 0 0 1-.7-.7V5.35z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M6.2 8.35h3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16">
                  <path d="M3.2 8.2 6.4 11.4 12.8 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <h2 id="lead-confirm-title">{leadConfirm === "archive" ? "Archive Lead" : "Mark as Enriched"}</h2>
            <p>
              {leadConfirm === "archive"
                ? "Are you sure you want to archive this lead?"
                : "Are you sure you want to mark this lead as enriched?"}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setLeadConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={leadConfirm === "archive" ? "btn btn-danger" : "btn btn-primary"}
                onClick={confirmLeadAction}
              >
                {leadConfirm === "archive" ? "Archive" : "Mark as Enriched"}
              </button>
            </div>
          </div>
        </div>
      )}

      {addCompanyOpen && (
        <div className="modal-backdrop" onClick={() => setAddCompanyOpen(false)}>
          <form
            className="modal modal-wide modal-company"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              addCompany();
            }}
          >
            <div className="drawer-head">
              <h2>Add Company</h2>
              <button type="button" className="icon-button" aria-label="Close" onClick={() => setAddCompanyOpen(false)}>
                ×
              </button>
            </div>
            <div className="company-modal-sections">
              <section className="company-modal-section">
                <h3>Company Information</h3>
                <div className="company-modal-fields kv-edit">
                  {companyFields.map((field) =>
                    renderCompanyFormField(
                      field,
                      String(newCompany[field.key] ?? ""),
                      (value) => setNewCompany((current) => ({ ...current, [field.key]: value })),
                    ),
                  )}
                  <TextField
                    label="Parent Company"
                    value={newCompany.parentCompany ?? ""}
                    placeholder="Enter Parent Company"
                    onChange={(value) => setNewCompany((current) => ({ ...current, parentCompany: value }))}
                  />
                </div>
              </section>

              <section className="company-modal-section">
                <h3>Property Occupancy</h3>
                <div className="company-modal-fields kv-edit">
                  {occupancyFields.map((field) =>
                    renderCompanyFormField(
                      field,
                      String(newCompany[field.key] ?? ""),
                      (value) => setNewCompany((current) => ({ ...current, [field.key]: value })),
                    ),
                  )}
                  {occupancyDateFields.map((field) =>
                    renderCompanyFormField(
                      { ...field, placeholder: "MM/DD/YYYY", kind: "date" },
                      newCompany[field.key],
                      (value) => setNewCompany((current) => ({ ...current, [field.key]: value })),
                    ),
                  )}
                  <ContactOwnerAffiliationChips
                    label="Property Affiliation"
                    options={propertyAffiliationOptions}
                    emptyLabel="Select Property Affiliation"
                    value={newCompany.propertyAffiliation}
                    onChange={(value) => setNewCompany((current) => ({ ...current, propertyAffiliation: value }))}
                  />
                </div>
              </section>

              <section className="company-modal-section">
                <div className="company-modal-section-head">
                  <h3>Contacts ({newCompany.contacts.length})</h3>
                  <button type="button" className="btn btn-sm btn-ghost-primary" onClick={addNewContact}>
                    + Add Contact
                  </button>
                </div>
                {newCompany.contacts.length === 0 && (
                  <p className="panel-empty">No contacts for this company yet.</p>
                )}
                {newCompany.contacts.map((contact, index) => (
                  <div className="company-modal-contact" key={contact.id}>
                    <div className="company-modal-section-head">
                      <h4>Contact {index + 1}</h4>
                      <button type="button" className="btn btn-sm" onClick={() => removeNewContact(contact.id)}>
                        Remove
                      </button>
                    </div>
                    <div className="company-modal-fields kv-edit">
                      {contactFields.map((field) => {
                        const onChange = (value: string) => updateNewContact(contact.id, { [field.key]: value });
                        if (field.key === "ownerAffiliation") {
                          return (
                            <ContactOwnerAffiliationChips
                              key={field.key}
                              label={field.label}
                              options={field.options}
                              emptyLabel={field.placeholder}
                              value={contact.ownerAffiliation}
                              onChange={onChange}
                            />
                          );
                        }
                        if (field.kind === "phone") {
                          return (
                            <PhoneField
                              key={field.key}
                              label={field.label}
                              value={contact[field.key]}
                              placeholder={field.placeholder}
                              onChange={onChange}
                            />
                          );
                        }
                        if (field.options) {
                          const isCountry = field.key === "country";
                          const current = isCountry ? countryLabel(contact.country) : contact[field.key];
                          return (
                            <SelectField
                              key={field.key}
                              label={field.label}
                              value={current}
                              placeholder={field.placeholder}
                              options={withCurrentOption(current, field.options)}
                              onChange={(value) => onChange(isCountry ? countryCode(value) : value)}
                            />
                          );
                        }
                        return (
                          <TextField
                            key={field.key}
                            label={field.label}
                            value={contact[field.key]}
                            placeholder={field.placeholder}
                            onChange={onChange}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setAddCompanyOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Company
              </button>
            </div>
          </form>
        </div>
      )}

      {contactMode && (
        <div className="modal-backdrop" onClick={() => setContactMode(null)}>
          <form
            className="modal modal-wide modal-company"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              saveContact();
            }}
          >
            <div className="drawer-head">
              <h2>{contactMode === "add" ? "Add Contact" : "Edit Contact"}</h2>
              <button type="button" className="icon-button" aria-label="Close" onClick={() => setContactMode(null)}>
                ×
              </button>
            </div>
            <div className="company-modal-fields kv-edit">
              {contactFields.map((field) => {
                const onChange = (value: string) =>
                  setContactDraft((current) => ({ ...current, [field.key]: value }));
                if (field.options) {
                  const isCountry = field.key === "country";
                  const current = isCountry ? countryLabel(contactDraft.country) : contactDraft[field.key];
                  return (
                    <SelectField
                      key={field.key}
                      label={field.label}
                      value={current}
                      placeholder={field.placeholder}
                      options={withCurrentOption(current, field.options)}
                      onChange={(value) => onChange(isCountry ? countryCode(value) : value)}
                    />
                  );
                }
                if (field.kind === "phone") {
                  return (
                    <PhoneField
                      key={field.key}
                      label={field.label}
                      value={contactDraft[field.key]}
                      placeholder={field.placeholder}
                      onChange={onChange}
                    />
                  );
                }
                return (
                  <TextField
                    key={field.key}
                    label={field.label}
                    value={contactDraft[field.key]}
                    placeholder={field.placeholder}
                    onChange={onChange}
                  />
                );
              })}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setContactMode(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {contactMode === "add" ? "Add Contact" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
