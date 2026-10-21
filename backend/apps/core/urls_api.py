from django.urls import path
from apps.core import api_views as v
from apps.core import enquiry_views as e
from apps.core.notifications import notifications_summary_view

urlpatterns = [
    path('contact/', v.ContactCreateView.as_view(), name='api_contact_create'),
    path('contact/track/', v.track_enquiry_view, name='api_contact_track'),
    path('newsletter/subscribe/', v.subscribe_view, name='api_newsletter_subscribe'),
    path('faq/', v.FAQListView.as_view(), name='api_faq_list'),
    path('site-settings/', v.SiteSettingsView.as_view(), name='api_site_settings'),
    path('search/', v.global_search_view, name='api_global_search'),
    path('me/staff-profile/', v.MyStaffProfileView.as_view(), name='api_my_staff_profile'),
    path('notifications/summary/', notifications_summary_view, name='api_notifications_summary'),

    # admin-only
    path('admin/contact-requests/', e.AdminEnquiryList.as_view(), name='api_admin_contact_list'),
    path('admin/contact-requests/<int:pk>/', e.AdminEnquiryDetail.as_view(), name='api_admin_contact_update'),
    path('admin/contact-requests/<int:pk>/reply/', e.admin_enquiry_reply, name='api_admin_enquiry_reply'),
    path('admin/contact-requests/<int:pk>/assign/', e.admin_enquiry_assign, name='api_admin_enquiry_assign'),
    path('admin/newsletter/', v.AdminNewsletterListView.as_view(), name='api_admin_newsletter_list'),
    path('admin/faq/', v.AdminFAQCreateView.as_view(), name='api_admin_faq_create'),
    path('admin/faq/<int:pk>/', v.AdminFAQDetailView.as_view(), name='api_admin_faq_detail'),

    # agent
    path('agent/enquiries/', e.AgentEnquiryList.as_view(), name='api_agent_enquiries'),
    path('agent/enquiries/<int:pk>/reply/', e.agent_enquiry_reply, name='api_agent_enquiry_reply'),
]
