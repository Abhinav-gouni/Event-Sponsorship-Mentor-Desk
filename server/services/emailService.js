export async function sendEmail({ to, subject, body }) {
  return {
    to,
    subject,
    body,
    queued: true,
    provider: 'local-mock',
  };
}
