// Static company/site info — deliberately NOT fetched from the backend (no network round-trip
// on first paint; the footer/contact page work even if the API is asleep).
// To change any of these, edit this file and redeploy the frontend.
const siteConfig = {
  year_founded: '2020',
  // Display strings (kept for existing pages) …
  company_phone: '+256 772 507582 / +256 702 507582',
  company_phone_secondary: '+256 772 971620 / +256 701 971620',
  company_email: 'muddoagro811@gmail.com',
  company_email_secondary: 'kulangu_w@yahoo.com',
  // … and structured lists for pages that render each number / address as its own link.
  phones: [
    { label: '+256 772 507582', tel: '+256772507582' },
    { label: '+256 702 507582', tel: '+256702507582' },
    { label: '+256 772 971620', tel: '+256772971620' },
    { label: '+256 701 971620', tel: '+256701971620' },
  ],
  emails: ['muddoagro811@gmail.com', 'kulangu_w@yahoo.com'],
  // Physical location and postal address are separate on purpose.
  company_address: 'Basement Room V013, Venus Plaza, Container Village, Nakivubo Place, Kampala Central Division',
  company_po_box: 'P.O. Box 25240, Kampala, Uganda',
  business_hours: 'Monday to Friday, 9:00 AM until 5:00 PM (closed Sundays)',
  whatsapp_number: '256772507582',
  facebook_url: 'https://facebook.com/p/MUDDO-AGRO-Chemicals-LTD-100063836929481/',
}

export default siteConfig
