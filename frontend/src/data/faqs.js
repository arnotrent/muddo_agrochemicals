// Static FAQ content — deliberately NOT fetched from the backend or
// editable through the admin panel. FAQs are stable, rarely-changing
// content; keeping them in the bundle means the About page renders
// immediately with no API dependency. To change an answer, edit this
// file directly and redeploy.
const faqs = [
  {
    id: 1,
    question: 'Are your products MAAIF-registered?',
    answer: "Yes. All products distributed by MACL are registered with Uganda's Ministry of Agriculture, Animal Industry and Fisheries (MAAIF). Certificates available on request.",
  },
  {
    id: 2,
    question: 'Do you sell wholesale?',
    answer: 'Absolutely. We supply retail and wholesale. Contact us at +256 772 507582 for bulk pricing and distributor partnerships.',
  },
  {
    id: 3,
    question: 'How do I choose the right product?',
    answer: 'Call us or visit our Kampala office. Describe your crop and pest/weed/disease — our team will recommend the right product, dosage and timing.',
  },
  {
    id: 4,
    question: 'Are your products environmentally safe?',
    answer: 'All registered products include environmental safety assessments. Follow label instructions: buffer zones, pre-harvest intervals, and proper PPE.',
  },
  {
    id: 5,
    question: 'Do you deliver upcountry?',
    answer: 'Products available through our 11-outlet nationwide network. Use our Store Locator. For large bulk orders, direct delivery can be arranged.',
  },
  {
    id: 6,
    question: 'What is the minimum order?',
    answer: 'No minimum for retail. For wholesale, minimums vary by product — contact our sales team.',
  },
  {
    id: 7,
    question: 'How do I report a product problem?',
    answer: 'Call +256 772 507582 or email muddoagro811@gmail.com. Keep the product, note the batch number, and describe the issue. We investigate all complaints.',
  },
  {
    id: 8,
    question: 'What is your return policy?',
    answer: 'Sealed, unused products in original packaging may be returned within 7 days with proof of purchase.',
  },
]

export default faqs
