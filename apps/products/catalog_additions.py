"""Catalogue additions shipped after the original seed: M-D AMETRYN + product-page photo galleries.

Used by BOTH the data migration (existing databases) and `seed_data` (fresh databases), so the same
content lands either way. Everything here is idempotent (safe to run twice).

Facts for M-D AMETRYN come only from what is printed on the supplied bottle photo
("M-D AMETRYN 500 g/L SC ... selective triazine herbicide, Group 5, for annual broadleaved weeds and
annual grasses in sugarcane, pineapple, cassava and tomatoes. Contents: 1 Litre"). The label's dosage
table was not legible, so no application rate is invented - the page tells users to follow the label.
"""

AMETRYN = {
    'name': 'M-D AMETRYN', 'category': 'herbicide', 'img': '/static/images/product_ametryn.jpg', 'stock': 50, 'reorder': 10,
    'active_ingredient': 'Ametryn 500 g/L', 'formulation': 'Suspension Concentrate (SC)',
    'crops': 'Sugarcane, Pineapple, Cassava, Tomatoes',
    'dosage': 'Follow the rate and timing printed on the product label.',
    'packing': '1 Litre',
    'description': 'A selective triazine (Group 5) herbicide for the control of annual broadleaved weeds and annual grasses in sugarcane, pineapple, cassava and tomatoes. Read the full label and apply only at the rates and timings it states.',
}

_I = '/static/images/'
# (product name, image url, caption)
GALLERIES = [
    ('M-D AMETRYN', _I + 'product_ametryn_original.jpg', 'M-D AMETRYN 500 g/L SC — 1 litre packs (original photo)'),
    ('M-D AMETRYN', _I + 'gallery_herbicide_shelf.jpg', 'M-D AMETRYN beside MD MAX 2,4-D selective herbicide'),
    ('MD FOS 48EC', _I + 'gallery_mdfos_pests.jpg', 'M-D FOS 48%EC 1 L bottles with the pests it is used against'),
    ('MAX 2.4-D 720SL', _I + 'gallery_herbicide_shelf.jpg', 'MD MAX 2,4-D beside M-D AMETRYN'),
    ('MD THION 350EC', _I + 'gallery_pesticide_range.jpg', 'M-D THION, TOP-LAXLY M and M-D ACELEMECTIN'),
    ('MD ACELEMECTIN 48EC', _I + 'gallery_pesticide_range.jpg', 'M-D THION, TOP-LAXLY M and M-D ACELEMECTIN'),
    ('TOP-LAXLY M 72WP', _I + 'gallery_pesticide_range.jpg', 'M-D THION, TOP-LAXLY M and M-D ACELEMECTIN'),
    ('MUDDOSATE 480SL', _I + 'gallery_range_lineup.jpg', 'The Muddo range lined up with knapsack sprayers'),
]


def apply_additions(Product, ProductImage, Inventory, add_missing_products=True):
    if add_missing_products and not Product.objects.filter(name__iexact=AMETRYN['name']).exists():
        p = Product.objects.create(
            name=AMETRYN['name'], category=AMETRYN['category'], description=AMETRYN['description'],
            active_ingredient=AMETRYN['active_ingredient'], formulation=AMETRYN['formulation'], crops=AMETRYN['crops'],
            dosage=AMETRYN['dosage'], packing=AMETRYN['packing'], image_url=AMETRYN['img'])
        Inventory.objects.get_or_create(product=p, defaults={'stock_qty': AMETRYN['stock'], 'reorder_level': AMETRYN['reorder'], 'unit': 'units'})
    for order, (name, url, caption) in enumerate(GALLERIES):
        p = Product.objects.filter(name__iexact=name).first()
        if p and not ProductImage.objects.filter(product=p, image_url=url).exists():
            ProductImage.objects.create(product=p, image_url=url, caption=caption, order=order)
