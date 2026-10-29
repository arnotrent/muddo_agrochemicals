from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.core.permissions import IsAdminOrReadOnly
from apps.leadership.models import Leader
from apps.leadership.serializers import LeaderSerializer


class LeaderViewSet(viewsets.ModelViewSet):
    """
    GET (list) is PUBLIC and returns ACTIVE leaders only — even when a signed-in admin's token is sent, so a hidden
    leader can never leak onto the public website. The admin panel asks for everything with ?all=1.
    Detail / write actions (edit, hide, delete) are staff-only and can reach hidden leaders.
    """
    serializer_class = LeaderSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None

    def get_queryset(self):
        u = self.request.user
        qs = Leader.objects.all()
        if not (u.is_authenticated and u.is_staff):
            return qs.filter(active=True)
        if self.action == 'list' and self.request.query_params.get('all') != '1':
            return qs.filter(active=True)
        return qs
