from rest_framework import serializers
from apps.distributors.models import Distributor

# Rough bounding boxes - catches gross data-entry mistakes (a pin in the ocean, wrong continent, etc).
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
        fields = ['id', 'name', 'country', 'region', 'district', 'town', 'address', 'location_details',
                  'phone', 'email', 'lat', 'lng', 'place_id', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, v):
        return ' '.join(v.split())

    def validate_phone(self, v):
        v = v.strip()
        if v and any(ch not in '+0123456789 -()/.,' for ch in v):
            raise serializers.ValidationError('Phone may only contain digits, spaces and + - ( ) / .')
        return v

    def validate(self, attrs):
        inst = self.instance
        g = lambda k, d='': attrs.get(k, getattr(inst, k, d))
        country, lat, lng = g('country', 'Uganda'), g('lat', 0.0), g('lng', 0.0)

        if (lat, lng) == (0.0, 0.0):
            raise serializers.ValidationError(
                {'lat': 'Please pick the outlet\u2019s exact spot on the map before saving.'})
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise serializers.ValidationError({'lat': 'Those coordinates are not valid.'})
        if not within_country(country, lat, lng):
            raise serializers.ValidationError(
                {'lat': f'That map pin doesn\u2019t fall inside {country} \u2014 it looks like it\u2019s over '
                        f'water, or in another country. Please reposition it and try again.'})

        dup = Distributor.objects.filter(name__iexact=g('name'), district__iexact=g('district'), country=country)
        if inst:
            dup = dup.exclude(pk=inst.pk)
        if dup.exists():
            raise serializers.ValidationError(
                {'name': f'An outlet called "{g("name")}" already exists in {g("district")} - edit that one instead.'})
        return attrs
