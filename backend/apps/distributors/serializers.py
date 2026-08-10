from rest_framework import serializers
from apps.distributors.models import Distributor

# Rough bounding boxes — catches gross data-entry mistakes (a pin in the
# ocean, wrong continent, etc). Ported unchanged from the original
# apps/analytics/views.py COUNTRY_BOUNDS.
COUNTRY_BOUNDS = {
    'Uganda':      (-1.50, 4.30, 29.50, 35.10),
    'Kenya':       (-4.90, 5.20, 33.90, 41.90),
    'Tanzania':    (-11.80, -0.90, 29.30, 40.50),
    'Rwanda':      (-2.95, -1.00, 28.80, 30.95),
    'Burundi':     (-4.50, -2.30, 28.90, 30.90),
    'South Sudan': (3.40, 12.30, 24.10, 35.95),
    'DR Congo':    (-13.50, 5.40, 12.15, 31.30),
}


def within_country(country, lat, lng):
    b = COUNTRY_BOUNDS.get(country)
    if not b:
        return True
    min_lat, max_lat, min_lng, max_lng = b
    return min_lat <= lat <= max_lat and min_lng <= lng <= max_lng


class DistributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Distributor
        fields = ['id', 'name', 'country', 'region', 'district', 'address', 'phone', 'email', 'lat', 'lng', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        country = attrs.get('country', getattr(self.instance, 'country', 'Uganda'))
        lat = attrs.get('lat', getattr(self.instance, 'lat', 0.0))
        lng = attrs.get('lng', getattr(self.instance, 'lng', 0.0))

        if (lat, lng) == (0.0, 0.0):
            raise serializers.ValidationError(
                {'lat': 'Please pick the outlet\u2019s exact spot on the map before saving.'})
        if not within_country(country, lat, lng):
            raise serializers.ValidationError(
                {'lat': f'That map pin doesn\u2019t fall inside {country} \u2014 it looks like it\u2019s over '
                        f'water, or in another country. Please reposition it and try again.'})
        return attrs
