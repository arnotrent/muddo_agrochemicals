// Legal pages. Edit the text here and redeploy. Have a Ugandan lawyer review it before relying on it.
import site from './siteConfig'

export const LEGAL_UPDATED = '7 November 2026'
const NAME = 'Muddo Agro Chemicals LTD'
const year = new Date().getFullYear()

export const LEGAL = {
  copyright: {
    title: 'Copyright & Licence Notice',
    intro: `\u00a9 ${site.year_founded}\u2013${year} ${NAME}. All rights reserved.`,
    sections: [
      ['Ownership', `All content on this website - including text, product descriptions, technical data sheets, photographs, illustrations, logos, graphics, page layouts, software, the arrangement and compilation of data, and the database of products and outlets - is owned by ${NAME} ("MACL") or used under licence. It is protected by the Copyright and Neighbouring Rights Act, 2006 of Uganda and by international copyright treaties, including the Berne Convention.`],
      ['Trade names and marks', `MUDDO AGRO, MACL, our logo and our product names (for example MUDDOSATE, MD MAIZE PLUS, M-D FOS and TOP-LAXLY M) are trade names and marks of ${NAME}, whether or not registered. Other company and product names belong to their owners. Nothing here grants any right to use a mark without our written permission.`],
      ['What you may do', 'You may view the website, share links to it, and download or print a product data sheet for your own use, or to use the product safely, provided you keep all copyright and other notices intact and do not alter the document.'],
      ['What you may not do without our written permission', 'Copy, republish, sell, rent or distribute website content; copy our photographs or logos; scrape, crawl or systematically download the website or its database; frame or mirror the site; create derivative works; use the content, images or data to train or fine-tune machine-learning or AI models; remove notices; or present our content, products or packaging as your own. Counterfeiting or imitating our products, labels or marks is unlawful and will be pursued.'],
      ['Customer contributions', 'You keep ownership of reviews, testimonials and photographs you send us. By sending them you give MACL a non-exclusive, worldwide, royalty-free licence to display, reproduce, adapt for formatting, and promote them on our website and communication channels, for as long as they are published. You confirm the content is yours, is truthful, and that anyone shown in a photo agrees. We may edit for length, decline or remove any contribution. You can ask us to remove yours at any time.'],
      ['Third-party material', 'Map data is \u00a9 OpenStreetMap contributors and, where shown, Google Maps. Software libraries used to build this site remain the property of their authors under their own open-source licences.'],
      ['Product information', 'Product information is provided to help you choose and use our products correctly. It does not replace the registered product label, which always prevails. Follow the label, wear protective equipment and observe pre-harvest intervals.'],
      ['Permission requests and infringement', `To ask permission or to report a suspected infringement or counterfeit, e-mail ${site.emails[0]} or call ${site.phones[0].label}, quoting the page address and what you found. We act on credible reports promptly.`],
    ],
  },
  terms: {
    title: 'Terms of Use',
    intro: `By using this website you agree to these terms. If you do not agree, please do not use it. The website is operated by ${NAME}, ${site.company_address}.`,
    sections: [
      ['Using the website', 'Use the site lawfully and honestly. Do not attempt to gain unauthorised access, disrupt the service, upload malicious code, submit false or abusive reviews, or use automated tools to harvest content. Staff and agent accounts are personal: keep your password secret and report any misuse immediately.'],
      ['Accuracy and availability', 'We take care to keep information, stock status and contact details accurate, but they may change without notice and are not an offer. Confirm prices, availability and suitability with us before buying. The site may be unavailable from time to time.'],
      ['Agrochemical use', 'Agrochemicals are hazardous if misused. Always read and follow the product label. Information on this site is general guidance, not a substitute for professional agronomic advice for your specific crop, soil and conditions.'],
      ['Enquiries, reviews and testimonials', 'Information you submit must be accurate. We publish contributions at our discretion after review, under the licence in the Copyright & Licence Notice.'],
      ['Intellectual property', 'All content is protected as described in the Copyright & Licence Notice. These terms do not transfer any ownership to you.'],
      ['Disclaimer and liability', 'The website and its content are provided "as is". To the fullest extent permitted by law, MACL is not liable for indirect or consequential loss arising from use of, or inability to use, the website, or from reliance on its content. Nothing limits liability that cannot be limited by law.'],
      ['Links', 'Links to other websites (for example maps or social media) are for convenience; we do not control or endorse them.'],
      ['Changes and governing law', 'We may update these terms; the date below shows the latest version. These terms are governed by the laws of Uganda, and the courts of Uganda have jurisdiction.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: `${NAME} respects your privacy and handles personal data in line with the Data Protection and Privacy Act, 2019 of Uganda.`,
    sections: [
      ['Who is responsible', `${NAME}, ${site.company_address}, ${site.company_po_box}. Contact: ${site.emails[0]}, ${site.phones[0].label}.`],
      ['What we collect and why', 'Enquiry form: name, e-mail, phone and message - to answer you and track your enquiry. Newsletter: e-mail (and optional name), the time you agreed, and your confirmation - to send news and updates you asked for. Reviews and testimonials: name, rating, text and optional photo - to publish them after review. Staff and agents: account details, messages and files exchanged in the portal - to run the business.'],
      ['Legal basis', 'Your consent (newsletter, published reviews and photos), performing what you ask of us (enquiries), and our legitimate interest in running and securing the website. You can withdraw consent at any time.'],
      ['Newsletter', 'We only e-mail people who ticked the consent box and, where e-mail confirmation is enabled, confirmed their address. Every e-mail contains an unsubscribe link, and we stop immediately when you use it.'],
      ['Who we share it with', 'Only service providers that run the website for us: web hosting, the database, and e-mail delivery (Gmail), plus map providers (OpenStreetMap / Google) when you use maps. We do not sell personal data. We disclose data where the law requires it.'],
      ['Cookies and local storage', 'We do not use advertising or tracking cookies. Your browser stores your light/dark choice, staff sign-in tokens (staff only) and, if you leave a review, a private link to edit it on this device.'],
      ['How long we keep it', 'Enquiries and business records for as long as needed for the purpose and legal requirements; newsletter details until you unsubscribe (we then keep only a record that you opted out); published reviews until you ask us to remove them.'],
      ['Security', 'Traffic is encrypted (HTTPS), passwords are hashed, access to staff areas is role-restricted and rate-limited, and uploaded files are validated. No system is perfectly secure; tell us at once if you suspect a problem.'],
      ['Your rights', `You may ask to see, correct, delete or restrict your personal data, to object to its use, and to withdraw consent. E-mail ${site.emails[0]}. You may also complain to Uganda's Personal Data Protection Office.`],
      ['Children', 'This website is not directed at children, and we do not knowingly collect their personal data.'],
      ['Changes', 'We will post changes here and update the date below.'],
    ],
  },
}
