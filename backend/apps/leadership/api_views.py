from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.core.permissions import IsAdminOrReadOnly
from apps.leadership.models import Leader
from apps.leadership.serializers import LeaderSerializer


class LeaderViewSet(viewsets.ModelViewSet):
    """GET public (active only; staff see all). POST/PATCH/DELETE staff only."""
    serializer_class = LeaderSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None

    def get_queryset(self):
        u = self.request.user
        qs = Leader.objects.all()
        return qs if (u.is_authenticated and u.is_staff) else qs.filter(active=True)
