// Static company/site info — deliberately NOT fetched from the backend.
// This content changes rarely (phone number, address, business hours),
// so baking it into the frontend build removes a network round-trip on
// every single page load and removes a dependency on the API being up
// just to render the footer/contact page. If any of these details
// change, update this file directly — it's a one-line edit and a
// redeploy, not worth a database round-trip on every visitor's first
// paint.
const siteConfig = {
  year_founded: '2020',
  company_phone: '+256 772 507582 / 0702-507582',
  company_phone_secondary: '0772 971620 / 0701-971620',
  company_email: 'muddoagro811@gmail.com',
  company_address: 'Container Village Nakivubo, Equity Bank Basement V013, P.O Box 25240',
  business_hours: 'Monday to Saturday, 8am until 6pm',
  whatsapp_number: '256772507582',
  facebook_url: 'https://facebook.com/p/MUDDO-AGRO-Chemicals-LTD-100063836929481/',
}

export default siteConfig
