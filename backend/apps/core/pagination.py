from rest_framework.pagination import PageNumberPagination


class FlexiblePagination(PageNumberPagination):
    """
    The React admin screens ask for `?page_size=200/500`. DRF ignores that parameter unless it is enabled, so
    every list (reviews, testimonials, products, outlets …) silently stopped at 20 rows and the status counters
    were wrong. This honours it (capped at 500).
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 500
