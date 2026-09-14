export type UserRole = 'carer' | 'rn' | 'management' | 'gp' | 'pharmacist';

export type Administration = {
  date: string;
  time: string;
  qty: string;
  initial: string;
  status: 'administered' | 'withheld' | 'refused' | 'not-due';
};

export type Medication = {
  id: string;
  name: string;
  genericName: string;
  type: 'routine' | 'prn';
  dose: string;
  route: string;
  form: string;
  quantity: string;
  schedule: string;
  times: string[];
  indication: string;
  instructions: string;
  maxDailyDose?: string;
  prescriber: string;
  prescriberNumber: string;
  prescribedDate: string;
  reviewDate: string;
  status: 'active' | 'ceased';
  administrations: Administration[];
};

export type ClinicalReport = {
  id: string;
  category: 'GP instruction' | 'RN review' | 'Dose change' | 'Pharmacy note';
  title: string;
  author: string;
  authorRole: 'GP' | 'RN' | 'Pharmacist';
  date: string;
  summary: string;
  action: string;
  acknowledged: boolean;
};

export type CareMessage = {
  id: string;
  type: 'incident' | 'handover' | 'management';
  title: string;
  author: string;
  role: string;
  date: string;
  body: string;
  priority: 'routine' | 'important' | 'urgent';
  pinned?: boolean;
};

export type Client = {
  id: string;
  initials: string;
  name: string;
  preferredName: string;
  dateOfBirth: string;
  ndisNumber: string;
  room: string;
  pronouns: string;
  photoColor: string;
  allergies: string[];
  diagnoses: string[];
  supportNotes: string;
  medicationMethod: string;
  medicationDelivery: string;
  medicationAdministration: string;
  gp: string;
  pharmacy: string;
  medications: Medication[];
  reports: ClinicalReport[];
  messages: CareMessage[];
};

export type GroupHome = {
  id: string;
  name: string;
  suburb: string;
  address: string;
  phone: string;
  manager: string;
  rnLead: string;
  shift: string;
  pinnedNote: string;
  clients: Client[];
};
