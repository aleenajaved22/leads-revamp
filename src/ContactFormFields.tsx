import { ownerAffiliationOptions, type Contact } from "./data";
import { SearchableSelect } from "./SearchableSelect";
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

const contactFormFields: {
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
  { key: "zipcode", label: "Zip / Postal Code", placeholder: "Enter Zip / Postal Code" },
];

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

function TextField({
  label,
  value,
  placeholder,
  onChange,
  className,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className ? `edit-field ${className}` : "edit-field"}>
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
      <SearchableSelect
        value={value}
        options={options}
        placeholder={placeholder ?? "Select"}
        ariaLabel={label}
        onChange={onChange}
      />
    </label>
  );
}

export function ContactFormFields({
  contact,
  onPatch,
  layout = "modal",
}: {
  contact: Contact;
  onPatch: (patch: Partial<Contact>) => void;
  layout?: "modal" | "create";
}) {
  const rootClass =
    layout === "create"
      ? "company-modal-fields kv-edit create-contact-form-fields"
      : "company-modal-fields kv-edit";

  return (
    <div className={rootClass}>
      {contactFormFields.map((field) => {
        const onChange = (value: string) => onPatch({ [field.key]: value });
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
            className={field.key === "address" ? "create-contact-address" : undefined}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
}
