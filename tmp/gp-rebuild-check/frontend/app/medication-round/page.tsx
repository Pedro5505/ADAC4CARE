import { redirect } from 'next/navigation';

export default function MedicationRoundPage() {
  redirect('/medication-charts?mode=round');
}
