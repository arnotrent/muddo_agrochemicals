import io
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdmin, IsAgent
from apps.agents.models import Agent
from apps.agents.serializers import AgentSerializer, AgentCreateSerializer, AgentSelfSerializer


class AdminAgentListCreateView(generics.ListCreateAPIView):
    queryset = Agent.objects.select_related('user').order_by('-created_at')
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        return AgentCreateSerializer if self.request.method == 'POST' else AgentSerializer

    def create(self, request, *args, **kwargs):
        serializer = AgentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agent = serializer.save()
        return Response(AgentSerializer(agent).data, status=status.HTTP_201_CREATED)


class AdminAgentDeleteView(generics.DestroyAPIView):
    queryset = Agent.objects.all()
    permission_classes = [IsAdmin]

    def perform_destroy(self, instance):
        instance.user.delete()  # cascades to the Agent row


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_toggle_agent_view(request, pk):
    agent = get_object_or_404(Agent, pk=pk)
    agent.status = 'inactive' if agent.status == 'active' else 'active'
    agent.save(update_fields=['status'])
    return Response(AgentSerializer(agent).data)


class MyAgentProfileView(APIView):
    permission_classes = [IsAgent]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        agent = get_object_or_404(Agent, user=request.user)
        return Response(AgentSelfSerializer(agent).data)

    def patch(self, request):
        agent = get_object_or_404(Agent, user=request.user)
        serializer = AgentSelfSerializer(agent, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agents_status_view(request):
    """Live presence map for chat dots + active-agent counter."""
    return Response({'online': {str(a.id): a.is_online for a in Agent.objects.all()}})


@api_view(['GET'])
@permission_classes([IsAdmin])
def agent_report_pdf_view(request, pk):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.enums import TA_RIGHT
    from django.http import FileResponse
    from apps.requests_app.models import SupplyRequest

    agent = get_object_or_404(Agent, pk=pk)
    reqs = SupplyRequest.objects.filter(agent=agent).order_by('-created_at')
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
    DARK = colors.HexColor('#1e293b'); MID = colors.HexColor('#38bdf8'); WHT = colors.white
    LGRY = colors.HexColor('#f5f5f5'); LGRN = colors.HexColor('#eef2f6'); GOLD = colors.HexColor('#0ea5e9'); MUTED = colors.HexColor('#565656')
    h1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=20, textColor=WHT)
    h2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=12, textColor=DARK)
    bd = ParagraphStyle('bd', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#111'))
    sm = ParagraphStyle('sm', fontName='Helvetica', fontSize=8.5, textColor=MUTED)
    lb = ParagraphStyle('lb', fontName='Helvetica-Bold', fontSize=9.5, textColor=MUTED)
    story = []
    hdr = Table([[Paragraph('<b>AGENT REPORT</b>', h1),
                  Paragraph(f'<b>{agent.name}</b><br/><font size="10">{agent.region or "\u2014"} Region</font>',
                            ParagraphStyle('r', fontName='Helvetica-Bold', fontSize=14, textColor=GOLD, alignment=TA_RIGHT))]],
                 colWidths=[100 * mm, 74 * mm])
    hdr.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), DARK), ('PADDING', (0, 0), (-1, -1), 14), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(hdr)
    from datetime import datetime
    band = Table([[Paragraph(f'MUDDO AGRO CHEMICALS LTD \u00b7 Report: {datetime.now().strftime("%d %B %Y")}', sm)]], colWidths=[174 * mm])
    band.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), LGRN), ('PADDING', (0, 0), (-1, -1), 7), ('LINEBELOW', (0, 0), (-1, -1), 1.5, MID)]))
    story += [band, Spacer(1, 8 * mm)]
    prof = [('Full Name', agent.name), ('Username', agent.username), ('Email', agent.email or '\u2014'),
            ('Phone', agent.phone or '\u2014'), ('Region', agent.region or '\u2014'), ('District', agent.district or '\u2014'),
            ('Status', agent.status.title()), ('Joined', agent.created_at.strftime('%Y-%m-%d') if agent.created_at else '\u2014'),
            ('Last Active', agent.last_seen.strftime('%Y-%m-%d %H:%M') if agent.last_seen else 'Never')]
    pr = [[Paragraph(k, lb), Paragraph(v, bd)] for k, v in prof]
    pt = Table(pr, colWidths=[55 * mm, 119 * mm])
    pt.setStyle(TableStyle([('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHT, LGRY]), ('TOPPADDING', (0, 0), (-1, -1), 8),
                             ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('LEFTPADDING', (0, 0), (-1, -1), 10),
                             ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e0e0e0')), ('LINEBELOW', (0, -1), (-1, -1), 1.5, MID)]))
    story += [Paragraph('<b>AGENT PROFILE</b>', h2), Spacer(1, 3 * mm), pt, Spacer(1, 8 * mm)]
    if reqs.exists():
        sr = [[Paragraph(h, ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=9, textColor=WHT)) for h in ['#', 'Product', 'Qty', 'Status', 'Date']]]
        for i, r in enumerate(reqs):
            sr.append([str(i + 1), r.product_name, r.quantity, r.status.title(), r.created_at.strftime('%Y-%m-%d')])
        srt = Table(sr, colWidths=[10 * mm, 75 * mm, 35 * mm, 30 * mm, 24 * mm])
        srt.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), DARK), ('TEXTCOLOR', (0, 0), (-1, 0), WHT),
                                  ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 9),
                                  ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHT, LGRY]), ('TOPPADDING', (0, 0), (-1, -1), 7),
                                  ('BOTTOMPADDING', (0, 0), (-1, -1), 7), ('LEFTPADDING', (0, 0), (-1, -1), 8),
                                  ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e0e0e0'))]))
        story += [Paragraph('<b>SUPPLY REQUEST HISTORY</b>', h2), Spacer(1, 3 * mm), srt]
    doc.build(story)
    buf.seek(0)
    return FileResponse(buf, as_attachment=True, filename=f'MACL_Agent_{agent.name.replace(" ", "_")}.pdf', content_type='application/pdf')
