import {
  addressChoices,
  parentCompanyNames,
  primaryVerticalOptions,
  propertyAffiliationOptions,
  type Contact,
  type Lead,
} from "./data";
import { InlineField } from "./LeadDetail";
import { ContactOwnerAffiliationChips } from "./OwnerAffiliationField";

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

function withCurrentOption(value: string, options: string[]) {
  if (!value || options.includes(value)) return options;
  return [value, ...options];
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

function fieldValue(value: string) {
  return value.trim();
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
  return `${contact.firstName} ${contact.lastName}`.trim();
}

export type CreateLeadDraft = {
  name: string;
  primaryVertical: string;
  address: string;
  country: string;
  county: string;
  state: string;
  city: string;
  zipcode: string;
};

export function CreateLeadPropertyFacts({
  draft,
  leads,
  onPatch,
  onApplyAddress,
}: {
  draft: CreateLeadDraft;
  leads: Lead[];
  onPatch: (patch: Partial<CreateLeadDraft>) => void;
  onApplyAddress: (address: string) => void;
}) {
  const addressOptions = addressChoices(leads).map((option) => option.address);

  return (
    <header className="property-banner create-lead-property-banner">
      <div className="property-facts">
        <div className="property-facts-fields">
        <InlineField
          required
          label="Property Address"
          value={draft.address}
          emptyLabel="Add Property Address"
          options={withCurrentOption(draft.address, addressOptions)}
          onCommit={onApplyAddress}
        />
        <InlineField
          label="Property Name"
          value={draft.name}
          emptyLabel="Add Property Name"
          onCommit={(name) => onPatch({ name })}
        />
        <InlineField
          required
          label="Primary Vertical"
          value={draft.primaryVertical}
          emptyLabel="Select Primary Vertical"
          options={withCurrentOption(draft.primaryVertical, primaryVerticalOptions)}
          onCommit={(primaryVertical) => onPatch({ primaryVertical })}
        />
        <InlineField
          required
          label="Country"
          value={countryLabel(draft.country)}
          emptyLabel="Select Country"
          options={propertyCountries}
          prefix={countryFlagPrefix(draft.country)}
          onCommit={(value) => onPatch({ country: countryCode(value) })}
        />
        <InlineField
          required
          label="County"
          value={draft.county}
          emptyLabel="Add County"
          onCommit={(county) => onPatch({ county })}
        />
        <InlineField
          required
          label="State"
          value={fieldValue(draft.state)}
          emptyLabel="Select State"
          options={withCurrentOption(draft.state, propertyStates)}
          onCommit={(state) => onPatch({ state })}
        />
        <InlineField
          required
          label="City"
          value={fieldValue(draft.city)}
          emptyLabel="Select City"
          options={withCurrentOption(draft.city, propertyCities)}
          onCommit={(city) => onPatch({ city })}
        />
        <InlineField
          required
          label="Zip/Postal Code"
          value={draft.zipcode}
          emptyLabel="Add Zip/Postal Code"
          onCommit={(zipcode) => onPatch({ zipcode })}
        />
        </div>
      </div>
    </header>
  );
}

export type CreateLeadCompanyDraft = {
  id: string;
  companyName: string;
  parentCompany: string;
  propertyAffiliation: string;
  contacts: Contact[];
};

export function CreateLeadCompanyDetailSections({
  company,
  leads,
  propertyCountry,
  onUpdateCompany,
  onAddContact,
  onRemoveContact,
  onUpdateContact,
}: {
  company: CreateLeadCompanyDraft;
  leads: Lead[];
  propertyCountry: string;
  onUpdateCompany: (patch: Partial<CreateLeadCompanyDraft>) => void;
  onAddContact: () => void;
  onRemoveContact: (contactId: string) => void;
  onUpdateContact: (contactId: string, patch: Partial<Contact>) => void;
}) {
  return (
    <>
      <section className="company-detail-section">
        <h3 className="company-detail-section-title">Company Information</h3>
        <div className="kv-table">
          <InlineField
            required
            label="Company Name"
            value={company.companyName}
            emptyLabel="Company Name"
            onCommit={(companyName) => onUpdateCompany({ companyName })}
          />
          <InlineField
            required
            label="Parent Company"
            value={company.parentCompany}
            emptyLabel="Select Parent Company"
            options={withCurrentOption(company.parentCompany, parentCompanyNames(leads))}
            onCommit={(parentCompany) => onUpdateCompany({ parentCompany })}
          />
          <ContactOwnerAffiliationChips
            required
            summaryVariant="inline"
            label="Company Affiliation"
            options={propertyAffiliationOptions}
            emptyLabel="Select Company Affiliation"
            value={company.propertyAffiliation}
            onChange={(propertyAffiliation) => onUpdateCompany({ propertyAffiliation })}
          />
        </div>
      </section>

      <section className="company-detail-section" aria-labelledby="create-lead-contacts-title">
        <h3 id="create-lead-contacts-title" className="company-detail-section-title">
          Contacts ({company.contacts.length})
        </h3>
        {company.contacts.length === 0 && (
          <p className="panel-empty">No contacts for this company yet.</p>
        )}
        <div className="contact-grid">
          {company.contacts.map((contact) => (
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
                        onUpdateContact(contact.id, {
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
                      emptyLabel="Add Email"
                      onCommit={(email) => onUpdateContact(contact.id, { email })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="contact-card-remove"
                  onClick={() => onRemoveContact(contact.id)}
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
                  required
                  value={contact.ownerAffiliation}
                  onChange={(ownerAffiliation) => onUpdateContact(contact.id, { ownerAffiliation })}
                />
                <InlineField
                  required
                  label="Title"
                  value={contact.title}
                  emptyLabel="Add Title"
                  onCommit={(title) => onUpdateContact(contact.id, { title })}
                />
              </div>
              <div className="contact-card-row contact-card-row-2">
                <InlineField
                  required
                  label="Phone Number"
                  value={contact.phone}
                  emptyLabel="Add Phone Number"
                  prefix={phoneFlagPrefix(contact.phone, contact.country || propertyCountry)}
                  onCommit={(phone) => onUpdateContact(contact.id, { phone })}
                />
                <InlineField
                  required
                  label="Cell Number"
                  value={contact.cell}
                  emptyLabel="Add Cell Number"
                  prefix={phoneFlagPrefix(contact.cell, contact.country || propertyCountry)}
                  onCommit={(cell) => onUpdateContact(contact.id, { cell })}
                />
              </div>
              <div className="contact-card-row contact-card-row-2">
                <InlineField
                  required
                  label="Address"
                  value={contact.address}
                  emptyLabel="Add Address"
                  onCommit={(address) => onUpdateContact(contact.id, { address })}
                />
                <InlineField
                  required
                  label="Country"
                  value={countryLabel(contact.country)}
                  emptyLabel="Country"
                  options={propertyCountries}
                  prefix={countryFlagPrefix(contact.country)}
                  onCommit={(value) => onUpdateContact(contact.id, { country: countryCode(value) })}
                />
              </div>
              <div className="contact-card-row contact-card-row-2">
                <InlineField
                  required
                  label="State"
                  value={fieldValue(contact.state)}
                  emptyLabel="State"
                  options={withCurrentOption(contact.state, propertyStates)}
                  onCommit={(state) => onUpdateContact(contact.id, { state })}
                />
                <InlineField
                  required
                  label="City"
                  value={fieldValue(contact.city)}
                  emptyLabel="City"
                  options={withCurrentOption(contact.city, propertyCities)}
                  onCommit={(city) => onUpdateContact(contact.id, { city })}
                />
              </div>
              <div className="contact-card-row contact-card-row-2">
                <InlineField
                  required
                  label="Zip / Postal Code"
                  value={contact.zipcode}
                  emptyLabel="Add Zip / Postal Code"
                  onCommit={(zipcode) => onUpdateContact(contact.id, { zipcode })}
                />
              </div>
            </article>
          ))}
          <button type="button" className="contact-add" onClick={onAddContact}>
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
    </>
  );
}
