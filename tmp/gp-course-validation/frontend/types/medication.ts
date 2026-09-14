export type MedicationRight = {
  patient: string;
  drug: string;
  dose: string;
  route: string;
  scheduledTime: string;
  documentation: string;
  reason: string;
  response: string;
};

export type AdministrationStatus = 'scheduled' | 'due' | 'administered' | 'missed' | 'withheld';
