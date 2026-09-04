from rest_framework import serializers
from apps.core.models import ContactRequest, NewsletterSubscriber, SiteSettings, FAQ, StaffProfile


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            'year_founded', 'company_phone', 'company_phone_secondary', 'company_email',
            'company_address', 'business_hours', 'whatsapp_number', 'facebook_url',
        ]


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'order', 'active']


class ContactRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = ['id', 'ref_number', 'name', 'email', 'phone', 'subject', 'message', 'status', 'created_at']
        read_only_fields = ['id', 'ref_number', 'status', 'created_at']

    def validate_email(self, value):
        return value.strip().lower()


class ContactRequestAdminSerializer(serializers.ModelSerializer):
    """Adds status/admin-only fields for the admin panel's update action."""
    class Meta:
        model = ContactRequest
        fields = ['id', 'ref_number', 'name', 'email', 'phone', 'subject', 'message', 'status', 'created_at']
        read_only_fields = ['id', 'ref_number', 'name', 'email', 'phone', 'subject', 'message', 'created_at']


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ['id', 'email', 'name', 'active', 'subscribed_at']
        read_only_fields = ['id', 'active', 'subscribed_at']

    def validate_email(self, value):
        return value.strip().lower()


class StaffProfileSerializer(serializers.ModelSerializer):
    original_name = serializers.ReadOnlyField()
    avatar_url = serializers.ReadOnlyField()
    name = serializers.ReadOnlyField()

    class Meta:
        model = StaffProfile
        fields = ['display_name', 'avatar', 'avatar_url', 'name', 'original_name']
        extra_kwargs = {'avatar': {'write_only': True}}
