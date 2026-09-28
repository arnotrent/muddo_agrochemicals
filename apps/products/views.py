import hashlib
import io
import time
from datetime import timedelta

from django.conf import settings
from django.contrib import messages
from django.core import signing
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Count
from django.http import FileResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.products.models import Product, ProductReview

TABS=[('Pesticides','pesticides','bug'),('Herbicides','herbicides','seedling'),
      ('Fungicides','fungicides','microscope'),('Fertilizers & Equipment','other_products','boxes')]

_IMG='/static/images/'
_MDFOS={'src':_IMG+'gallery_mdfos_pests.jpg','alt':'M-D FOS 48%EC insecticide bottles beside soil grub, beetle, slug and bed bug','caption':'M-D FOS 48%EC — chlorpyrifos insecticide for soil and foliar pests'}
_PEST_RANGE={'src':_IMG+'gallery_pesticide_range.jpg','alt':'M-D THION, TOP-LAXLY M and M-D ACELEMECTIN packs in front of crop-pest photos','caption':'M-D THION · TOP-LAXLY M · M-D ACELEMECTIN — in front of the pests they are used against'}
_HERB_SHELF={'src':_IMG+'gallery_herbicide_shelf.jpg','alt':'M-D AMETRYN and MD MAX 2,4-D selective herbicide bottles in front of sugarcane and sorghum','caption':'M-D AMETRYN and MD MAX 2,4-D selective herbicide'}
_CROPS={'src':_IMG+'gallery_crops_collage.jpg','alt':'Collage of pasture, tomatoes, green beans and cereal crops','caption':'Pasture, tomatoes, beans and cereals — the fields our products serve'}
_LINEUP={'src':_IMG+'gallery_range_lineup.jpg','alt':'Knapsack sprayers and Muddo herbicide, insecticide and fungicide products lined up','caption':'Knapsack sprayers alongside the MUDDOSATE, MD MAIZE PLUS, MD MAX 2,4-D, TOP-LAXLY M and M-D FOS range'}

META={'pesticide':{'template':'products/pesticides.html','page_title':'Pesticides','page_tag':'Insect & Pest Control',
       'page_desc':'Professional-grade MAAIF-registered insecticides for all major crop pests across Uganda.','hero_icon':'bug','hero_image':'/static/images/hero_pesticides.jpg','gallery':[_MDFOS,_PEST_RANGE]},
      'herbicide':{'template':'products/herbicides.html','page_title':'Herbicides','page_tag':'Weed Control',
       'page_desc':'Selective and non-selective herbicides for effective weed management in all crops.','hero_icon':'seedling','hero_image':'/static/images/hero_herbicides.jpg','gallery':[_HERB_SHELF,_CROPS]},
      'fungicide':{'template':'products/fungicides.html','page_title':'Fungicides','page_tag':'Disease Control',
       'page_desc':'Systemic and contact fungicides for prevention and control of fungal crop diseases.','hero_icon':'microscope','hero_image':'/static/images/hero_fungicides.jpg','gallery':[_PEST_RANGE]},
      'other':{'template':'products/other_products.html','page_title':'Fertilizers & Equipment','page_tag':'Agri Inputs',
       'page_desc':'Fertilizers, foliar feeds and spraying equipment to maximise your crop yields.','hero_icon':'boxes','hero_image':'/static/images/hero_fertilizers.jpg','gallery':[_LINEUP]}}

def _list(request,cat):
    m=META[cat]; products=Product.objects.filter(category=cat).select_related('inventory')
    return render(request,m['template'],{'products':products,'cat_tabs':TABS,**m})

def pesticides(request):    return _list(request,'pesticide')
def herbicides(request):    return _list(request,'herbicide')
def fungicides(request):    return _list(request,'fungicide')
def other_products(request):return _list(request,'other')

# ───────────────────────── product detail + reviews ─────────────────────────
_signer_salt='product-review-form'

def _client_hash(request):
    ip=(request.META.get('HTTP_X_FORWARDED_FOR','').split(',')[0].strip() or request.META.get('REMOTE_ADDR',''))
    return hashlib.sha256(f'{settings.SECRET_KEY}|review|{ip}'.encode()).hexdigest()

def _detail_context(request,p,form=None,errors=None):
    related=Product.objects.filter(category=p.category).exclude(pk=p.pk).order_by('?')[:3]
    specs=[('Active Ingredient',p.active_ingredient),('Formulation',p.formulation),
           ('Target Crops',p.crops),('Application Rate',p.dosage),('Pack Sizes',p.packing),
           ('Category',p.get_category_display()),
           ('Stock','In Stock' if p.stock_qty>10 else ('Low Stock' if p.stock_qty>0 else 'Out of Stock'))]
    approved=p.reviews.filter(status='approved')
    dist={r['rating']:r['n'] for r in approved.values('rating').annotate(n=Count('id'))}
    stats=p.review_stats
    bars=[{'star':s,'n':dist.get(s,0),'pct':round(100*dist.get(s,0)/stats['count']) if stats['count'] else 0} for s in (5,4,3,2,1)]
    return {'product':p,'related':related,'specs':specs,'gallery':list(p.gallery.all()),
            'reviews':list(approved[:30]),'review_stats':stats,'review_bars':bars,
            'review_token':signing.dumps(time.time(),salt=_signer_salt),
            'review_form':form or {},'review_errors':errors or {},'stars':(1,2,3,4,5)}

def product_detail(request,product_id):
    p=get_object_or_404(Product,pk=product_id)
    return render(request,'products/product_detail.html',_detail_context(request,p))

@require_POST
def submit_review(request,product_id):
    p=get_object_or_404(Product,pk=product_id)
    post=request.POST
    form={k:post.get(k,'').strip() for k in ('name','location','email','rating','title','comment')}
    back=redirect(f'{p.get_absolute_url()}#reviews')

    # bots: hidden honeypot filled in -> pretend success, store nothing
    if post.get('website'): return back
    # the form must have been rendered a few seconds to a couple of hours ago
    try: age=time.time()-signing.loads(post.get('form_token',''),salt=_signer_salt,max_age=7200)
    except signing.BadSignature:
        messages.error(request,'Your review form expired — please try again.'); return back
    if age<3:
        messages.error(request,'That was very fast — please take a moment and submit again.'); return back

    errors={}
    if not 2<=len(form['name'])<=80: errors['name']='Please enter your name (2–80 characters).'
    try: rating=int(form['rating']); assert 1<=rating<=5
    except (ValueError,AssertionError): errors['rating']='Please choose a star rating from 1 to 5.'; rating=0
    if not 10<=len(form['comment'])<=1500: errors['comment']='Please write between 10 and 1500 characters.'
    if len(form['title'])>100: errors['title']='Title is too long (100 max).'
    if len(form['location'])>80: errors['location']='Location is too long (80 max).'
    if form['email']:
        try: validate_email(form['email'])
        except ValidationError: errors['email']='That email address does not look right.'
    if errors:
        ctx=_detail_context(request,p,form,errors); return render(request,'products/product_detail.html',ctx,status=400)

    h=_client_hash(request)
    key=f'reviewthr:{h}'; cache.add(key,0,3600)
    try: n=cache.incr(key)
    except ValueError: n=1
    if n>3 or ProductReview.objects.filter(product=p,submitter_hash=h,created_at__gte=timezone.now()-timedelta(hours=24)).exists():
        messages.error(request,'You have already reviewed this product recently. Thank you!'); return back
    ProductReview.objects.create(product=p,name=form['name'],location=form['location'],email=form['email'],
        rating=rating,title=form['title'],comment=form['comment'],submitter_hash=h)
    messages.success(request,'Thank you! Your review has been received and will appear once our team has approved it.')
    return back

def spec_sheet(request,product_id):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate,Table,TableStyle,Paragraph,Spacer
    from reportlab.lib.enums import TA_RIGHT
    from datetime import datetime
    p=get_object_or_404(Product,pk=product_id)
    buf=io.BytesIO()
    doc=SimpleDocTemplate(buf,pagesize=A4,leftMargin=20*mm,rightMargin=20*mm,topMargin=18*mm,bottomMargin=18*mm)
    DARK=colors.HexColor('#1e293b'); MID=colors.HexColor('#38bdf8'); GOLD=colors.HexColor('#0ea5e9')
    LGRN=colors.HexColor('#eef2f6'); LGRY=colors.HexColor('#f5f5f5'); WHT=colors.white; MUTED=colors.HexColor('#565656')
    CATC={'pesticide':colors.HexColor('#ef4444'),'herbicide':MID,'fungicide':colors.HexColor('#0ea5e9'),'other':colors.HexColor('#38bdf8')}
    cat_c=CATC.get(p.category,MID)
    h1=ParagraphStyle('h1',fontName='Helvetica-Bold',fontSize=20,textColor=WHT)
    h2=ParagraphStyle('h2',fontName='Helvetica-Bold',fontSize=12,textColor=DARK)
    bd=ParagraphStyle('bd',fontName='Helvetica-Bold',fontSize=10,textColor=colors.HexColor('#111'))
    sm=ParagraphStyle('sm',fontName='Helvetica',fontSize=8.5,textColor=MUTED)
    lb=ParagraphStyle('lb',fontName='Helvetica-Bold',fontSize=9.5,textColor=MUTED)
    story=[]
    hdr=Table([[Paragraph(f'<b>{p.name}</b>',h1),Paragraph(f'<b>{p.get_category_display()}</b><br/><font size="9">TECHNICAL DATA SHEET</font>',ParagraphStyle('r',fontName='Helvetica-Bold',fontSize=13,textColor=cat_c,alignment=TA_RIGHT))]],colWidths=[120*mm,54*mm])
    hdr.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),DARK),('PADDING',(0,0),(-1,-1),14),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(hdr)
    band=Table([[Paragraph('MUDDO AGRO CHEMICALS LTD · Container Village Nakivubo, Kampala · +256 772 507582 · muddoagro811@gmail.com',sm)]],colWidths=[174*mm])
    band.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),LGRN),('PADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),1.5,MID)]))
    story+=[band,Spacer(1,8*mm)]
    if p.description: story+=[Paragraph('<b>PRODUCT DESCRIPTION</b>',h2),Spacer(1,3*mm),Paragraph(p.description,ParagraphStyle('bd2',fontName='Helvetica',fontSize=10,textColor=colors.HexColor('#111'),leading=15)),Spacer(1,7*mm)]
    specs=[('Active Ingredient',p.active_ingredient or '—'),('Formulation',p.formulation or '—'),('Target Crops',p.crops or '—'),('Application Rate',p.dosage or '—'),('Pack Sizes',p.packing or '—'),('Category',p.get_category_display())]
    rows=[[Paragraph(k,lb),Paragraph(v,bd)] for k,v in specs]
    t=Table(rows,colWidths=[55*mm,119*mm])
    t.setStyle(TableStyle([('ROWBACKGROUNDS',(0,0),(-1,-1),[WHT,LGRY]),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('LEFTPADDING',(0,0),(-1,-1),10),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#e0e0e0')),('LINEBELOW',(0,-1),(-1,-1),1.5,MID)]))
    story+=[Paragraph('<b>TECHNICAL SPECIFICATIONS</b>',h2),Spacer(1,3*mm),t,Spacer(1,8*mm)]
    safety=[['01','Read the complete product label before use.'],['02','Wear PPE: gloves, goggles, face mask and protective clothing.'],['03','Mix in clean water using a calibrated sprayer. Never exceed recommended rate.'],['04','Observe pre-harvest interval (PHI) stated on the label.'],['05','Store sealed in original container in cool, dry place away from children.'],['06','Triple-rinse and puncture empty containers. Never burn or reuse.']]
    st=Table(safety,colWidths=[12*mm,162*mm])
    st.setStyle(TableStyle([('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,0),(0,-1),MID),('FONTSIZE',(0,0),(-1,-1),9.5),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-1),0.3,colors.HexColor('#e0e0e0'))]))
    story+=[Paragraph('<b>SAFE USE DIRECTIONS</b>',h2),Spacer(1,3*mm),st,Spacer(1,8*mm)]
    ft=Table([[Paragraph('Informational only. Always refer to the registered product label.',sm),Paragraph(f'Generated: {datetime.now().strftime("%d %b %Y")}',ParagraphStyle('fd',fontName='Helvetica',fontSize=8.5,textColor=MUTED,alignment=TA_RIGHT))]],colWidths=[120*mm,54*mm])
    ft.setStyle(TableStyle([('LINEABOVE',(0,0),(-1,0),0.5,colors.HexColor('#e0e0e0')),('TOPPADDING',(0,0),(-1,0),8)]))
    story.append(ft)
    doc.build(story); buf.seek(0)
    return FileResponse(buf,as_attachment=True,filename=f'MACL_{p.name.replace(" ","_")}_DataSheet.pdf',content_type='application/pdf')
