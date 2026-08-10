import io
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.products.models import Product
from apps.core.permissions import IsAdminOrReadOnly
from apps.products.serializers import ProductListSerializer, ProductDetailSerializer, ProductAdminSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    /api/v1/products/                 GET (public, filter/search), POST (admin)
    /api/v1/products/{id}/            GET (public), PATCH/DELETE (admin)
    /api/v1/products/{id}/spec-sheet/ GET (public) -> PDF
    ?category=pesticide|herbicide|fungicide|other
    ?search=<name/active_ingredient/crops>
    """
    queryset = Product.objects.select_related('inventory').order_by('category', 'name')
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category']
    search_fields = ['name', 'active_ingredient', 'crops', 'description']
    ordering_fields = ['name', 'created_at']

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return ProductAdminSerializer
        return ProductDetailSerializer if self.action == 'retrieve' else ProductListSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def product_related_view(request, pk):
    """GET /api/v1/products/{id}/related/ -> up to 3 same-category products."""
    p = get_object_or_404(Product, pk=pk)
    related = Product.objects.filter(category=p.category).exclude(pk=p.pk).order_by('?')[:3]
    return Response(ProductListSerializer(related, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def product_spec_sheet_view(request, pk):
    """GET /api/v1/products/{id}/spec-sheet/ -> application/pdf (unchanged from original)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.enums import TA_RIGHT
    from datetime import datetime

    p = get_object_or_404(Product, pk=pk)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
    DARK = colors.HexColor('#1e293b'); MID = colors.HexColor('#38bdf8')
    LGRN = colors.HexColor('#eef2f6'); LGRY = colors.HexColor('#f5f5f5'); WHT = colors.white; MUTED = colors.HexColor('#565656')
    CATC = {'pesticide': colors.HexColor('#ef4444'), 'herbicide': MID, 'fungicide': colors.HexColor('#0ea5e9'), 'other': colors.HexColor('#38bdf8')}
    cat_c = CATC.get(p.category, MID)
    h1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=20, textColor=WHT)
    h2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=12, textColor=DARK)
    bd = ParagraphStyle('bd', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#111'))
    sm = ParagraphStyle('sm', fontName='Helvetica', fontSize=8.5, textColor=MUTED)
    lb = ParagraphStyle('lb', fontName='Helvetica-Bold', fontSize=9.5, textColor=MUTED)
    story = []
    hdr = Table([[Paragraph(f'<b>{p.name}</b>', h1),
                  Paragraph(f'<b>{p.get_category_display()}</b><br/><font size="9">TECHNICAL DATA SHEET</font>',
                            ParagraphStyle('r', fontName='Helvetica-Bold', fontSize=13, textColor=cat_c, alignment=TA_RIGHT))]],
                 colWidths=[120 * mm, 54 * mm])
    hdr.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), DARK), ('PADDING', (0, 0), (-1, -1), 14), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(hdr)
    band = Table([[Paragraph('MUDDO AGRO CHEMICALS LTD \u00b7 Container Village Nakivubo, Kampala \u00b7 +256 772 507582 \u00b7 muddoagro811@gmail.com', sm)]], colWidths=[174 * mm])
    band.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), LGRN), ('PADDING', (0, 0), (-1, -1), 7), ('LINEBELOW', (0, 0), (-1, -1), 1.5, MID)]))
    story += [band, Spacer(1, 8 * mm)]
    if p.description:
        story += [Paragraph('<b>PRODUCT DESCRIPTION</b>', h2), Spacer(1, 3 * mm),
                   Paragraph(p.description, ParagraphStyle('bd2', fontName='Helvetica', fontSize=10, textColor=colors.HexColor('#111'), leading=15)),
                   Spacer(1, 7 * mm)]
    specs = [('Active Ingredient', p.active_ingredient or '\u2014'), ('Formulation', p.formulation or '\u2014'),
              ('Target Crops', p.crops or '\u2014'), ('Application Rate', p.dosage or '\u2014'),
              ('Pack Sizes', p.packing or '\u2014'), ('Category', p.get_category_display())]
    rows = [[Paragraph(k, lb), Paragraph(v, bd)] for k, v in specs]
    t = Table(rows, colWidths=[55 * mm, 119 * mm])
    t.setStyle(TableStyle([('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHT, LGRY]), ('TOPPADDING', (0, 0), (-1, -1), 9),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 9), ('LEFTPADDING', (0, 0), (-1, -1), 10),
                            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e0e0e0')), ('LINEBELOW', (0, -1), (-1, -1), 1.5, MID)]))
    story += [Paragraph('<b>TECHNICAL SPECIFICATIONS</b>', h2), Spacer(1, 3 * mm), t, Spacer(1, 8 * mm)]
    safety = [['01', 'Read the complete product label before use.'],
              ['02', 'Wear PPE: gloves, goggles, face mask and protective clothing.'],
              ['03', 'Mix in clean water using a calibrated sprayer. Never exceed recommended rate.'],
              ['04', 'Observe pre-harvest interval (PHI) stated on the label.'],
              ['05', 'Store sealed in original container in cool, dry place away from children.'],
              ['06', 'Triple-rinse and puncture empty containers. Never burn or reuse.']]
    st = Table(safety, colWidths=[12 * mm, 162 * mm])
    st.setStyle(TableStyle([('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('TEXTCOLOR', (0, 0), (0, -1), MID),
                             ('FONTSIZE', (0, 0), (-1, -1), 9.5), ('TOPPADDING', (0, 0), (-1, -1), 7),
                             ('BOTTOMPADDING', (0, 0), (-1, -1), 7), ('LEFTPADDING', (0, 0), (-1, -1), 8),
                             ('LINEBELOW', (0, 0), (-1, -1), 0.3, colors.HexColor('#e0e0e0'))]))
    story += [Paragraph('<b>SAFE USE DIRECTIONS</b>', h2), Spacer(1, 3 * mm), st, Spacer(1, 8 * mm)]
    ft = Table([[Paragraph('Informational only. Always refer to the registered product label.', sm),
                 Paragraph(f'Generated: {datetime.now().strftime("%d %b %Y")}', ParagraphStyle('fd', fontName='Helvetica', fontSize=8.5, textColor=MUTED, alignment=TA_RIGHT))]],
               colWidths=[120 * mm, 54 * mm])
    ft.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, 0), 0.5, colors.HexColor('#e0e0e0')), ('TOPPADDING', (0, 0), (-1, 0), 8)]))
    story.append(ft)
    doc.build(story)
    buf.seek(0)
    return FileResponse(buf, as_attachment=True, filename=f'MACL_{p.name.replace(" ", "_")}_DataSheet.pdf', content_type='application/pdf')
