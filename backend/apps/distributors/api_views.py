from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.permissions import IsAdminOrReadOnly
from apps.distributors.models import Distributor
from apps.distributors.serializers import DistributorSerializer


class DistributorViewSet(viewsets.ModelViewSet):
    """
    /api/v1/distributors/            GET (public), POST (admin)
    /api/v1/distributors/{id}/       GET (public), PATCH/DELETE (admin)
    ?region=Central&country=Uganda&search=kampala
    """
    queryset = Distributor.objects.order_by('country', 'region', 'district', 'name')
    serializer_class = DistributorSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['region', 'country']
    search_fields = ['name', 'district', 'region']
