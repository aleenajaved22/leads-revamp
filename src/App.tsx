import { useEffect, useMemo, useRef, useState } from "react";
import {
  addressChoices,
  columns,
  emptyCompany,
  emptyContact,
  filterGroups,
  initialLeads,
  officers,
  pageSizeOptions,
  parentCompanyNames,
  primaryVerticalOptions,
  parseDate,
  propertyAffiliationOptions,
  type Assignee,
  type Column,
  type ColumnKey,
  type Contact,
  type Lead,
  type Status,
} from "./data";
import { ContactFormFields } from "./ContactFormFields";
import { LeadDetail } from "./LeadDetail";
import { SearchableSelect } from "./SearchableSelect";

type SortKey = ColumnKey;
type SortDir = "asc" | "desc";
type Menu = "export" | "country" | "profile" | "notifications" | "sort" | "pageSize" | null;

const createLeadSteps = ["Property details", "Companies", "Contacts"] as const;

const createStates = ["California", "Texas", "Delaware", "Illinois", "Ohio", "Florida", "New York", "Pennsylvania", "Tennessee"];
const createCities = ["San Francisco", "Los Angeles", "Chicago", "Houston", "Austin", "Celina", "Santa Ana", "Pembroke Pines", "Toledo", "Naperville"];

function withCurrentOption(value: string, options: string[]) {
  if (!value || options.includes(value)) return options;
  return [value, ...options];
}

type CreateLeadCompanyDraft = {
  id: string;
  companyName: string;
  parentCompany: string;
  propertyAffiliation: string;
  contacts: Contact[];
};

function emptyCreateCompanyDraft(): CreateLeadCompanyDraft {
  return {
    id: `draft-co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    companyName: "",
    parentCompany: "",
    propertyAffiliation: "",
    contacts: [],
  };
}

function emptyCreateDraft() {
  return {
    name: "",
    primaryVertical: "",
    address: "",
    country: "",
    county: "",
    state: "",
    city: "",
    zipcode: "",
    status: "Raw" as Status,
    companies: [emptyCreateCompanyDraft()],
  };
}

const showHideOrder: ColumnKey[] = [
  "name",
  "address",
  "country",
  "county",
  "state",
  "city",
  "zipcode",
  "buildingStatus",
  "status",
  "assignee",
  "processed",
  "primaryVertical",
  "added",
  "addedBy",
  "modified",
  "modifiedBy",
  "source",
  "dataType",
  "tenancy",
  "landArea",
  "amenities",
  "rba",
  "loadingDocks",
  "parkingSpaces",
  "validation",
];

const rearrangeOrder: ColumnKey[] = [
  "address",
  "name",
  "status",
  "primaryVertical",
  "country",
  "county",
  "state",
  "city",
  "zipcode",
  "tenancy",
  "landArea",
  "amenities",
  "parkingSpaces",
  "loadingDocks",
  "rba",
  "buildingStatus",
  "assignee",
  "processed",
  "added",
  "addedBy",
  "modified",
  "modifiedBy",
  "source",
  "dataType",
  "validation",
];

const columnByKey = new Map(columns.map((column) => [column.key, column]));

function Icon({ src, alt = "" }: { src: string; alt?: string }) {
  return <img src={src} alt={alt} />;
}

function statusClass(status: Status) {
  return `badge badge-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

function readLeadRoute(): { id: string | null; full: boolean; create: boolean } {
  if (window.location.pathname === "/leads/new") {
    return { id: null, full: false, create: true };
  }
  const hashMatch = window.location.hash.match(/^#\/leads\/([^/]+)(\/full)?$/);
  if (hashMatch) return { id: decodeURIComponent(hashMatch[1]), full: true, create: false };
  const pathMatch = window.location.pathname.match(/^\/leads\/([^/]+)(\/full)?$/);
  if (pathMatch) return { id: decodeURIComponent(pathMatch[1]), full: true, create: false };
  return { id: null, full: false, create: false };
}

function leadValue(lead: Lead, key: ColumnKey) {
  if (key === "assignee") return lead.assignee?.name ?? "Assign";
  return lead[key];
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "saved">("all");
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [menu, setMenu] = useState<Menu>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [createLeadStep, setCreateLeadStep] = useState(0);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(rearrangeOrder);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set());
  const [draftOrder, setDraftOrder] = useState<ColumnKey[]>(rearrangeOrder);
  const [draftHidden, setDraftHidden] = useState<Set<ColumnKey>>(new Set());
  const [columnQuery, setColumnQuery] = useState("");
  const dragKey = useRef<ColumnKey | null>(null);
  const [route, setRoute] = useState(readLeadRoute);
  const openLeadId = route.id;
  const [draft, setDraft] = useState(emptyCreateDraft);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function syncLeadFromHash() {
      setRoute(readLeadRoute());
    }
    window.addEventListener("hashchange", syncLeadFromHash);
    window.addEventListener("popstate", syncLeadFromHash);
    return () => {
      window.removeEventListener("hashchange", syncLeadFromHash);
      window.removeEventListener("popstate", syncLeadFromHash);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-menu]") || target.closest("[data-menu-trigger]")) return;
      setMenu(null);
      if (!target.closest("[data-assign]")) setAssignFor(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
        setAssignFor(null);
        if (window.location.pathname === "/leads/new") {
          window.history.pushState({}, "", "/leads");
          setRoute(readLeadRoute());
        }
        setCustomizeOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = leads.filter((lead) => {
      if (q) {
        const haystack = [lead.name, lead.address, lead.city, lead.state, lead.zipcode, lead.source]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (savedId === "unassigned" && lead.assignee) return false;
      if (savedId === "attention" && lead.status !== "Attention Required") return false;
      for (const group of filterGroups) {
        const picked = activeFilters[group.id];
        if (!picked?.length || !group.field) continue;
        if (!picked.includes(String(leadValue(lead, group.field)))) return false;
      }
      return true;
    });
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const left = leadValue(a, sort.key);
        const right = leadValue(b, sort.key);
        const dateKeys: SortKey[] = ["added", "modified"];
        const result = dateKeys.includes(sort.key)
          ? parseDate(left) - parseDate(right)
          : left.localeCompare(right, undefined, { numeric: true });
        return sort.dir === "asc" ? result : -result;
      });
    }
    return rows;
  }, [leads, query, activeFilters, savedId, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const defaultView =
    safePage === 1 &&
    pageSize === 15 &&
    !query &&
    !savedId &&
    !sort &&
    Object.values(activeFilters).every((values) => !values?.length);
  const rangeLabel = defaultView
    ? "1-15 of 12,345"
    : filtered.length === 0
      ? "0 of 0"
      : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`;

  const visibleColumns = columnOrder
    .map((key) => columnByKey.get(key))
    .filter((column): column is Column => column != null && !hiddenColumns.has(column.key));
  const allChecked = pageRows.length > 0 && pageRows.every((lead) => selected.has(lead.id));

  function toggleMenu(next: Menu) {
    setMenu((current) => (current === next ? null : next));
    setAssignFor(null);
  }

  function toggleSort(key: SortKey) {
    setPage(1);
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  function toggleFilterValue(groupId: string, value: string) {
    setPage(1);
    setSavedId(null);
    setActiveFilters((current) => {
      const existing = current[groupId] ?? [];
      const next = existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value];
      return { ...current, [groupId]: next };
    });
  }

  function openCustomize() {
    setMenu(null);
    setDraftOrder(columnOrder);
    setDraftHidden(new Set(hiddenColumns));
    setColumnQuery("");
    setCustomizeOpen(true);
  }

  function toggleDraftColumn(key: ColumnKey) {
    setDraftHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleHideAll(hide: boolean) {
    setDraftHidden(hide ? new Set(showHideOrder) : new Set());
  }

  function resetColumns() {
    setDraftOrder(rearrangeOrder);
    setDraftHidden(new Set());
    setColumnQuery("");
  }

  function applyColumns() {
    setColumnOrder(draftOrder);
    setHiddenColumns(new Set(draftHidden));
    setCustomizeOpen(false);
  }

  function moveDraftColumn(overKey: ColumnKey) {
    const key = dragKey.current;
    if (!key || key === overKey) return;
    setDraftOrder((current) => {
      const next = [...current];
      const from = next.indexOf(key);
      const to = next.indexOf(overKey);
      if (from < 0 || to < 0) return current;
      next.splice(from, 1);
      next.splice(to, 0, key);
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      pageRows.forEach((lead) => {
        if (checked) next.add(lead.id);
        else next.delete(lead.id);
      });
      return next;
    });
  }

  function navigateLead(id: string | null) {
    const path = id ? `/leads/${encodeURIComponent(id)}/full` : "/leads";
    if (window.location.pathname !== path || window.location.hash) {
      window.history.pushState({ leadId: id }, "", path);
    }
    setRoute({ id, full: Boolean(id), create: false });
  }

  function openLeadPage(id: string) {
    navigateLead(id);
  }

  function closeLead() {
    navigateLead(null);
  }

  function openCreateLeadPage() {
    setDraft(emptyCreateDraft());
    setCreateLeadStep(0);
    window.history.pushState({}, "", "/leads/new");
    setRoute(readLeadRoute());
  }

  function closeCreateLeadPage() {
    navigateLead(null);
  }

  function updateLead(next: Lead) {
    setLeads((current) => current.map((lead) => (lead.id === next.id ? next : lead)));
  }

  function assign(id: string, assignee: Assignee | null) {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, assignee } : lead)));
    setAssignFor(null);
  }

  function exportCsv() {
    const header = visibleColumns.map((column) => column.label).join(",");
    const body = filtered
      .map((lead) => visibleColumns.map((column) => `"${leadValue(lead, column.key).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leads.csv";
    link.click();
    URL.revokeObjectURL(url);
    setMenu(null);
  }

  function importCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
      const imported: Lead[] = lines.slice(start).map((line, index) => {
        const [name = "", address = "", state = ""] = line.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
        return {
          id: `import-${Date.now()}-${index}`,
          name: name || "Untitled lead",
          zipcode: "N/A",
          city: "N/A",
          status: "Raw",
          address: address || "N/A",
          country: "US",
          county: "N/A",
          state: state || "N/A",
          buildingStatus: "Existing",
          assignee: null,
          processed: "N/A",
          primaryVertical: "Commercial",
          added: new Date().toLocaleDateString("en-GB"),
          addedBy: "N/A",
          modified: "N/A",
          modifiedBy: "N/A",
          source: "Import",
          dataType: "Csv",
          tenancy: "Single",
          landArea: "N/A",
          amenities: "N/A",
          rba: "N/A",
          loadingDocks: "N/A",
          parkingSpaces: "N/A",
          validation: "Validation In Process",
          companies: [],
        };
      });
      if (imported.length) {
        setLeads((current) => [...imported, ...current]);
        setPage(1);
      }
    };
    reader.readAsText(file);
  }

  function updateCreateCompany(companyId: string, patch: Partial<CreateLeadCompanyDraft>) {
    setDraft((current) => ({
      ...current,
      companies: current.companies.map((company) =>
        company.id === companyId ? { ...company, ...patch } : company,
      ),
    }));
  }

  function addCreateCompany() {
    setDraft((current) => ({
      ...current,
      companies: [...current.companies, emptyCreateCompanyDraft()],
    }));
  }

  function removeCreateCompany(companyId: string) {
    setDraft((current) => ({
      ...current,
      companies: current.companies.filter((company) => company.id !== companyId),
    }));
  }

  function updateCreateCompanyContact(companyId: string, contactId: string, patch: Partial<Contact>) {
    setDraft((current) => ({
      ...current,
      companies: current.companies.map((company) =>
        company.id === companyId
          ? {
              ...company,
              contacts: company.contacts.map((contact) =>
                contact.id === contactId ? { ...contact, ...patch } : contact,
              ),
            }
          : company,
      ),
    }));
  }

  function addCreateCompanyContact(companyId: string) {
    setDraft((current) => ({
      ...current,
      companies: current.companies.map((company) =>
        company.id === companyId
          ? {
              ...company,
              contacts: [...company.contacts, { ...emptyContact(), id: `ct-${Date.now()}` }],
            }
          : company,
      ),
    }));
  }

  function removeCreateCompanyContact(companyId: string, contactId: string) {
    setDraft((current) => ({
      ...current,
      companies: current.companies.map((company) =>
        company.id === companyId
          ? { ...company, contacts: company.contacts.filter((contact) => contact.id !== contactId) }
          : company,
      ),
    }));
  }

  function applyAddress(address: string) {
    const match = addressChoices(leads).find((item) => item.address === address);
    setDraft((current) => ({
      ...current,
      address,
      country: match?.country ?? "",
      county: match?.county ?? "",
      state: match?.state ?? "",
      city: match?.city ?? "",
      zipcode: match?.zipcode ?? "",
    }));
  }

  function isCreateLeadPropertyStepValid() {
    return [
      draft.primaryVertical,
      draft.address.trim(),
      draft.country,
      draft.county.trim(),
      draft.state,
      draft.city,
      draft.zipcode.trim(),
    ].every(Boolean);
  }

  function isCreateLeadCompaniesStepValid() {
    return draft.companies.some((company) => company.companyName.trim());
  }

  function goToNextCreateLeadStep() {
    if (createLeadStep === 0 && !isCreateLeadPropertyStepValid()) return;
    if (createLeadStep === 1 && !isCreateLeadCompaniesStepValid()) return;
    setCreateLeadStep((step) => Math.min(step + 1, createLeadSteps.length - 1));
  }

  function goToPreviousCreateLeadStep() {
    setCreateLeadStep((step) => Math.max(step - 1, 0));
  }

  function createLead() {
    const propertyRequired = [
      draft.primaryVertical,
      draft.address.trim(),
      draft.country,
      draft.county.trim(),
      draft.state,
      draft.city,
      draft.zipcode.trim(),
    ];
    if (propertyRequired.some((value) => !value)) return;
    const namedCompanies = draft.companies.filter((company) => company.companyName.trim());
    if (namedCompanies.length === 0) return;

    const leadId = Date.now();
    const firstCompanyName = namedCompanies[0]?.companyName.trim() ?? "";
    const propertyName = draft.name.trim() || firstCompanyName;
    const lead: Lead = {
      id: `new-${leadId}`,
      name: propertyName,
      zipcode: draft.zipcode.trim(),
      city: draft.city,
      status: "Raw",
      address: draft.address.trim(),
      country: "US",
      county: draft.county.trim(),
      state: draft.state,
      buildingStatus: "Existing",
      assignee: null,
      processed: "N/A",
      primaryVertical: draft.primaryVertical,
      added: new Date().toLocaleDateString("en-GB"),
      addedBy: "Aleena",
      modified: "N/A",
      modifiedBy: "N/A",
      source: "Manual",
      dataType: "Csv",
      tenancy: "N/A",
      landArea: "N/A",
      amenities: "N/A",
      rba: "N/A",
      loadingDocks: "N/A",
      parkingSpaces: "N/A",
      validation: "Validation In Process",
      companies: namedCompanies.map((company, index) => ({
        ...emptyCompany(),
        id: `c-${leadId}-${index}`,
        name: company.companyName.trim(),
        parentCompany: company.parentCompany.trim() || undefined,
        propertyAffiliation: company.propertyAffiliation,
        contacts: company.contacts,
        status: "Cleaned" as Status,
      })),
    };
    setLeads((current) => [lead, ...current]);
    setPage(1);
    setDraft(emptyCreateDraft());
    openLeadPage(lead.id);
  }

  const isCreateLeadPage = route.create;
  const openLead = !isCreateLeadPage && openLeadId ? (leads.find((lead) => lead.id === openLeadId) ?? null) : null;

  const leadDetail = openLead && (
    <LeadDetail
      lead={openLead}
      leads={leads}
      onOpenLead={openLeadPage}
      onChange={updateLead}
      onCreateLead={(created) => {
        setLeads((current) => [created, ...current]);
        setPage(1);
      }}
      onBack={closeLead}
    />
  );

  return (
    <div className="app" ref={rootRef}>
      <header className="nav">
        <div className="nav-brand">
          <img className="logo" src="/assets/logo.svg" alt="Signal" />
          <span className="nav-divider" aria-hidden="true">
            <img src="/assets/divider.svg" alt="" />
          </span>
          <p className="product-name">Leads Management</p>
        </div>
        <nav className="nav-links" aria-label="Primary">
          <button type="button" className="nav-link">
            <Icon src="/assets/icon-dashboard.svg" alt="" />
            Dashboard
          </button>
          <button type="button" className="nav-link is-active" aria-current="page" onClick={closeLead}>
            <Icon src="/assets/icon-leads.svg" alt="" />
            Leads
          </button>
          <button type="button" className="nav-link">
            <Icon src="/assets/icon-activity.svg" alt="" />
            Activity Logs
          </button>
        </nav>
        <div className="nav-tools">
          <div className="menu-anchor">
            <button
              type="button"
              className="country"
              data-menu-trigger
              aria-expanded={menu === "country"}
              onClick={() => toggleMenu("country")}
            >
              <span className="flag">
                <img src="/assets/flag-usa.png" alt="" />
              </span>
              <span>USA</span>
              <Icon src="/assets/chevron-down.svg" alt="" />
            </button>
            {menu === "country" && (
              <div className="menu" data-menu role="menu">
                <button type="button" className="menu-item is-selected" role="menuitem">
                  USA
                </button>
              </div>
            )}
          </div>
          <div className="menu-anchor">
            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
              data-menu-trigger
              aria-expanded={menu === "notifications"}
              onClick={() => toggleMenu("notifications")}
            >
              <Icon src="/assets/icon-bell.svg" alt="" />
            </button>
            {menu === "notifications" && (
              <div className="menu menu-wide" data-menu>
                <p className="menu-title">Notifications</p>
                <p className="menu-note">You're all caught up.</p>
              </div>
            )}
          </div>
          <div className="menu-anchor">
            <button
              type="button"
              className="profile"
              data-menu-trigger
              aria-expanded={menu === "profile"}
              onClick={() => toggleMenu("profile")}
            >
              <img className="profile-photo" src="/assets/avatar-aleena.png" alt="" />
              <span className="profile-text">
                <span className="profile-name">Aleena</span>
                <span className="profile-role">Admin</span>
              </span>
              <Icon src="/assets/chevron-down-sm.svg" alt="" />
            </button>
            {menu === "profile" && (
              <div className="menu" data-menu>
                <p className="menu-title">Aleena</p>
                <p className="menu-note">Admin</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {openLead && leadDetail}

      {isCreateLeadPage && (
        <div className="create-lead-page">
          <form
            className="create-lead-page-form modal-create-lead"
            onSubmit={(event) => {
              event.preventDefault();
              if (createLeadStep === createLeadSteps.length - 1) createLead();
            }}
          >
            <div className="create-lead-page-scroll">
              <div className="create-lead-page-inner">
              <div className="create-lead-page-top">
                <button type="button" className="property-back" onClick={closeCreateLeadPage}>
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M10 3.5 5.5 8 10 12.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </button>
                <div className="create-lead-page-heading">
                  <h1>Create a Lead</h1>
                  <p className="modal-create-helper">Enter the details below to create a new lead</p>
                </div>
              </div>
              <ol className="stepper create-lead-stepper" aria-label="Create a lead steps">
                {createLeadSteps.map((label, index) => {
                  const state = index < createLeadStep ? "done" : index === createLeadStep ? "current" : "upcoming";
                  return (
                    <li
                      key={label}
                      className={`stepper-step is-${state}`}
                      aria-current={state === "current" ? "step" : undefined}
                    >
                      <span className="stepper-title">{label}</span>
                    </li>
                  );
                })}
              </ol>
              <div className="create-lead-step-panel">
                {createLeadStep === 0 && (
                <section className="create-lead-section">
                  <div className="create-fields">
                    <div className="create-fields-row">
                      <label className="create-field-span-2">
                        <span>Property Address <span className="req">*</span></span>
                        <SearchableSelect
                          value={draft.address}
                          options={addressChoices(leads).map((option) => option.address)}
                          placeholder="Enter Property Address"
                          ariaLabel="Property Address"
                          onChange={applyAddress}
                        />
                      </label>
                      <label>
                        <span>Property Name</span>
                        <input
                          value={draft.name}
                          placeholder="Enter Property Name"
                          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                        />
                      </label>
                    </div>
                    <div className="create-fields-row">
                      <label>
                        <span>Primary Vertical <span className="req">*</span></span>
                        <SearchableSelect
                          value={draft.primaryVertical}
                          options={primaryVerticalOptions}
                          placeholder="Primary Vertical"
                          ariaLabel="Primary Vertical"
                          onChange={(primaryVertical) => setDraft({ ...draft, primaryVertical })}
                        />
                      </label>
                      <label>
                        <span>Country <span className="req">*</span></span>
                        <span className="create-country">
                          {draft.country === "United States" && <img src="/assets/flag-usa.png" alt="" />}
                          <select value={draft.country} required disabled>
                            <option value="">Country</option>
                            <option>United States</option>
                          </select>
                        </span>
                      </label>
                      <label>
                        <span>County <span className="req">*</span></span>
                        <input value={draft.county} placeholder="Enter County" required disabled readOnly />
                      </label>
                    </div>
                    <div className="create-fields-row">
                      <label>
                        <span>State <span className="req">*</span></span>
                        <select value={draft.state} required disabled>
                          <option value="">State</option>
                          {withCurrentOption(draft.state, createStates).map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>City <span className="req">*</span></span>
                        <select value={draft.city} required disabled>
                          <option value="">City</option>
                          {withCurrentOption(draft.city, createCities).map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Zip/Postal Code <span className="req">*</span></span>
                        <input
                          value={draft.zipcode}
                          placeholder="Enter Zip/Postal Code"
                          required
                          disabled
                          readOnly
                        />
                      </label>
                    </div>
                  </div>
                </section>
                )}

                {createLeadStep === 1 && (
                <section className="create-lead-section">
                  <div className="create-section-head">
                    <h3 className="create-lead-section-title">Companies ({draft.companies.length})</h3>
                    <button type="button" className="btn btn-sm btn-ghost-primary" onClick={addCreateCompany}>
                      + Add Company
                    </button>
                  </div>
                  {draft.companies.map((company, companyIndex) => (
                    <div className="create-company-card" key={company.id}>
                      <div className="create-section-head">
                        <h4>Company {companyIndex + 1}</h4>
                        {draft.companies.length > 1 && (
        <button
          type="button"
                            className="btn btn-sm"
                            onClick={() => removeCreateCompany(company.id)}
        >
                            Remove
        </button>
                        )}
                      </div>
                      <div className="create-fields">
                        <label className="create-field-full">
                          <span>Company Name <span className="req">*</span></span>
                          <input
                            value={company.companyName}
                            placeholder="Company Name"
                            required={companyIndex === 0}
                            onChange={(event) =>
                              updateCreateCompany(company.id, { companyName: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          <span>Parent Company</span>
                          <SearchableSelect
                            value={company.parentCompany}
                            options={parentCompanyNames(leads)}
                            placeholder="Select Parent Company"
                            ariaLabel="Parent Company"
                            onChange={(parentCompany) =>
                              updateCreateCompany(company.id, { parentCompany })
                            }
                          />
                        </label>
                        <label>
                          <span>Company Affiliation</span>
                          <SearchableSelect
                            value={company.propertyAffiliation}
                            options={propertyAffiliationOptions}
                            placeholder="Select Company Affiliation"
                            ariaLabel="Company Affiliation"
                            onChange={(propertyAffiliation) =>
                              updateCreateCompany(company.id, { propertyAffiliation })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
      </section>
                )}

                {createLeadStep === 2 && (
                <section className="create-lead-section">
                  {draft.companies
                    .filter((company) => company.companyName.trim())
                    .map((company, companyIndex) => (
                    <div className="create-company-card" key={company.id}>
                      <div className="create-section-head">
                        <h4>{company.companyName.trim() || `Company ${companyIndex + 1}`}</h4>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost-primary"
                          onClick={() => addCreateCompanyContact(company.id)}
                        >
                          + Add Contact
                        </button>
                      </div>
                      {company.contacts.length === 0 && (
                        <p className="create-section-empty">No contacts added yet.</p>
                      )}
                      {company.contacts.map((contact, contactIndex) => (
                        <div className="create-contact-card" key={contact.id}>
                          <div className="create-section-head">
                            <h4>Contact {contactIndex + 1}</h4>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => removeCreateCompanyContact(company.id, contact.id)}
                            >
                              Remove
                            </button>
                          </div>
                          <ContactFormFields
                            contact={contact}
                            layout="create"
                            onPatch={(patch) => updateCreateCompanyContact(company.id, contact.id, patch)}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </section>
                )}
              </div>
              </div>
            </div>
            <div className="create-lead-page-footer">
              <button type="button" className="btn" onClick={closeCreateLeadPage}>
                Cancel
              </button>
              <div className="modal-create-footer-actions">
                {createLeadStep > 0 && (
                  <button type="button" className="btn" onClick={goToPreviousCreateLeadStep}>
                    Back
                  </button>
                )}
                {createLeadStep < createLeadSteps.length - 1 ? (
                  <button type="button" className="btn btn-primary" onClick={goToNextCreateLeadStep}>
                    Next
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary">
                    Create a Lead
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {!openLead && !isCreateLeadPage && (
      <>
      <div className="page-header">
        <h1>Leads</h1>
        <div className="header-actions">
          <div className="menu-anchor">
            <button
              type="button"
              className="btn"
              data-menu-trigger
              aria-expanded={menu === "export"}
              onClick={() => toggleMenu("export")}
            >
              <Icon src="/assets/icon-export.svg" alt="" />
              <span className="btn-label">
                Export
                <Icon src="/assets/chevron-export.svg" alt="" />
              </span>
            </button>
            {menu === "export" && (
              <div className="menu" data-menu>
                <button type="button" className="menu-item" onClick={exportCsv}>
                  Export CSV
                </button>
              </div>
            )}
          </div>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Icon src="/assets/icon-import.svg" alt="" />
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importCsv(file);
              event.target.value = "";
            }}
          />
          <button type="button" className="btn btn-primary" onClick={openCreateLeadPage}>
            <Icon src="/assets/icon-plus.svg" alt="" />
            Create a Lead
          </button>
        </div>
      </div>

      <div className="workspace">
        {filtersOpen && (
          <aside className="filters" aria-label="Filters">
            <div className="filters-head">
              <div className="filters-title-row">
                <h2>Filters</h2>
                <button type="button" className="btn btn-sm btn-primary">
                  Save filter
                </button>
              </div>
              <div className="filter-switch" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === "all"}
                  className={filterTab === "all" ? "is-active" : ""}
                  onClick={() => setFilterTab("all")}
                >
                  All Filters
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTab === "saved"}
                  className={filterTab === "saved" ? "is-active" : ""}
                  onClick={() => setFilterTab("saved")}
                >
                  Saved Filters
                </button>
              </div>
            </div>
            <div className="filters-body">
              {filterTab === "all" ? (
                filterGroups.map((group) => {
                  const values = group.field
                    ? [...new Set(leads.map((lead) => leadValue(lead, group.field as ColumnKey)).filter((value) => value !== "-" && value !== "N/A"))]
                    : [];
                  const open = openFilter === group.id;
                  return (
                    <div key={group.id} className="filter-block">
                      <button
                        type="button"
                        className="filter-row"
                        aria-expanded={open}
                        onClick={() => setOpenFilter(open ? null : group.id)}
                      >
                        <span>{group.label}</span>
                        <img className={open ? "chevron is-open" : "chevron"} src="/assets/chevron-filter.svg" alt="" />
                      </button>
                      {open && (
                        <div className="filter-options">
                          {values.length === 0 && <p className="filter-empty">No values</p>}
                          {values.map((value) => (
                            <label key={value} className="option">
                              <input
                                type="checkbox"
                                checked={activeFilters[group.id]?.includes(value) ?? false}
                                onChange={() => toggleFilterValue(group.id, value)}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="saved-list">
                  {[
                    { id: "unassigned", label: "Unassigned leads" },
                    { id: "attention", label: "Attention required" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={savedId === item.id ? "saved-item is-active" : "saved-item"}
                      onClick={() => {
                        setSavedId((current) => (current === item.id ? null : item.id));
                        setPage(1);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        <section className="board">
          <div className="toolbar">
            <div className="toolbar-left">
              <label className="search">
                <Icon src="/assets/icon-search.svg" alt="" />
                <input
                  value={query}
                  placeholder="Search"
                  aria-label="Search"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <div className="avatar-stack" aria-hidden="true">
                {["avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5"].map((file) => (
                  <img key={file} src={`/assets/${file}.png`} alt="" />
                ))}
                <span className="avatar-more">+10</span>
              </div>
            </div>
            <div className="toolbar-right">
              <button type="button" className="btn" onClick={() => setFiltersOpen((open) => !open)}>
                <Icon src="/assets/icon-filters.svg" alt="" />
                {filtersOpen ? "Hide Filters" : "Show Filters"}
              </button>
              <div className="menu-anchor">
                <button
                  type="button"
                  className="btn"
                  data-menu-trigger
                  aria-expanded={menu === "sort"}
                  onClick={() => toggleMenu("sort")}
                >
                  <Icon src="/assets/icon-sort.svg" alt="" />
                  Sort
                </button>
                {menu === "sort" && (
                  <div className="menu" data-menu>
                    {(
                      [
                        ["name", "Property Name"],
                        ["added", "Added"],
                        ["modified", "Last Modified"],
                        ["state", "State"],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <button key={key} type="button" className="menu-item" onClick={() => toggleSort(key)}>
                        {label}
                        {sort?.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="btn" onClick={openCustomize}>
                <Icon src="/assets/icon-customize.svg" alt="" />
                Customize
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="check-col">
                    <input
                      type="checkbox"
                      aria-label="Select all leads on this page"
                      checked={allChecked}
                      onChange={(event) => togglePage(event.target.checked)}
                    />
                  </th>
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      className={column.key === "address" ? "sticky-name" : undefined}
                      style={{ width: column.width, minWidth: column.width }}
                    >
                      <button type="button" className="sort-head" onClick={() => toggleSort(column.key)}>
                        <span>{column.label}</span>
                        <Icon src="/assets/icon-sort-col.svg" alt="" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td className="empty" colSpan={visibleColumns.length + 1}>
                      No leads match these filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((lead) => (
                  <tr
                    key={lead.id}
                    className={selected.has(lead.id) ? "is-selected is-clickable" : "is-clickable"}
                    onClick={() => openLeadPage(lead.id)}
                  >
                    <td className="check-col" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${lead.name}`}
                        checked={selected.has(lead.id)}
                        onChange={() => toggleRow(lead.id)}
                      />
                    </td>
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key}
                        className={column.key === "address" ? "name-cell sticky-name" : "text-cell"}
                      >
                        {column.key === "status" ? (
                          <span className={statusClass(lead.status)}>
                            {lead.status}
                            {lead.status === "Attention Required" && <Icon src="/assets/icon-error.svg" alt="" />}
                          </span>
                        ) : column.key === "assignee" ? (
                          <div className="assign-wrap" data-assign onClick={(event) => event.stopPropagation()}>
                            {lead.assignee ? (
                              <button type="button" className="assignee" onClick={() => setAssignFor(lead.id)}>
                                <img src={lead.assignee.avatar} alt="" />
                                <span>{lead.assignee.name}</span>
                              </button>
                            ) : (
                              <button type="button" className="assign" onClick={() => setAssignFor(lead.id)}>
                                <span className="assign-mark">
                                  <img src="/assets/icon-person.svg" alt="" />
                                  <span className="assign-plus">
                                    <img src="/assets/icon-plus-badge.svg" alt="" />
                                  </span>
                                </span>
                                Assign
                              </button>
                            )}
                            {assignFor === lead.id && (
                              <div className="menu assign-menu" data-menu>
                                {officers.map((officer) => (
                                  <button
                                    key={officer.name}
                                    type="button"
                                    className="menu-item"
                                    onClick={() => assign(lead.id, officer)}
                                  >
                                    <img className="mini-avatar" src={officer.avatar} alt="" />
                                    {officer.name}
                                  </button>
                                ))}
                                {lead.assignee && (
                                  <button type="button" className="menu-item" onClick={() => assign(lead.id, null)}>
                                    Unassign
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : column.key === "validation" ? (
                          <span className="badge badge-enriched">{lead.validation}</span>
                        ) : column.key === "source" || column.key === "dataType" || column.key === "tenancy" ? (
                          <span className="badge badge-neutral">{lead[column.key]}</span>
                        ) : (
                          leadValue(lead, column.key)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="table-footer">
            <p>{defaultView ? "1.5 M Leads" : `${filtered.length} Leads`}</p>
            <div className="pager">
              <div className="menu-anchor">
                <button
                  type="button"
                  className="page-size"
                  data-menu-trigger
                  aria-expanded={menu === "pageSize"}
                  onClick={() => toggleMenu("pageSize")}
                >
                  Rows per page: {pageSize}
                  <Icon src="/assets/chevron-page.svg" alt="" />
                </button>
                {menu === "pageSize" && (
                  <div className="menu menu-up" data-menu>
                    {pageSizeOptions.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className="menu-item"
                        onClick={() => {
                          setPageSize(size);
                          setPage(1);
                          setMenu(null);
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="range">{rangeLabel}</p>
              <div className="pager-actions">
                <button
                  type="button"
                  className="circle"
                  aria-label="Previous page"
                  disabled={safePage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <Icon src="/assets/chevron-left.svg" alt="" />
                </button>
                <button
                  type="button"
                  className="circle"
                  aria-label="Next page"
                  disabled={safePage === pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                >
                  <Icon src="/assets/chevron-right.svg" alt="" />
                </button>
              </div>
            </div>
          </footer>
        </section>
      </div>
      </>
      )}

      {customizeOpen && (
        <div className="drawer-backdrop" onClick={() => setCustomizeOpen(false)}>
          <aside
            className="drawer drawer-columns"
            role="dialog"
            aria-labelledby="column-custom-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-head">
              <h2 id="column-custom-title">Column Customization</h2>
              <button type="button" className="icon-button" aria-label="Close" onClick={() => setCustomizeOpen(false)}>
                ×
              </button>
            </div>
            <div className="column-custom">
              <section className="column-custom-pane">
                <h3>Show/Hide Columns</h3>
                <label className="column-search">
                  <Icon src="/assets/icon-search.svg" alt="" />
                  <input
                    value={columnQuery}
                    placeholder="Search a column"
                    aria-label="Search a column"
                    onChange={(event) => setColumnQuery(event.target.value)}
                  />
                </label>
                <ul className="column-custom-list">
                  {showHideOrder
                    .map((key) => columnByKey.get(key))
                    .filter((column): column is Column => Boolean(column))
                    .filter((column) => column.label.toLowerCase().includes(columnQuery.trim().toLowerCase()))
                    .map((column) => (
                      <li key={column.key}>
                        <label className="column-check">
                          <input
                            type="checkbox"
                            checked={!draftHidden.has(column.key)}
                            onChange={() => toggleDraftColumn(column.key)}
                          />
                          <span>{column.label}</span>
                        </label>
                      </li>
                    ))}
                </ul>
              </section>
              <section className="column-custom-pane">
                <h3>Rearrange Columns</h3>
                <ul className="column-custom-list">
                  {draftOrder.map((key, index) => {
                    const column = columnByKey.get(key);
                    if (!column) return null;
                    return (
                      <li
                        key={key}
                        className="column-rank"
                        draggable
                        onDragStart={() => {
                          dragKey.current = key;
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          moveDraftColumn(key);
                        }}
                        onDragEnd={() => {
                          dragKey.current = null;
                        }}
                      >
                        <span className="column-rank-index">{index + 1}.</span>
                        <span className="column-rank-label">{column.label}</span>
                        <span className="column-drag" aria-hidden="true">
                          <svg viewBox="0 0 16 16" width="16" height="16">
                            <circle cx="6" cy="4" r="1" fill="currentColor" />
                            <circle cx="10" cy="4" r="1" fill="currentColor" />
                            <circle cx="6" cy="8" r="1" fill="currentColor" />
                            <circle cx="10" cy="8" r="1" fill="currentColor" />
                            <circle cx="6" cy="12" r="1" fill="currentColor" />
                            <circle cx="10" cy="12" r="1" fill="currentColor" />
                </svg>
                        </span>
            </li>
                    );
                  })}
          </ul>
              </section>
            </div>
            <div className="column-custom-footer">
              <label className="column-hide-all">
                <input
                  type="checkbox"
                  role="switch"
                  checked={draftHidden.size === showHideOrder.length}
                  onChange={(event) => toggleHideAll(event.target.checked)}
                />
                Hide all Columns
              </label>
              <div className="column-custom-actions">
                <button type="button" className="btn" onClick={() => setCustomizeOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={resetColumns}>
                  Reset
                </button>
                <button type="button" className="btn btn-primary" onClick={applyColumns}>
                  Apply to Columns
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
