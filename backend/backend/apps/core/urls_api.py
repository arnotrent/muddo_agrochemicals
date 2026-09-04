from django.urls import path
from apps.core import api_views as v

urlpatterns = [
    path('contact/', v.ContactCreateView.as_view(), name='api_contact_create'),
    path('contact/track/', v.track_enquiry_view, name='api_contact_track'),
    path('newsletter/subscribe/', v.subscribe_view, name='api_newsletter_subscribe'),
    path('faq/', v.FAQListView.as_view(), name='api_faq_list'),
    path('site-settings/', v.SiteSettingsView.as_view(), name='api_site_settings'),
    path('search/', v.global_search_view, name='api_global_search'),
    path('me/staff-profile/', v.MyStaffProfileView.as_view(), name='api_my_staff_profile'),

    # admin-only
    path('admin/contact-requests/', v.AdminContactListView.as_view(), name='api_admin_contact_list'),
    path('admin/contact-requests/<int:pk>/', v.AdminContactUpdateView.as_view(), name='api_admin_contact_update'),
    path('admin/newsletter/', v.AdminNewsletterListView.as_view(), name='api_admin_newsletter_list'),
    path('admin/faq/', v.AdminFAQCreateView.as_view(), name='api_admin_faq_create'),
    path('admin/faq/<int:pk>/', v.AdminFAQDetailView.as_view(), name='api_admin_faq_detail'),
]
