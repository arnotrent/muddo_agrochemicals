from rest_framework import serializers
from apps.products.models import Product
from apps.core.validators import validate_image_upload


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight — used for catalogue grids, search results, related products."""
    display_image = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    stock_qty = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'category_display', 'description',
            'active_ingredient', 'crops', 'packing', 'display_image',
            'stock_qty', 'stock_status',
        ]

    def get_display_image(self, obj):
        request = self.context.get('request')
        url = obj.display_image
        if request and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url


class ProductDetailSerializer(ProductListSerializer):
    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ['formulation', 'dosage', 'created_at']


class ProductAdminSerializer(serializers.ModelSerializer):
    """Full read/write serializer used by the admin catalogue CRUD screens."""
    display_image = serializers.SerializerMethodField(read_only=True)
    stock_qty = serializers.IntegerField(write_only=True, required=False, default=0)
    reorder_level = serializers.IntegerField(write_only=True, required=False, default=10)
    unit = serializers.CharField(write_only=True, required=False, default='units')

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'description', 'active_ingredient', 'formulation',
            'crops', 'dosage', 'packing', 'image_url', 'image_file', 'display_image',
            'created_at', 'stock_qty', 'reorder_level', 'unit',
        ]
        read_only_fields = ['id', 'created_at']

    def get_display_image(self, obj):
        request = self.context.get('request')
        url = obj.display_image
        if request and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url

    def validate_name(self, value):
        value = value.strip()
        qs = Product.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f'"{value}" already exists in the catalogue \u2014 edit that product instead of adding a duplicate.')
        return value

    def validate_image_file(self, value):
        if value:
            validate_image_upload(value)
        return value

    def create(self, validated_data):
        from apps.inventory.models import Inventory
        stock_qty = validated_data.pop('stock_qty', 0)
        reorder_level = validated_data.pop('reorder_level', 10)
        unit = validated_data.pop('unit', 'units')
        product = Product.objects.create(**validated_data)
        Inventory.objects.create(product=product, stock_qty=stock_qty, reorder_level=reorder_level, unit=unit)
        return product

    def update(self, instance, validated_data):
        from apps.inventory.models import Inventory
        stock_qty = validated_data.pop('stock_qty', None)
        reorder_level = validated_data.pop('reorder_level', None)
        unit = validated_data.pop('unit', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if stock_qty is not None or reorder_level is not None or unit is not None:
            inv, _ = Inventory.objects.get_or_create(product=instance, defaults={'stock_qty': 0})
            if stock_qty is not None:
                inv.stock_qty = stock_qty
            if reorder_level is not None:
                inv.reorder_level = reorder_level
            if unit is not None:
                inv.unit = unit
            inv.save()
        return instance
