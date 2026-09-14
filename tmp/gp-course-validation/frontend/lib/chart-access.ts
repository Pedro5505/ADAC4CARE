// The demo role selector is never sufficient to grant hosted write access.
export function chartAccess(headers: Headers, allowedEmails: string, localDevelopment: boolean, carerEmails = '') {
  const email = headers.get('oai-authenticated-user-email')?.toLowerCase() ?? '';
  const id = headers.get('oai-authenticated-user-id');
  const authenticated = localDevelopment || Boolean(id && email);
  const gp = localDevelopment || allowedEmails.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email);
  const carer = localDevelopment || carerEmails.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email);
  return {
    authenticated,
    canPrescribe: authenticated && gp,
    actor: localDevelopment ? (headers.get('x-chart-role') === 'carer' ? 'Local carer evaluation' : 'Local GP evaluation') : id ?? '',
    canWrite: authenticated && gp && headers.get('x-chart-role') === 'gp',
    canAdminister: authenticated && carer,
    canSign: authenticated && carer && headers.get('x-chart-role') === 'carer',
  };
}
