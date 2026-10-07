export type Status =
  | "Enriched"
  | "Raw"
  | "Attention Required"
  | "Cleaned"
  | "Approved";

export type Assignee = {
  name: string;
  avatar: string;
};

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  cell: string;
  ownerAffiliation: string;
  address: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
};

export type Company = {
  id: string;
  name: string;
  secondaryVertical: string;
  propertyAffiliation: string;
  phone: string;
  employees: string;
  naics: string;
  revenue: string;
  website: string;
  emailDomain: string;
  floor: string;
  floorRange: string;
  suite: string;
  suiteRange: string;
  occupiedArea: string;
  effectiveDate: string;
  tillDate: string;
  status: Status;
  parentCompany?: string;
  contacts: Contact[];
  floorMates?: { name: string; suite: string; occupiedArea: string }[];
};

export function companyStatusClass(status: Status) {
  return `badge badge-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

export type Lead = {
  id: string;
  name: string;
  zipcode: string;
  city: string;
  status: Status;
  address: string;
  country: string;
  county: string;
  state: string;
  buildingStatus: string;
  assignee: Assignee | null;
  processed: string;
  primaryVertical: string;
  added: string;
  addedBy: string;
  modified: string;
  modifiedBy: string;
  source: string;
  dataType: string;
  tenancy: string;
  landArea: string;
  amenities: string;
  rba: string;
  loadingDocks: string;
  parkingSpaces: string;
  validation: string;
  archived?: boolean;
  floorCount?: number;
  companies: Company[];
};

export type AddressChoice = {
  address: string;
  country: string;
  county: string;
  state: string;
  city: string;
  zipcode: string;
};

const countyByState: Record<string, string> = {
  Illinois: "Cook",
  Delaware: "New Castle",
  "New Jersey": "Essex",
  Hawaii: "Honolulu",
  Kentucky: "Jefferson",
  Maine: "Cumberland",
  "New Mexico": "Bernalillo",
  California: "Los Angeles",
  Texas: "Harris",
  Ohio: "Lucas",
  Florida: "Broward",
  "New York": "New York",
  Pennsylvania: "Allegheny",
  Tennessee: "Davidson",
};

function locationFromAddress(address: string) {
  const match = address.match(/^(.*?)\.\s+(.+),\s+(.+?)\s+(\d+)\s*$/);
  if (!match) return null;
  const city = match[2].trim();
  const state = match[3].trim();
  const zipcode = match[4];
  if (!city || !state || !zipcode) return null;
  return {
    country: "United States",
    county: countyByState[state] ?? "",
    state,
    city,
    zipcode,
  };
}

export const primaryVerticalOptions = [
  "Industrial",
  "Housing",
  "Manufacturing",
  "Distribution",
  "Commercial",
];

export const propertyAffiliationOptions = [
  "Managed",
  "Owned",
  "Regional Office",
  "Shared",
  "Tenant",
  "Headquarters",
];

export const ownerAffiliationOptions = [
  "Decision Maker",
  "Billing",
  "End User",
  "Blocker",
  "Influencer",
];

export function parentCompanyNames(leads: Lead[]) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const item of leads) {
    for (const company of item.companies) {
      const name = company.name.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
  }
  names.sort((a, b) => a.localeCompare(b));
  return names;
}

export function addressChoices(leads: Pick<Lead, "address" | "country" | "county" | "state" | "city" | "zipcode">[]) {
  const seen = new Set<string>();
  const choices: AddressChoice[] = [];
  for (const lead of leads) {
    const address = lead.address.trim();
    const key = address.toLowerCase();
    if (!address || address === "N/A" || seen.has(key)) continue;
    seen.add(key);
    const parsed = locationFromAddress(address);
    if (parsed) {
      choices.push({ address, ...parsed });
      continue;
    }
    const country = lead.country === "US" || lead.country === "United States" ? "United States" : lead.country.trim();
    choices.push({
      address,
      country,
      county: lead.county === "N/A" ? "" : lead.county,
      state: lead.state === "N/A" ? "" : lead.state,
      city: lead.city === "N/A" ? "" : lead.city,
      zipcode: lead.zipcode === "N/A" ? "" : lead.zipcode,
    });
  }
  return choices;
}

export type ColumnKey =
  | Exclude<keyof Lead, "id" | "assignee" | "companies" | "archived" | "floorCount">
  | "assignee";

export type Column = {
  key: ColumnKey;
  label: string;
  width: number;
};

export const columns: Column[] = [
  { key: "address", label: "Address", width: 280 },
  { key: "zipcode", label: "Zipcode", width: 120 },
  { key: "city", label: "City", width: 160 },
  { key: "status", label: "Status", width: 180 },
  { key: "name", label: "Property Name", width: 260 },
  { key: "country", label: "Country", width: 120 },
  { key: "county", label: "County", width: 190 },
  { key: "state", label: "State", width: 140 },
  { key: "buildingStatus", label: "Building Status", width: 160 },
  { key: "assignee", label: "Assigned To", width: 170 },
  { key: "processed", label: "Processed By", width: 150 },
  { key: "primaryVertical", label: "Primary Vertical", width: 160 },
  { key: "added", label: "Added", width: 190 },
  { key: "addedBy", label: "Added By", width: 130 },
  { key: "modified", label: "Last Modified", width: 200 },
  { key: "modifiedBy", label: "Last Modified By", width: 170 },
  { key: "source", label: "Data Source", width: 140 },
  { key: "dataType", label: "Data Type", width: 130 },
  { key: "tenancy", label: "Tenancy", width: 130 },
  { key: "landArea", label: "Land Area", width: 140 },
  { key: "amenities", label: "Amenities", width: 140 },
  { key: "rba", label: "RBA", width: 110 },
  { key: "loadingDocks", label: "No of Loading Docks", width: 190 },
  { key: "parkingSpaces", label: "No of Parking Spaces", width: 200 },
  { key: "validation", label: "Validation", width: 190 },
];

export const officers: Assignee[] = [
  { name: "Micheal Fred", avatar: "/assets/avatar-michael.png" },
  { name: "William Roger", avatar: "/assets/avatar-william.png" },
];

const michael = officers[0];
const william = officers[1];

const leadRecords: Omit<Lead, "companies">[] = [
  {
    id: "1",
    name: "Americold",
    address: "2972 Westheimer Rd. Santa Ana, Illinois 85486",
    state: "CL",
    status: "Enriched",
    assignee: michael,
    processed: "System",
    added: "09/07/2024",
    modified: "N/A",
    modifiedBy: "Henry, Arthur",
    city: "Pembroke Pines",
    source: "Google",
    zipcode: "1002",
    tenancy: "Multi",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "N/A",
    amenities: "N/A",
    rba: "200,000 SF",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
    floorCount: 10,
  },
  {
    id: "2",
    name: "N/A",
    address: "6391 Elgin St. Celina, Delaware 10299",
    state: "CL",
    status: "Raw",
    assignee: null,
    processed: "System",
    added: "10/07/2024",
    modified: "11/06/2024",
    modifiedBy: "Miles, Esther",
    city: "Toledo",
    source: "CoStar",
    zipcode: "1002",
    tenancy: "Multi",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "1002574",
    amenities: "N/A",
    rba: "15,000 SF",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
    floorCount: 1,
  },
  {
    id: "3",
    name: "Professional Center",
    address: "2464 Royal Ln. Mesa, New Jersey 45463",
    state: "CL",
    status: "Attention Required",
    assignee: michael,
    processed: "Manual",
    added: "11/06/2024",
    modified: "11/06/2024",
    modifiedBy: "N/A",
    city: "Austin",
    source: "ALN",
    zipcode: "023",
    tenancy: "Single",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "025343",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "4",
    name: "One Pacific Place",
    address: "1901 Thornridge Cir. Shiloh, Hawaii 81063",
    state: "TN",
    status: "Cleaned",
    assignee: null,
    processed: "System",
    added: "N/A",
    modified: "11/06/2024",
    modifiedBy: "Miles, Esther",
    city: "Pembroke Pines",
    source: "Linkedin",
    zipcode: "9209",
    tenancy: "Single",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "N/A",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "5",
    name: "Plaza Mall South",
    address: "4517 Washington Ave. Manchester, Kentucky 39495",
    state: "TX",
    status: "Attention Required",
    assignee: null,
    processed: "System",
    added: "10/07/2024",
    modified: "10/07/2024",
    modifiedBy: "Miles, Esther",
    city: "Naperville",
    source: "Google",
    zipcode: "1001",
    tenancy: "Multi",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "100143",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "6",
    name: "Volkswagen",
    address: "8502 Preston Rd. Inglewood, Maine 98380",
    state: "NB",
    status: "Cleaned",
    assignee: william,
    processed: "System",
    added: "11/06/2024",
    modified: "11/06/2024",
    modifiedBy: "Cooper, Kristin",
    city: "Toledo",
    source: "Manual",
    zipcode: "803",
    tenancy: "Multi",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "N/A",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "7",
    name: "Americold 2",
    address: "4140 Parker Rd. Allentown, New Mexico 31134",
    state: "TX",
    status: "Approved",
    assignee: null,
    processed: "Manual",
    added: "30/01/2023",
    modified: "30/01/2023",
    modifiedBy: "Nguyen, Shane",
    city: "Toledo",
    source: "CoStar",
    zipcode: "3913",
    tenancy: "Single",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "3453913",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "8",
    name: "Park Downtown",
    address: "8502 Preston Rd. Inglewood, Maine 98380",
    state: "NB",
    status: "Cleaned",
    assignee: michael,
    processed: "Manual",
    added: "30/01/2023",
    modified: "30/01/2023",
    modifiedBy: "Nguyen, Shane",
    city: "Toledo",
    source: "CoStar",
    zipcode: "3913",
    tenancy: "Single",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "3453913",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "9",
    name: "Plaza Mall arena",
    address: "4140 Parker Rd. Allentown, New Mexico 31134",
    state: "TX",
    status: "Approved",
    assignee: null,
    processed: "Manual",
    added: "30/01/2023",
    modified: "30/01/2023",
    modifiedBy: "Nguyen, Shane",
    city: "Austin",
    source: "CoStar",
    zipcode: "3913",
    tenancy: "Single",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "3453913",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "10",
    name: "H&M Store",
    address: "6391 Elgin St. Celina, Delaware 10299",
    state: "NB",
    status: "Attention Required",
    assignee: null,
    processed: "System",
    added: "30/01/2023",
    modified: "30/01/2023",
    modifiedBy: "N/A",
    city: "Toledo",
    source: "CoStar",
    zipcode: "3913",
    tenancy: "Single",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "3453913",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "11",
    name: "Professional Center North",
    address: "2464 Royal Ln. Mesa, New Jersey 45463",
    state: "CL",
    status: "Attention Required",
    assignee: null,
    processed: "System",
    added: "30/01/2023",
    modified: "N/A",
    modifiedBy: "Nguyen, Shane",
    city: "Austin",
    source: "CoStar",
    zipcode: "3913",
    tenancy: "Single",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "3453913",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
  {
    id: "12",
    name: "Professional Center",
    address: "2464 Royal Ln. Mesa, New Jersey 45463",
    state: "CL",
    status: "Attention Required",
    assignee: null,
    processed: "System",
    added: "30/01/2023",
    modified: "N/A",
    modifiedBy: "Nguyen, Shane",
    city: "Austin",
    source: "CoStar",
    zipcode: "3913",
    tenancy: "Single",
    country: "US",
    county: "N/A",
    buildingStatus: "Existing",
    primaryVertical: "Commercial",
    addedBy: "N/A",
    dataType: "Csv",
    landArea: "3453913",
    amenities: "N/A",
    rba: "N/A",
    loadingDocks: "N/A",
    parkingSpaces: "N/A",
    validation: "Validation In Process",
  },
];

export const filterGroups: { id: string; label: string; field: ColumnKey | null }[] = [
  { id: "states", label: "States", field: "state" },
  { id: "city", label: "City", field: "city" },
  { id: "zip", label: "Zip Codes", field: "zipcode" },
  { id: "status", label: "Lead Status", field: "status" },
  { id: "range", label: "Data Range", field: "added" },
  { id: "tenancy", label: "Tenancy", field: "tenancy" },
  { id: "industry", label: "Industry Vertical", field: "primaryVertical" },
];

export const pageSizeOptions = [15, 25, 50];

export function emptyContact(): Contact {
  return {
    id: "",
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    cell: "",
    ownerAffiliation: "",
    address: "",
    country: "",
    state: "",
    city: "",
    zipcode: "",
  };
}

export function emptyCompany(): Company {
  return {
    id: "",
    name: "",
    secondaryVertical: "",
    propertyAffiliation: "",
    phone: "",
    employees: "",
    naics: "",
    revenue: "",
    website: "",
    emailDomain: "",
    floor: "",
    floorRange: "",
    suite: "",
    suiteRange: "",
    occupiedArea: "",
    effectiveDate: "",
    tillDate: "",
    status: "Raw",
    contacts: [],
  };
}

export function occupancyFloorValue(company: Company) {
  return company.floor.trim() || company.floorRange.trim();
}

export function occupancySuiteValue(company: Company) {
  return company.suite.trim() || company.suiteRange.trim();
}

function occupancyPlaceLabel(value: string, single: string, plural: string) {
  if (!value) return "";
  return `${/[–-]/.test(value) ? plural : single} ${value}`;
}

export function occupancyParts(company: Company) {
  const floorValue = occupancyFloorValue(company);
  const suiteValue = occupancySuiteValue(company);
  return {
    floorText: occupancyPlaceLabel(floorValue, "Floor", "Floors"),
    suiteText: occupancyPlaceLabel(suiteValue, "Suite", "Suites"),
  };
}

export function occupancyLabel(company: Company) {
  const { floorText, suiteText } = occupancyParts(company);
  if (!floorText && !suiteText) return "Floor info unavailable";
  return [floorText, suiteText].filter(Boolean).join(" · ");
}

function contact(
  id: string,
  firstName: string,
  lastName: string,
  title: string,
  email: string,
  phone: string,
  extra: Partial<Contact> = {},
): Contact {
  return {
    ...emptyContact(),
    id,
    firstName,
    lastName,
    title,
    email,
    phone,
    ownerAffiliation: "End User",
    ...extra,
  };
}

function company(partial: Partial<Company> & Pick<Company, "id" | "name">): Company {
  return { ...emptyCompany(), propertyAffiliation: "Owned", ...partial };
}

function tenant(id: string, name: string, secondaryVertical: string, occupancy: Partial<Company>): Company {
  return company({ id, name, secondaryVertical, propertyAffiliation: "Leased", ...occupancy });
}

const companySeeds: Record<string, Company[]> = {
  "1": [
    company({
      id: "c-1-a",
      name: "Americold Logistics",
      secondaryVertical: "Cold Storage",
      phone: "+1 949 555 0142",
      employees: "1,200",
      naics: "493120",
      revenue: "$2.4B",
      website: "americold.com",
      emailDomain: "americold.com",
      floorRange: "1–2",
      suiteRange: "1–50",
      occupiedArea: "24,000 SF",
      status: "Cleaned",
      parentCompany: "Americold",
      contacts: [
        contact("ct-1-a1", "Elena", "Vasquez", "Facility Director", "elena.vasquez@americold.com", "+1 949 555 0142", {
          cell: "+1 949 555 0190",
          address: "2972 Westheimer Rd.",
          country: "US",
          state: "CL",
          city: "Santa Ana",
          zipcode: "85486",
        }),
        contact("ct-1-a2", "Marcus", "Lee", "Operations Supervisor", "marcus.lee@americold.com", "+1 949 555 0166"),
      ],
    }),
    company({
      id: "c-1-b",
      name: "Lineage Logistics",
      secondaryVertical: "Warehousing",
      propertyAffiliation: "Leased",
      phone: "+1 949 555 0177",
      employees: "800",
      naics: "493110",
      revenue: "$5.3B",
      website: "lineagelogistics.com",
      emailDomain: "lineagelogistics.com",
      status: "Cleaned",
      contacts: [
        contact("ct-1-b1", "Nina", "Patel", "Site Lead", "nina.patel@lineagelogistics.com", "+1 949 555 0177"),
      ],
    }),
    tenant("c-1-c", "Cold Chain Partners", "Logistics", { floor: "1", suite: "140", occupiedArea: "4,500 SF", status: "Enriched" }),
    tenant("c-1-d", "Harbor Freight Advisors", "Consulting", { floor: "2", suite: "250", occupiedArea: "5,200 SF", status: "Cleaned" }),
    tenant("c-1-e", "Meridian Health", "Healthcare", { floor: "3", suite: "300", occupiedArea: "9,000 SF", status: "Enriched" }),
    tenant("c-1-f", "Summit Legal Group", "Legal", { floor: "3", suite: "340", occupiedArea: "6,000 SF", status: "Cleaned" }),
    tenant("c-1-g", "Brightline Tech", "Technology", { floor: "3", suite: "380", occupiedArea: "3,500 SF", status: "Enriched" }),
    tenant("c-1-h", "Northstar Capital", "Finance", {
      floorRange: "5–6",
      suiteRange: "500–610",
      occupiedArea: "30,000 SF",
      status: "Cleaned",
    }),
    tenant("c-1-i", "Keystone Insurance", "Insurance", { floor: "6", suite: "650", occupiedArea: "4,000 SF", status: "Enriched" }),
    tenant("c-1-j", "Vantage Media", "Media", { floor: "8", suite: "800", occupiedArea: "8,000 SF", status: "Cleaned" }),
    tenant("c-1-k", "Atlas Engineering", "Engineering", { floor: "8", suite: "850", occupiedArea: "7,500 SF", status: "Enriched" }),
  ],
  "2": [
    tenant("c-2-a", "Wellness Pharmacy", "Pharmacy", { floor: "1", suite: "101", occupiedArea: "3,200 SF" }),
    tenant("c-2-b", "Evergreen Dental", "Dental", {
      floor: "1",
      suite: "102",
      occupiedArea: "2,400 SF",
      floorMates: [
        { name: "Cedar Orthodontics", suite: "105", occupiedArea: "1,800 SF" },
        { name: "Willow Oral Surgery", suite: "106", occupiedArea: "1,600 SF" },
        { name: "Bright Smile Studio", suite: "107", occupiedArea: "1,500 SF" },
      ],
    }),
    tenant("c-2-c", "Peak Physical Therapy", "Healthcare", {
      floor: "1",
      suite: "103",
      occupiedArea: "4,100 SF",
      floorMates: [{ name: "Apex Rehab Clinic", suite: "108", occupiedArea: "1,800 SF" }],
    }),
    tenant("c-2-d", "Harmony Pediatrics", "Healthcare", { floor: "1", suite: "104", occupiedArea: "2,800 SF" }),
  ],
  "4": [
    company({
      id: "c-4-a",
      name: "Google",
      secondaryVertical: "Technology",
      phone: "+1 808 555 0101",
      employees: "10,000",
      naics: "518210",
      revenue: "$307B",
      website: "google.com",
      emailDomain: "google.com",
      floorRange: "1–3",
      suiteRange: "101–305",
      occupiedArea: "75,000 SF",
      contacts: [
        contact("ct-4-a1", "Alex", "Chen", "Facilities Manager", "alex.chen@google.com", "+1 808 555 0101", {
          cell: "+1 808 555 0199",
          country: "US",
          state: "TN",
          city: "Shiloh",
          zipcode: "81063",
        }),
        contact("ct-4-a2", "Priya", "Shah", "Workplace Lead", "priya.shah@google.com", "+1 808 555 0114"),
        contact("ct-4-a3", "Owen", "Brooks", "Security Manager", "owen.brooks@google.com", "+1 808 555 0120"),
      ],
    }),
    company({
      id: "c-4-b",
      name: "Bank of America",
      secondaryVertical: "Financial Services",
      propertyAffiliation: "Leased",
      phone: "+1 808 555 0200",
      employees: "4,500",
      naics: "522110",
      revenue: "$98B",
      website: "bankofamerica.com",
      emailDomain: "bofa.com",
      floorRange: "4–6",
      suiteRange: "401–602",
      occupiedArea: "60,000 SF",
      contacts: [
        contact("ct-4-b1", "Hannah", "Cole", "Branch Operations", "hannah.cole@bofa.com", "+1 808 555 0200"),
        contact("ct-4-b2", "Luis", "Ortega", "Facilities", "luis.ortega@bofa.com", "+1 808 555 0208"),
      ],
    }),
    company({
      id: "c-4-c",
      name: "Deloitte",
      secondaryVertical: "Professional Services",
      propertyAffiliation: "Leased",
      phone: "+1 808 555 0300",
      employees: "2,100",
      naics: "541211",
      revenue: "$67B",
      website: "deloitte.com",
      emailDomain: "deloitte.com",
      floorRange: "7–8",
      suiteRange: "701–802",
      occupiedArea: "40,000 SF",
      contacts: [
        contact("ct-4-c1", "Megan", "Wright", "Office Manager", "megan.wright@deloitte.com", "+1 808 555 0300"),
      ],
    }),
  ],
  "5": [
    company({
      id: "c-5-a",
      name: "Plaza Retail Group",
      secondaryVertical: "Retail",
      phone: "+1 859 555 0140",
      employees: "350",
      naics: "531120",
      revenue: "$80M",
      website: "plazaretail.example",
      emailDomain: "plazaretail.example",
      floor: "1",
      suite: "110",
      occupiedArea: "18,000 SF",
      contacts: [
        contact("ct-5-a1", "Chris", "Nguyen", "General Manager", "chris.nguyen@plazaretail.example", "+1 859 555 0140"),
      ],
    }),
    company({
      id: "c-5-b",
      name: "Northwind Services",
      secondaryVertical: "Property Services",
      propertyAffiliation: "Leased",
      phone: "+1 859 555 0188",
      employees: "40",
      website: "northwind.example",
      emailDomain: "northwind.example",
      contacts: [],
    }),
  ],
  "7": [
    company({
      id: "c-7-a",
      name: "Americold",
      secondaryVertical: "Cold Storage",
      phone: "+1 505 555 0100",
      employees: "640",
      naics: "493120",
      revenue: "$2.4B",
      website: "americold.com",
      emailDomain: "americold.com",
      floor: "1",
      occupiedArea: "80,000 SF",
      status: "Enriched",
      contacts: [
        contact("ct-7-a1", "Dana", "Brooks", "Site Manager", "dana.brooks@americold.com", "+1 505 555 0100"),
      ],
    }),
  ],
};

export function companiesForLead(lead: Pick<Lead, "id" | "name">): Company[] {
  return companySeeds[lead.id] ?? [];
}

export const initialLeads: Lead[] = leadRecords.map((lead) => ({
  ...lead,
  companies: companiesForLead(lead),
}));

export { parseAppDate as parseDate } from "./dates";
