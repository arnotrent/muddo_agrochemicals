from django.urls import path
from apps.testimonials import views as v

urlpatterns = [
    path('testimonials/', v.PublicTestimonialList.as_view(), name='api_testimonials'),
    path('testimonials/submit/', v.submit_testimonial_view, name='api_testimonial_submit'),
    path('admin/testimonials/', v.AdminTestimonialList.as_view(), name='api_admin_testimonials'),
    path('admin/testimonials/<int:pk>/', v.AdminTestimonialDetail.as_view(), name='api_admin_testimonial_detail'),
]
