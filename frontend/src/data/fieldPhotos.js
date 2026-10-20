// Real photography supplied by MACL — ADDED alongside existing imagery, never replacing it.
// `w`/`h` are intrinsic sizes so the gallery reserves space (no layout shift while loading).
const P = (file, alt, caption, w, h) => ({ id: file, src: `/images/${file}`, alt, caption, w, h })

export const PHOTOS = {
  herbicide: [
    P('field_herbicides_sugarcane_sorghum.jpg', 'M-D Ametryn and MD MAX 2,4-D herbicide bottles in front of sugarcane and sorghum', 'M-D Ametryn and MD MAX 2,4-D — for sugarcane, sorghum and other crops', 952, 1269),
    P('field_ametryn_pair.jpg', 'Two 1 litre bottles of M-D Ametryn 500 g/L SC herbicide', 'M-D Ametryn 500 g/L SC — 1 Litre', 1269, 952),
    P('field_crops_collage.jpg', 'Tomatoes, green beans, maize and grass crops', 'Crops our herbicide range protects', 1568, 779),
  ],
  pesticide: [
    P('field_fos_insecticide_poster.jpg', 'M-D FOS 48% EC insecticide bottles with soil grub, beetle, slug and bed bug', 'M-D FOS 48% EC — chlorpyrifos-ethyl insecticide', 924, 1308),
    P('field_pests_caterpillars.jpg', 'Caterpillar pests photographed on crop leaves', 'Know the pest before you spray', 929, 377),
    P('field_pesticide_fungicide_range.jpg', 'M-D Thion, Top-Laxly M and M-D Acelemectin products', 'M-D Thion, TOP-LAXLY M and M-D Acelemectin', 951, 849),
  ],
  fungicide: [
    P('field_pesticide_fungicide_range.jpg', 'TOP-LAXLY M 72% WP fungicide sachet beside M-D Thion and M-D Acelemectin', 'TOP-LAXLY M 72% WP alongside our insecticide range', 951, 849),
    P('field_crops_collage.jpg', 'Tomatoes, green beans and maize crops', 'Vegetable and cereal crops growers protect', 1568, 779),
  ],
  other: [
    P('field_range_with_sprayers.jpg', 'MACL product range with Farmate and Muddo Super knapsack sprayers', 'The MACL range with knapsack sprayers', 1800, 956),
  ],
}

// Product-detail pages: which photos are relevant to which product (matched by name).
const BY_NAME = [
  [/ametryn/i, ['field_ametryn_pair.jpg', 'field_herbicides_sugarcane_sorghum.jpg']],
  [/max 2[.,]4-d/i, ['field_herbicides_sugarcane_sorghum.jpg', 'field_range_with_sprayers.jpg']],
  [/muddosate|maize plus/i, ['field_range_with_sprayers.jpg', 'field_crops_collage.jpg']],
  [/fos/i, ['field_fos_insecticide_poster.jpg', 'field_pests_caterpillars.jpg']],
  [/top.?lax|acelemectin|thion|thoate|benzo/i, ['field_pesticide_fungicide_range.jpg', 'field_pests_caterpillars.jpg']],
  [/sprayer/i, ['field_range_with_sprayers.jpg']],
]
const ALL = Object.fromEntries(Object.values(PHOTOS).flat().map((p) => [p.id, p]))

export function photosForProduct(name = '') {
  const hit = BY_NAME.find(([re]) => re.test(name))
  return hit ? hit[1].map((id) => ALL[id]).filter(Boolean) : []
}
