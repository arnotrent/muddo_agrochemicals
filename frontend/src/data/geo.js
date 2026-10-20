// Country → Region/State/Province → District/County lists for the "Add distributor" form.
// Level 3 is a dropdown where we have reliable lists and a free-text box elsewhere; there is always
// an "Other (type it)" option, and City/Town is always free text — nothing here can block an outlet.
export const COUNTRIES = ['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan', 'DR Congo', 'Other']
export const ISO = { Uganda: 'ug', Kenya: 'ke', Tanzania: 'tz', Rwanda: 'rw', Burundi: 'bi', 'South Sudan': 'ss', 'DR Congo': 'cd' }
export const REGION_LABEL = { Uganda: 'Region', Kenya: 'Province', Tanzania: 'Region', Rwanda: 'Province', Burundi: 'Province', 'South Sudan': 'State', 'DR Congo': 'Province', Other: 'Region / State' }
export const DISTRICT_LABEL = { Uganda: 'District', Kenya: 'County', Tanzania: 'District', Rwanda: 'District', Burundi: 'Commune / city', 'South Sudan': 'County / city', 'DR Congo': 'Territory / city', Other: 'District / city' }

const UG = {
  Central: ['Buikwe', 'Bukomansimbi', 'Butambala', 'Buvuma', 'Gomba', 'Kalangala', 'Kalungu', 'Kampala', 'Kassanda', 'Kayunga', 'Kiboga', 'Kyankwanzi', 'Kyotera', 'Luweero', 'Lwengo', 'Lyantonde', 'Masaka', 'Mityana', 'Mpigi', 'Mubende', 'Mukono', 'Nakaseke', 'Nakasongola', 'Rakai', 'Sembabule', 'Wakiso'],
  Eastern: ['Amuria', 'Budaka', 'Bududa', 'Bugiri', 'Bugweri', 'Bukedea', 'Bukwa', 'Bukwo', 'Bulambuli', 'Busia', 'Butaleja', 'Butebo', 'Buyende', 'Iganga', 'Jinja', 'Kaberamaido', 'Kalaki', 'Kaliro', 'Kamuli', 'Kapchorwa', 'Kapelebyong', 'Katakwi', 'Kibuku', 'Kumi', 'Kween', 'Luuka', 'Manafwa', 'Mayuge', 'Mbale', 'Namayingo', 'Namisindwa', 'Namutumba', 'Ngora', 'Pallisa', 'Serere', 'Sironko', 'Soroti', 'Tororo'],
  Northern: ['Abim', 'Adjumani', 'Agago', 'Alebtong', 'Amolatar', 'Amudat', 'Amuru', 'Apac', 'Arua', 'Dokolo', 'Gulu', 'Kaabong', 'Karenga', 'Kitgum', 'Koboko', 'Kole', 'Kotido', 'Kwania', 'Lamwo', 'Lira', 'Madi-Okollo', 'Maracha', 'Moroto', 'Moyo', 'Nabilatuk', 'Nakapiripirit', 'Napak', 'Nebbi', 'Nwoya', 'Obongi', 'Omoro', 'Otuke', 'Oyam', 'Pader', 'Pakwach', 'Terego', 'Yumbe', 'Zombo'],
  Western: ['Buhweju', 'Buliisa', 'Bundibugyo', 'Bunyangabu', 'Bushenyi', 'Hoima', 'Ibanda', 'Isingiro', 'Kabale', 'Kabarole', 'Kagadi', 'Kakumiro', 'Kamwenge', 'Kanungu', 'Kasese', 'Kazo', 'Kibaale', 'Kikuube', 'Kiruhura', 'Kiryandongo', 'Kisoro', 'Kitagwenda', 'Kyegegwa', 'Kyenjojo', 'Masindi', 'Mbarara', 'Mitooma', 'Ntoroko', 'Ntungamo', 'Rubanda', 'Rubirizi', 'Rukiga', 'Rukungiri', 'Rwampara', 'Sheema'],
}
const KE = {
  Nairobi: ['Nairobi'],
  Central: ['Kiambu', 'Kirinyaga', "Murang'a", 'Nyandarua', 'Nyeri'],
  Coast: ['Kilifi', 'Kwale', 'Lamu', 'Mombasa', 'Taita-Taveta', 'Tana River'],
  Eastern: ['Embu', 'Isiolo', 'Kitui', 'Machakos', 'Makueni', 'Marsabit', 'Meru', 'Tharaka-Nithi'],
  'North Eastern': ['Garissa', 'Mandera', 'Wajir'],
  Nyanza: ['Homa Bay', 'Kisii', 'Kisumu', 'Migori', 'Nyamira', 'Siaya'],
  'Rift Valley': ['Baringo', 'Bomet', 'Elgeyo-Marakwet', 'Kajiado', 'Kericho', 'Laikipia', 'Nakuru', 'Nandi', 'Narok', 'Samburu', 'Trans-Nzoia', 'Turkana', 'Uasin Gishu', 'West Pokot'],
  Western: ['Bungoma', 'Busia', 'Kakamega', 'Vihiga'],
}
const RW = {
  Kigali: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  Northern: ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  Southern: ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'],
  Eastern: ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
  Western: ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
}
const list = (names) => Object.fromEntries(names.map((n) => [n, []]))
const TZ = list(['Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Zanzibar North', 'Zanzibar South & Central', 'Zanzibar Urban/West'])
const SS = list(['Central Equatoria', 'Eastern Equatoria', 'Western Equatoria', 'Jonglei', 'Unity', 'Upper Nile', 'Warrap', 'Northern Bahr el Ghazal', 'Western Bahr el Ghazal', 'Lakes'])
const CD = list(['Kinshasa', 'Kongo Central', 'Kwango', 'Kwilu', 'Mai-Ndombe', 'Équateur', 'Tshuapa', 'Mongala', 'Nord-Ubangi', 'Sud-Ubangi', 'Tshopo', 'Bas-Uélé', 'Haut-Uélé', 'Ituri', 'Nord-Kivu', 'Sud-Kivu', 'Maniema', 'Haut-Katanga', 'Lualaba', 'Haut-Lomami', 'Tanganyika', 'Lomami', 'Sankuru', 'Kasaï', 'Kasaï-Central', 'Kasaï-Oriental'])

// `null` = no dropdown, free text.
export const GEO = { Uganda: UG, Kenya: KE, Rwanda: RW, Tanzania: TZ, 'South Sudan': SS, 'DR Congo': CD, Burundi: null, Other: null }

export const regionsOf = (country) => (GEO[country] ? Object.keys(GEO[country]) : [])
export const districtsOf = (country, region) => GEO[country]?.[region] || []
