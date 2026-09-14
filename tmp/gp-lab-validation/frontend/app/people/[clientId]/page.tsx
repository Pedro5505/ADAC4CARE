import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Calendar, FileText, MapPin, MessageCircle, Pill, ShieldCheck, Stethoscope } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { getClient } from '@/data/demo';

type Props = { params: Promise<{ clientId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientId } = await params;
  const { client, home } = getClient(clientId);
  return {
    title: `${client.name} | ADAC4CARE`,
    description: `Medication profile for ${client.name} at ${home.name}.`,
    openGraph: { title: `${client.name} | ADAC4CARE`, description: `Medication profile for ${client.name} at ${home.name}.`, images: [] },
    twitter: { card: 'summary', title: `${client.name} | ADAC4CARE`, description: `Medication profile for ${client.name} at ${home.name}.`, images: [] },
  };
}

export default async function ClientProfilePage({ params }: Props) {
  const { clientId } = await params;
  const { client, home } = getClient(clientId);
  const clinicalReports = client.reports.filter((report) => report.authorRole === 'RN' || report.authorRole === 'GP');

  return (
    <AppShell>
      <div className="back-row"><Link href="/people"><ArrowLeft size={15} /> Back to people</Link></div>
      <section className="client-profile-hero">
        <div className="profile-avatar-xl" style={{ backgroundColor: `${client.photoColor}18`, color: client.photoColor }}>{client.initials}</div>
        <div className="client-profile-title"><p className="eyebrow"><MapPin size={14} /> {home.name} · {client.room}</p><h1>{client.name}</h1><p>Preferred name {client.preferredName} · {client.pronouns} · DOB {client.dateOfBirth}</p></div>
        <div className="profile-actions"><Link className={buttonVariants({ variant: 'outline' })} href={`/messages?client=${client.id}`}><MessageCircle /> Messages</Link><Link className={buttonVariants()} href={`/medication-charts?client=${client.id}`}><Pill /> Medication chart</Link></div>
      </section>

      <section className="profile-grid">
        <div className="profile-main-column">
          <article className={`profile-panel allergy-profile ${client.allergies.length ? 'has-allergy' : ''}`}><div className="profile-panel-heading">{client.allergies.length ? <AlertTriangle /> : <ShieldCheck />}<div><h2>Allergies and adverse reactions</h2><p>{client.allergies.length ? client.allergies.join(' · ') : 'No known medication allergies recorded'}</p></div><Badge variant={client.allergies.length ? 'destructive' : 'secondary'}>{client.allergies.length ? 'Drug alert' : 'Reviewed'}</Badge></div></article>
          <article className="profile-panel"><div className="profile-panel-heading"><Pill /><div><h2>Current medication orders</h2><p>{client.medications.filter((item) => item.status === 'active').length} active orders</p></div></div><div className="profile-med-list">{client.medications.map((medication) => <Link href={`/medication-charts?client=${client.id}&med=${medication.id}`} key={medication.id}><span className={`med-type-dot ${medication.type}`} /><span><strong>{medication.name} · {medication.dose}</strong><small>{medication.schedule} · {medication.route}</small></span><Badge variant="outline">{medication.type.toUpperCase()}</Badge></Link>)}</div></article>
          <article className="profile-panel"><div className="profile-panel-heading"><FileText /><div><h2>Recent clinical instructions</h2><p>RN and GP reports only</p></div></div><div className="clinical-report-list compact">{clinicalReports.map((report) => <Link href={`/reports?client=${client.id}`} key={report.id}><span><strong>{report.title}</strong><small>{report.authorRole} · {report.author} · {report.date}</small></span><Badge variant={report.acknowledged ? 'secondary' : 'outline'}>{report.acknowledged ? 'Acknowledged' : 'Review'}</Badge></Link>)}</div></article>
        </div>
        <aside className="profile-side-column">
          <article className="profile-panel"><h2>Safe administration</h2><dl className="detail-list"><div><dt>Method</dt><dd>{client.medicationMethod}</dd></div><div><dt>Delivery</dt><dd>{client.medicationDelivery}</dd></div><div><dt>Fluids / method</dt><dd>{client.medicationAdministration}</dd></div><div><dt>Support notes</dt><dd>{client.supportNotes}</dd></div></dl></article>
          <article className="profile-panel"><h2>Clinical contacts</h2><dl className="detail-list"><div><dt><Stethoscope size={14} /> Primary GP</dt><dd>{client.gp}</dd></div><div><dt><Pill size={14} /> Pharmacy</dt><dd>{client.pharmacy}</dd></div><div><dt><Calendar size={14} /> NDIS number</dt><dd>{client.ndisNumber}</dd></div></dl></article>
          <article className="profile-panel"><h2>Support context</h2><div className="diagnosis-list">{client.diagnoses.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div></article>
        </aside>
      </section>
    </AppShell>
  );
}
