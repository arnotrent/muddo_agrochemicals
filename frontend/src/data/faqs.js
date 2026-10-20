// Static FAQ content — deliberately NOT fetched from the backend or
// editable through the admin panel. FAQs are stable, rarely-changing
// content; keeping them in the bundle means the About page renders
// immediately with no API dependency. To change an answer, edit this
// file directly and redeploy.
const faqGroups = [
  {
    id: 'general',
    title: 'General & Location',
    icon: 'map-marker-alt',
    items: [
      {
        id: 1,
        question: 'Where exactly is the shop located in Kampala?',
        answer: 'Our main outlet is located at Container Village in Nakivubo, Kampala. You can find us in the Equity Bank Basement (Room V013) or via the Venus Plaza Basement entrance.',
      },
      {
        id: 2,
        question: 'What are your official working hours?',
        answer: 'We are open Monday through Friday from 9:00 AM to 5:00 PM. Please note that our retail outlet is closed on Sundays.',
      },
    ],
  },
  {
    id: 'quality',
    title: 'Product Verification & Quality',
    icon: 'shield-alt',
    items: [
      {
        id: 3,
        question: 'Are your agrochemical products MAAIF-registered?',
        answer: 'Yes. All agrochemicals distributed by Muddo Agro Chemicals Ltd strictly comply with the Ministry of Agriculture, Animal Industry and Fisheries (MAAIF) regulatory standards. Our stock products are fully approved and registered under the Uganda Agricultural Chemicals Control Act to ensure quality and safety.',
      },
      {
        id: 4,
        question: 'How can I verify that a Muddo product is authentic?',
        answer: 'Always inspect the packaging for official company branding, untampered seal caps, and clearly printed batch numbers. Purchasing directly from our authorized basement shop in Nakivubo guarantees genuine, original factory sourcing.',
      },
      {
        id: 5,
        question: 'Are your products environmentally safe?',
        answer: 'When used strictly according to the product label instructions, yes. All synthetic products undergo rigorous environmental evaluations. To minimize risks to soil, water sources, and non-target wildlife, farmers must follow the recommended dosages, mixing ratios, and specific spray timing guidelines.',
      },
    ],
  },
  {
    id: 'products',
    title: 'Products & Farm Consultation',
    icon: 'flask',
    items: [
      {
        id: 6,
        question: 'What types of agrochemicals do you sell?',
        answer: 'We supply a comprehensive range of both selective and non-selective crop protection chemicals. This includes targeted insecticides, fungicides, and high-quality herbicides designed to protect and boost local crops such as tomatoes, watermelons, and passion fruits.',
      },
      {
        id: 7,
        question: 'Do you sell organic fertilizers or only synthetic chemicals?',
        answer: 'Our primary inventory consists of specialized chemical fertilizers and synthetic crop protection agents. However, we regularly update our stock to include blended nutritional supplements and soil conditioners tailored to boost commercial fruit farming.',
      },
      {
        id: 8,
        question: 'How do I choose the right product for my farm?',
        answer: 'We recommend consulting our technical team directly. You can visit our Kampala shop or speak with our localized agronomists. For the best advice, please provide details about your specific crop type, the acreage, and the exact pest, disease, or weed problem you are facing.',
      },
    ],
  },
  {
    id: 'orders',
    title: 'Orders, Wholesale & Delivery',
    icon: 'truck',
    items: [
      {
        id: 9,
        question: 'Do you sell wholesale?',
        answer: 'Yes. Muddo Agro Chemicals Ltd operates primarily as a bulk supplier and distributor. We offer highly competitive wholesale pricing structures for agro-dealers, commercial farmers, and cooperative unions looking to buy in larger volumes.',
      },
      {
        id: 10,
        question: 'What is the minimum order quantity?',
        answer: 'There is no minimum order requirement for walk-in retail customers; you can purchase single packages (such as 250ml or 1L bottles) directly from our shop. However, to qualify for our discounted wholesale pricing, you must purchase in bulk cartons or crates.',
      },
      {
        id: 11,
        question: 'Do you deliver upcountry?',
        answer: 'Yes, we coordinate upcountry delivery for bulk orders. Transportation logistics, regional routes, and delivery fees can be arranged directly with our management team through our official office contact lines.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support, Returns & Issues',
    icon: 'headset',
    items: [
      {
        id: 12,
        question: 'How do I report a product problem?',
        answer: 'If you experience any issues, please contact our customer care team or visit our Nakivubo Container Village branch. To help us resolve the matter quickly, please bring your original purchase receipt and be ready to provide the product batch number printed on the packaging.',
      },
      {
        id: 13,
        question: 'What is your return policy?',
        answer: 'For health, safety, and strict quality control reasons, agrochemicals can only be returned or exchanged if the factory seal is completely unbroken, the packaging is undamaged, and it is within our specified return window. We cannot accept returns for any products that have been opened, tampered with, or partially mixed.',
      },
    ],
  },
]

export default faqGroups
